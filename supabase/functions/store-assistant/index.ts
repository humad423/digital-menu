import { createClient } from 'npm:@supabase/supabase-js@2'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import {
  HISTORY_SAVED, MAX_ROUNDS, PHOTO_MINUTES, SYSTEM_INSTRUCTION,
  allowedStoreIds, applyToContext, buildInput, checkAction, claimsSave, describeForMemory, normalizeName, pickStore, readActions, readMessage, replyDelay, safeReply, usesPhoto, withFacts, withPhoto,
  type Context, type HistoryEntry, type Parsed, type Step, type Store, type StoreRecord,
} from './logic.ts'

// Stays under Google's free limit of 500 requests a day, so the bot answers instead of failing
const DAILY_AI_LIMIT = 400
const MODEL = 'gemini-3.5-flash-lite'
const MAX_MEDIA_BYTES = 8 * 1024 * 1024
const UNDO_DAYS = 7
const RETRY_WAITS = [5000, 15000, 25000]

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
  // Google's busy spells pass quickly, and a slow answer is fine, so it waits and asks again
  for (let attempt = 0; attempt <= RETRY_WAITS.length; attempt++) {
    const started = Date.now()
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY'), 'Api-Revision': '2026-05-20' },
      body: JSON.stringify({
        model: MODEL,
        system_instruction: SYSTEM_INSTRUCTION,
        input,
        store: false,
        generation_config: { thinking_level: 'low', temperature: 0.7, max_output_tokens: 8000 },
        response_format: { type: 'text', mime_type: 'application/json' },
      }),
    }).catch(error => { console.error('Gemini unreachable', error); return null })
    console.log(`Gemini ${response?.status ?? 'unreachable'} in ${Date.now() - started} ms`)
    if (!response || response.status === 429 || response.status >= 500) {
      if (attempt < RETRY_WAITS.length) { await new Promise(resolve => setTimeout(resolve, RETRY_WAITS[attempt])); continue }
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

/** Saves one change and logs it so it can be undone. Returns the reason if it didn't go through. */
async function runStep(step: Step, ctx: Context, phone: string, batch: string, getPhoto: () => Promise<string | null>): Promise<string | null> {
  const log = (action: string, table: string, id: string, before: unknown, after: Record<string, unknown>) =>
    db.from('assistant_changes').insert({ store_id: ctx.store.id, phone, action, target_table: table, target_id: id, before, after: { ...after, batch } })

  if (step.op === 'undo') return undoLast(ctx.store.id, phone)

  if (usesPhoto(step)) {
    const photo = await getPhoto()
    if (!photo) return `${step.label}: the photo could not be uploaded, so nothing was saved for it. Ask the owner to send it again.`
    step.fields = withPhoto(step.fields, photo)
  }

  if (step.op === 'update') {
    const { error } = await db.from(step.table).update(step.fields).eq('id', step.id)
    if (error) { console.error(error); return `${step.label}: the database refused this: ${error.message}` }
    await log('update', step.table, step.id, step.before, { name: step.label, ...step.fields })
    if (step.table === 'menu_items' && step.said && normalizeName(step.said) !== normalizeName(step.label) && normalizeName(step.said).length >= 2) {
      await db.from('assistant_aliases').upsert({ store_id: ctx.store.id, said: normalizeName(step.said), menu_item_id: step.id })
    }
    applyToContext(ctx, step)
    return null
  }

  // Products belong to a shop through their category, everything else directly
  const fields = step.table === 'menu_items' ? step.fields : { ...step.fields, restaurant_id: ctx.store.id }
  const { data, error } = await db.from(step.table).insert(fields).select('*').single()
  if (error) { console.error(error); return `${step.label}: the database refused this: ${error.message}` }
  await log('add', step.table, data.id, null, { name: step.label })
  applyToContext(ctx, step, data)
  return null
}

/** Takes back everything saved in the owner's last request. Returns a note for the model if it couldn't. */
async function undoLast(storeId: string, phone: string): Promise<string | null> {
  const since = new Date(Date.now() - UNDO_DAYS * 86_400_000).toISOString()
  const { data: recent } = await db.from('assistant_changes').select('*')
    .eq('store_id', storeId).eq('phone', phone).is('undone_at', null).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(250)
  if (!recent?.length) return 'Undo: there is no recent change to take back.'

  const batch = recent[0].after?.batch
  const changes = batch ? recent.filter(change => change.after?.batch === batch) : [recent[0]]
  for (const change of changes) {
    // Only something the assistant itself added in that request is ever removed here
    const { error } = change.before
      ? await db.from(change.target_table).update(change.before).eq('id', change.target_id)
      : await db.from(change.target_table).delete().eq('id', change.target_id)
    if (error) {
      console.error(error)
      return `Undo: the database refused it for ${change.after?.name}: ${error.message}. That change is still there.`
    }
    await db.from('assistant_changes').update({ undone_at: new Date().toISOString() }).eq('id', change.id)
  }
  return null
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
  const answer = (reply: string) => ({ reply, chatId: to, session: message.session, wait_seconds: replyDelay(reply) })

  const { data: found } = await db.from('restaurants').select('*').in('id', storeIds)
  if (!found?.length) return { reply: null, ignored: 'store not found' }

  // Same rule as the store panel: a suspended subscription can't edit
  const stores = found.filter(store => store.is_subscription_active !== false)
  if (stores.length === 0) return answer('اشتراك متجرك متوقف. تواصل مع الإدارة لتجديده.')

  const { data: chat } = await db.from('assistant_chats').select('*').eq('phone', phone).maybeSingle()
  const expired = chat?.pending_at && Date.now() - new Date(chat.pending_at).getTime() > PHOTO_MINUTES * 60_000
  const saved = expired ? null : chat?.pending ?? null
  const held: string | null = saved?.type === 'choose_store' ? saved.text : null

  // A voice note or photo comes with no text, so there's nothing yet to pick a store by
  const pick = pickStore(stores, chat?.store_id ?? null, held, message.text || (message.hasMedia ? '(media)' : ''))
  const keptPhoto: string | null = saved?.type === 'photo' && !(pick.switched && stores.length > 1) ? saved.url : null
  if (!pick.storeId || pick.reply) {
    const entries: HistoryEntry[] = [{ from: 'owner', text: message.text || '(media)' }, { from: 'bot', text: pick.reply! }]
    await saveChat(phone, chat, entries, pick.storeId, pick.held ? { type: 'choose_store', text: pick.held } : null)
    return answer(pick.reply!)
  }
  const store = stores.find(candidate => candidate.id === pick.storeId)! as Store

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
  }

  const countCall = async () => (await db.rpc('assistant_count_call', { daily_limit: DAILY_AI_LIMIT })).data !== false
  if (!await countCall()) return answer('عندي ضغط اليوم. جرّب بكرا إن شاء الله.')

  const [{ data: rawCategories }, { data: rawItems }, { data: aliases }, { data: rawOffers }] = await Promise.all([
    db.from('categories').select('*').eq('restaurant_id', store.id).order('sort_order'),
    db.from('menu_items').select('*, categories!inner(restaurant_id)').eq('categories.restaurant_id', store.id).limit(500),
    db.from('assistant_aliases').select('said, menu_item_id').eq('store_id', store.id),
    db.from('offers').select('*').eq('restaurant_id', store.id).order('sort_order'),
  ])

  const coded = (table: StoreRecord['table'], prefix: string, rows: any[] | null): StoreRecord[] =>
    (rows || []).map((row, index) => {
      const { categories: _store, ...fields } = row
      return { code: `${prefix}${index + 1}`, table, id: row.id, row: fields }
    })

  const sentImage = !!media?.mimeType.startsWith('image/')
  const ctx: Context = {
    store,
    records: [
      { code: 'S', table: 'restaurants', id: store.id, row: store },
      ...coded('categories', 'C', rawCategories),
      ...coded('menu_items', 'P', rawItems),
      ...coded('offers', 'O', rawOffers),
    ],
    photo: sentImage ? 'new' : keptPhoto ? 'kept' : null,
  }

  // Only the conversation and shop details go to Google: no owner's number or sender name
  const history: HistoryEntry[] = chat?.history || []
  const localTime = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Istanbul', weekday: 'long', hour: '2-digit', minute: '2-digit' })
  const base = buildInput(ctx, aliases || [], history, pick.text === '(media)' ? '' : pick.text, localTime)
  const request = (note: string) => {
    const text = note ? `${base}\n\n${note}` : base
    return media
      ? [{ type: 'text', text }, { type: sentImage ? 'image' : 'audio', data: media.base64, mime_type: media.mimeType.split(';')[0] }]
      : text
  }

  // The photo is only uploaded once it's really going to be used, and only once
  let uploaded: string | null = null
  const getPhoto = async () => {
    if (!sentImage) return keptPhoto
    uploaded ??= await uploadImage(media!.base64, media!.mimeType.split(';')[0])
    return uploaded
  }

  const done: Step[] = []
  let photoUsed = false
  let heard = ''
  let reply = ''
  let note = ''
  let answered = false
  let busy = false

  // The agent acts, hears what really happened, and can put it right before answering
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (round > 0 && !await countCall()) break
    const result = await askGemini(request(note))
    if (!result.parsed) { busy = !!result.busy; break }
    if (!heard) heard = String(result.parsed.heard ?? '')

    const actions = readActions(result.parsed.actions)
    const problems: string[] = []
    for (const action of actions) {
      const { step, problem } = checkAction(ctx, action)
      if (!step) { problems.push(problem!); continue }
      const photoStep = usesPhoto(step)
      const failed = await runStep(step, ctx, phone, message.id, getPhoto)
      if (failed) { problems.push(failed); continue }
      done.push(step)
      if (photoStep) photoUsed = true
    }

    reply = safeReply(result.parsed.reply)
    const emptyClaim = actions.length === 0 && done.length === 0 && claimsSave(reply)
    if (problems.length === 0 && reply && !emptyClaim) { answered = true; break }

    note = `System note: your draft reply was not sent. Saved so far: ${describeForMemory(done) || 'nothing'}. ${
      emptyClaim ? 'Your draft said something changed, but you sent no actions, so nothing did.' : ''
    }${problems.length ? ` These did not go through:\n${problems.join('\n')}` : ''}${!reply && !problems.length ? ' Your reply was empty or held a link.' : ''}
Fix what you can with new actions, without repeating what was saved, or tell the owner honestly. Then write your reply.`
  }

  const owner: HistoryEntry = { from: 'owner', text: (heard || pick.text || '(media)').slice(0, 500) }

  let finalReply: string
  if (answered) {
    finalReply = withFacts(reply, done)
  } else if (done.length > 0) {
    finalReply = `${withFacts('', done)}\nوالباقي ما زبط معي، فيك تبعتلي ياه كمان مرة؟`
  } else {
    finalReply = busy ? 'عندي ضغط هلق، جرّب بعد شوي.' : 'معليش، ما زبط معي. فيك تبعتها كمان مرة؟'
  }

  // A photo with no decision yet is kept for a while, so "this is for the bread" still works
  const photoLeft = photoUsed ? null : sentImage ? (done.length === 0 ? await getPhoto() : null) : keptPhoto

  const bot: HistoryEntry = { from: 'bot', text: finalReply }
  const did = describeForMemory(done)
  if (did) bot.did = did
  await saveChat(phone, chat, [owner, bot], store.id, photoLeft ? { type: 'photo', url: photoLeft } : null)
  if (done.length > 0) await publishChanges(store.slug, store.id)

  return answer(finalReply)
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
