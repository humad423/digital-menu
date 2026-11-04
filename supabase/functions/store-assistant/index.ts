import { createClient } from 'npm:@supabase/supabase-js@2'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import {
  FALLBACK, HISTORY_SAVED, OUTPUT_SCHEMA, PENDING_MINUTES, SYSTEM_INSTRUCTION, UNITS, UPLOADED_IMAGE,
  allowedStoreIds, buildInput, decide, describeDone, normalizeName, pickStore, readMessage,
  type Action, type Context, type Decision, type HistoryEntry, type Parsed, type Pending, type Product,
} from './logic.ts'

// Stays under Google's free limit of 500 requests a day, so the bot answers instead of failing
const DAILY_AI_LIMIT = 400
const MODEL = 'gemini-3.5-flash-lite'
const MAX_MEDIA_BYTES = 8 * 1024 * 1024
const UNDO_DAYS = 7

const env = (name: string, fallback = '') => Deno.env.get(name) || fallback
const WAHA_URL = env('WAHA_URL').replace(/\/+$/, '')
const SITE_URL = env('SITE_URL', 'https://alfsouq.com').replace(/\/+$/, '')

const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function sameSecret(given: string | null, expected: string): boolean {
  if (!given || !expected || given.length !== expected.length) return false
  let difference = 0
  for (let i = 0; i < given.length; i++) difference |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return difference === 0
}

const wahaHeaders = () => ({ 'X-Api-Key': env('WAHA_API_KEY') })

async function resolveLid(session: string, lid: string): Promise<string | null> {
  try {
    const response = await fetch(`${WAHA_URL}/api/${session}/lids/${encodeURIComponent(lid)}`, { headers: wahaHeaders() })
    if (!response.ok) return null
    const { pn } = await response.json()
    return pn ? String(pn).split('@')[0].replace(/\D/g, '') : null
  } catch {
    return null
  }
}

/** WAHA's link may name an internal address, so only its path is used, on our own WAHA server. */
async function downloadMedia(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(`${WAHA_URL}${new URL(url).pathname}`, { headers: wahaHeaders() })
    if (!response.ok) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    return bytes.length <= MAX_MEDIA_BYTES ? bytes : null
  } catch {
    return null
  }
}

async function uploadImage(base64: string, mimeType: string): Promise<string | null> {
  const form = new FormData()
  form.append('file', `data:${mimeType};base64,${base64}`)
  form.append('upload_preset', env('CLOUDINARY_UPLOAD_PRESET', 'ml_default'))
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env('CLOUDINARY_CLOUD_NAME', 'o2iy0uxo')}/image/upload`, { method: 'POST', body: form })
  if (!response.ok) return null
  return (await response.json()).secure_url || null
}

async function askGemini(input: unknown): Promise<{ parsed?: Parsed; busy?: boolean }> {
  const body = JSON.stringify({
    model: MODEL,
    system_instruction: SYSTEM_INSTRUCTION,
    input,
    store: false,
    generation_config: { thinking_level: 'minimal', max_output_tokens: 3000 },
    response_format: { type: 'text', mime_type: 'application/json', schema: OUTPUT_SCHEMA },
  })

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY'), 'Api-Revision': '2026-05-20' },
      body,
    })
    if (response.status === 429) {
      if (attempt === 0) { await new Promise(resolve => setTimeout(resolve, 4000)); continue }
      return { busy: true }
    }
    if (!response.ok) {
      console.error('Gemini error', response.status, (await response.text()).slice(0, 500))
      return {}
    }
    const data = await response.json()
    const steps = Array.isArray(data.steps) ? data.steps : []
    const output = steps.filter((step: any) => step.type === 'model_output').at(-1)
    const text = typeof data.output_text === 'string'
      ? data.output_text
      : (output?.content || []).filter((part: any) => part.type === 'text').map((part: any) => part.text).join('')
    try {
      return { parsed: JSON.parse(text) }
    } catch {
      console.error('Gemini returned unreadable output', text.slice(0, 300))
      return {}
    }
  }
  return {}
}

/** Runs the decided changes. Each one is checked against this store and logged so it can be undone. */
async function runActions(actions: Action[], ctx: Context, phone: string) {
  const done: Action[] = []
  const notes: string[] = []
  const log = (action: string, target_table: string, target_id: string, before: unknown, after: unknown) =>
    db.from('assistant_changes').insert({ store_id: ctx.store.id, phone, action, target_table, target_id, before, after })
  const owned = (id: string): Product | undefined => ctx.products.find(product => product.id === id)

  for (const action of actions) {
    if (action.type === 'update_price') {
      const product = owned(action.id)
      if (!product) continue
      const { error } = await db.from('menu_items').update({ price: action.price }).eq('id', product.id)
      if (error) { console.error(error); notes.push(`ما قدرت أعدل ${product.name}`); continue }
      await log('update_price', 'menu_items', product.id, { price: product.price }, { name: product.name, price: action.price })
      if (normalizeName(action.said) !== normalizeName(product.name) && normalizeName(action.said).length >= 2) {
        await db.from('assistant_aliases').upsert({ store_id: ctx.store.id, said: normalizeName(action.said), menu_item_id: product.id })
      }
      done.push(action)
    } else if (action.type === 'add_product') {
      if (!ctx.categories.some(category => category.id === action.category_id)) continue
      const soldByWeight = action.unit ? /كيلو|كغ|kg/i.test(action.unit) : false
      const { data, error } = await db.from('menu_items').insert({
        category_id: action.category_id,
        name: action.name,
        price: action.price,
        original_price: action.before_price,
        image_url: action.image_url,
        images: action.image_url ? [action.image_url] : [],
        unit: soldByWeight ? 'kg' : 'piece',
        allow_custom_amount: soldByWeight,
      }).select('id').single()
      if (error) { console.error(error); notes.push(`ما قدرت أضيف ${action.name}`); continue }
      await log('add_product', 'menu_items', data.id, null, { name: action.name, price: action.price })
      done.push(action)
    } else if (action.type === 'item_offer') {
      const product = owned(action.item_id)
      if (!product) continue
      const changes: Record<string, unknown> = { price: action.price, original_price: action.before_price }
      if (action.image_url && action.image_url !== product.image_url) {
        changes.image_url = action.image_url
        changes.images = [action.image_url]
      }
      const { error } = await db.from('menu_items').update(changes).eq('id', product.id)
      if (error) { console.error(error); notes.push(`ما قدرت أنزل عرض ${product.name}`); continue }
      await log('item_offer', 'menu_items', product.id, { price: product.price, original_price: product.original_price, image_url: product.image_url }, { name: product.name, ...changes })
      done.push(action)
    } else if (action.type === 'store_offer') {
      const product = owned(action.item_id)
      if (!product) continue
      const { data: last } = await db.from('offers').select('sort_order').order('sort_order', { ascending: false }).limit(1)
      const { data, error } = await db.from('offers').insert({
        restaurant_id: ctx.store.id,
        primary_item_id: product.id,
        title: product.name,
        offer_price: action.price,
        original_price: action.before_price,
        image_url: action.image_url,
        images: action.image_url ? [action.image_url] : [],
        sort_order: (last?.[0]?.sort_order || 0) + 1,
      }).select('id').single()
      if (error) { console.error(error); notes.push(`ما قدرت أنزل عرض ${product.name}`); continue }
      await log('store_offer', 'offers', data.id, null, { name: product.name, price: action.price })
      done.push(action)
    } else if (action.type === 'set_image') {
      const product = owned(action.item_id)
      if (!product) continue
      const { error } = await db.from('menu_items').update({ image_url: action.image_url, images: [action.image_url] }).eq('id', product.id)
      if (error) { console.error(error); notes.push(`ما قدرت أحط صورة ${product.name}`); continue }
      await log('set_image', 'menu_items', product.id, { image_url: product.image_url }, { name: product.name, image_url: action.image_url })
      done.push(action)
    }
  }
  return { done, notes }
}

async function undoLast(storeId: string, phone: string): Promise<string> {
  const since = new Date(Date.now() - UNDO_DAYS * 86_400_000).toISOString()
  const { data: last } = await db.from('assistant_changes').select('*')
    .eq('store_id', storeId).eq('phone', phone).is('undone_at', null).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!last) return 'ما في شي قريب أرجعه.'

  const name = last.after?.name || 'التعديل'
  const { error } = last.before
    ? await db.from(last.target_table).update(last.before).eq('id', last.target_id)
    : await db.from(last.target_table).delete().eq('id', last.target_id)
  if (error) {
    console.error(error)
    return `ما قدرت أرجع ${name}، تواصل مع الإدارة.`
  }
  await db.from('assistant_changes').update({ undone_at: new Date().toISOString() }).eq('id', last.id)
  return `تمام، رجعت ${name} متل ما كان 👍`
}

/** Saves the conversation. If another message got there first, it's added on top of that one. */
async function saveChat(phone: string, chat: any, entries: HistoryEntry[], storeId: string | null, pending: unknown) {
  const row = (history: HistoryEntry[], version: number) => ({
    phone,
    store_id: storeId,
    history: [...history, ...entries].slice(-HISTORY_SAVED),
    pending,
    pending_at: pending ? new Date().toISOString() : null,
    version: version + 1,
    updated_at: new Date().toISOString(),
  })

  if (!chat) {
    const { error } = await db.from('assistant_chats').insert(row([], 0))
    if (!error) return
  } else {
    const { data } = await db.from('assistant_chats').update(row(chat.history || [], chat.version)).eq('phone', phone).eq('version', chat.version).select('phone')
    if (data?.length) return
  }

  const { data: latest } = await db.from('assistant_chats').select('*').eq('phone', phone).maybeSingle()
  if (latest) await db.from('assistant_chats').update(row(latest.history || [], latest.version)).eq('phone', phone)
}

async function publishChanges(slug: string, storeId: string) {
  try {
    await fetch(`${SITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-assistant-secret': env('ASSISTANT_SECRET') },
      body: JSON.stringify({ slug, restaurantId: storeId, type: 'offers' }),
    })
  } catch (error) {
    console.error('Could not refresh the site', error)
  }
}

async function handleMessage(body: unknown) {
  const message = readMessage(body, Math.floor(Date.now() / 1000))
  if ('ignored' in message) return { reply: null, ignored: message.ignored }

  // The same message delivered twice only gets one answer
  const { error: seenError } = await db.from('assistant_seen').insert({ message_id: message.id })
  if (seenError) return { reply: null, ignored: 'already handled' }

  const phone = message.phone || (message.lid ? await resolveLid(message.session, message.lid) : null)
  if (!phone) return { reply: null, ignored: 'real number not found' }

  // Store owners are recognised automatically. Anyone else gets no reply at all.
  const e164 = `+${phone}`
  const [{ data: owners }, { data: ownStores }, { data: overrides }] = await Promise.all([
    db.from('profiles').select('restaurant_id').eq('phone', e164).eq('role', 'restaurant_owner'),
    db.from('restaurants').select('id').eq('whatsapp_number', e164),
    db.from('assistant_numbers').select('store_id, enabled').eq('phone', phone),
  ])
  const storeIds = allowedStoreIds(
    [...(owners || []).map(owner => owner.restaurant_id), ...(ownStores || []).map(store => store.id)],
    overrides || [],
  )
  if (storeIds.length === 0) return { reply: null, ignored: 'not a store owner' }

  const to = `${phone}@c.us`
  const answer = (reply: string) => ({ reply, chatId: to, session: message.session })

  const { data: found } = await db.from('restaurants')
    .select('id, name, slug, store_type, max_offers_limit, is_subscription_active')
    .in('id', storeIds)
  if (!found?.length) return { reply: null, ignored: 'store not found' }

  // Same rule as the store panel: a suspended subscription can't edit
  const stores = found.filter(store => store.is_subscription_active !== false)
  if (stores.length === 0) return answer('اشتراك متجرك متوقف. تواصل مع الإدارة لتجديده.')

  const { data: chat } = await db.from('assistant_chats').select('*').eq('phone', phone).maybeSingle()
  const expired = chat?.pending_at && Date.now() - new Date(chat.pending_at).getTime() > PENDING_MINUTES * 60_000
  const saved = expired ? null : chat?.pending ?? null
  const held: string | null = saved?.type === 'choose_store' ? saved.text : null
  let pending: Pending | null = saved?.type === 'choose_store' ? null : saved

  // A voice note or photo comes with no text, so there's nothing yet to pick a store by
  const pick = pickStore(stores, chat?.store_id ?? null, held, message.text || (message.hasMedia ? '(media)' : ''))
  if (pick.switched && stores.length > 1) pending = null
  if (!pick.storeId || pick.reply) {
    const entries: HistoryEntry[] = [{ from: 'owner', text: message.text || '(media)' }, { from: 'bot', text: pick.reply! }]
    await saveChat(phone, chat, entries, pick.storeId, pick.held ? { type: 'choose_store', text: pick.held } : null)
    return answer(pick.reply!)
  }
  const store = stores.find(candidate => candidate.id === pick.storeId)!

  let media: { base64: string; mimeType: string } | null = null
  if (message.hasMedia) {
    const mimeType = message.mimeType || ''
    if (!/^(image|audio)\//.test(mimeType)) {
      return answer('بفهم الكتابة والصور والرسائل الصوتية، ابعتلي بوحدة منهن.')
    }
    const bytes = message.mediaUrl ? await downloadMedia(message.mediaUrl) : null
    if (!bytes) return answer('ما قدرت أفتح الملف، جرّب تبعته مرة تانية أو اكتبلي ياه.')
    media = { base64: encodeBase64(bytes), mimeType }
  } else if (!pick.text) {
    return { reply: null, ignored: 'empty message' }
  } else if (pick.text.length > 1000) {
    return answer('رسالتك طويلة شوي. ابعتلي كل تعديل برسالة قصيرة.')
  }

  const { data: allowed } = await db.rpc('assistant_count_call', { daily_limit: DAILY_AI_LIMIT })
  if (allowed === false) return answer('عندي ضغط اليوم. جرّب بكرا إن شاء الله.')

  const [{ data: rawCategories }, { data: rawItems }, { data: aliases }, { count: offerCount }] = await Promise.all([
    db.from('categories').select('id, name').eq('restaurant_id', store.id).order('sort_order'),
    db.from('menu_items').select('id, name, price, unit, original_price, image_url, categories!inner(restaurant_id)').eq('categories.restaurant_id', store.id).limit(500),
    db.from('assistant_aliases').select('said, menu_item_id').eq('store_id', store.id),
    db.from('offers').select('id', { count: 'exact', head: true }).eq('restaurant_id', store.id),
  ])

  const ctx: Context = {
    store,
    products: (rawItems || []).map((item: any, index: number) => ({
      code: `P${index + 1}`,
      id: item.id,
      name: String(item.name).trim(),
      price: Number(item.price),
      unit: UNITS[item.unit] || item.unit,
      original_price: item.original_price,
      image_url: item.image_url,
    })),
    categories: (rawCategories || []).map((category: any, index: number) => ({ code: `C${index + 1}`, id: category.id, name: category.name })),
    pending,
    hasImage: !!media?.mimeType.startsWith('image/'),
    offerCount: offerCount || 0,
  }

  // Only the conversation and product names go to Google: no phone number or sender name
  const history: HistoryEntry[] = chat?.history || []
  const text = buildInput(ctx, aliases || [], history, pick.text === '(media)' ? '' : pick.text)
  const input = media
    ? [{ type: 'text', text }, { type: media.mimeType.startsWith('image/') ? 'image' : 'audio', data: media.base64, mime_type: media.mimeType.split(';')[0] }]
    : text

  const { parsed, busy } = await askGemini(input)
  const owner: HistoryEntry = { from: 'owner', text: String(parsed?.heard || pick.text || '(media)').slice(0, 500) }

  if (!parsed) {
    const reply = busy ? 'عندي ضغط هلق، جرّب بعد شوي.' : FALLBACK
    await saveChat(phone, chat, [owner, { from: 'bot', text: reply }], store.id, pending)
    return answer(reply)
  }

  let decision: Decision = decide(ctx, parsed)

  // The photo is only uploaded once it's really going to be used
  if (media && JSON.stringify(decision).includes(UPLOADED_IMAGE)) {
    const url = await uploadImage(media.base64, media.mimeType.split(';')[0])
    if (!url) {
      const reply = 'ما قدرت أرفع الصورة، جرّب تبعتها مرة تانية.'
      await saveChat(phone, chat, [owner, { from: 'bot', text: reply }], store.id, pending)
      return answer(reply)
    }
    decision = JSON.parse(JSON.stringify(decision).replaceAll(UPLOADED_IMAGE, url))
  }

  const parts: string[] = []
  let changed = false

  if (decision.actions.some(action => action.type === 'undo')) {
    parts.push(await undoLast(store.id, phone))
    changed = true
  } else if (decision.actions.length > 0) {
    const { done, notes } = await runActions(decision.actions, ctx, phone)
    const summary = describeDone(done)
    if (summary) parts.push(summary)
    parts.push(...notes)
    changed = done.length > 0
  }
  if (decision.reply) parts.push(decision.reply)

  const reply = parts.join('\n') || FALLBACK
  await saveChat(phone, chat, [owner, { from: 'bot', text: reply }], store.id, decision.pending)
  if (changed) await publishChanges(store.slug, store.id)

  return answer(reply)
}

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!sameSecret(request.headers.get('x-assistant-secret'), env('ASSISTANT_SECRET'))) return json({ error: 'unauthorized' }, 401)

  try {
    const result = await handleMessage(await request.json())
    return json(result)
  } catch (error) {
    console.error(error)
    return json({ reply: null, ignored: 'internal error' })
  }
})
