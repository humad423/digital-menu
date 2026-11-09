import { createClient } from 'npm:@supabase/supabase-js@2'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'
import {
  HISTORY_SAVED, MAX_ROUNDS, NO_STORE, PHOTO_MINUTES, SYSTEM_INSTRUCTION,
  allowedStoreIds, applyToContext, buildInput, checkAction, claimsSave, describeForMemory, describePieces, isOngoing, normalizeName, photosUsed,
  pickStore, pieceKind, readActions, readLooks, readMessage, readSwitchStore, replyDelay, safeReply, shopLinks, storeLocalTime, storeZone, toLocalTime,
  withFacts, withPhoto, withPhotoQuestion,
  type Context, type HistoryEntry, type Look, type Parsed, type Piece, type Step, type Store, type StorePick, type StoreRecord,
} from './logic.ts'

// Stays under Google's free limit of 500 requests a day, so the bot answers instead of failing
const DAILY_AI_LIMIT = 400
const MODEL = 'gemini-3.5-flash-lite'
const MAX_MEDIA_BYTES = 8 * 1024 * 1024
// Photos, voice notes and stickers read together in one answer
const MAX_MEDIA = 6
// Unused photos kept for the owner's next message
const MAX_KEPT_PHOTOS = 4
// Ready-made photos listed for the model
const MAX_STOCK_PHOTOS = 300
const UNDO_DAYS = 7
const RETRY_WAITS = [5000, 15000, 25000]
// How long a message waits for the next piece before it's answered
const GATHER_MS = 6000
// How long a new answer waits for an earlier one to the same owner to finish, so it sees what that one did
const BUSY_WAIT_MS = 30000
// The same public upload settings the site's own forms use
const CLOUDINARY_CLOUD = 'o2iy0uxo'
const CLOUDINARY_PRESET = 'digital_menu_preset'
// The admin can move between shops in one message, and a whole menu is a long answer
const ADMIN_ROUNDS = 6
const ADMIN_REPLY_LENGTH = 4000
const REPLY_TOKENS = 8000
const ADMIN_REPLY_TOKENS = 30000

const env = (name: string, fallback = '') => Deno.env.get(name) || fallback
const WAHA_URL = env('WAHA_URL').replace(/\/+$/, '')
const SITE_URL = env('SITE_URL', 'https://alfsouq.com').replace(/\/+$/, '')

const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

/** Marks the message as read and shows typing. The reply doesn't depend on it, so a failure is only logged. */
function showTyping(session: string, chatId: string) {
  for (const endpoint of ['sendSeen', 'startTyping']) {
    fetch(`${WAHA_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: { ...wahaHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, chatId }),
    })
      .then(response => {
        if (!response.ok) console.error(`WAHA ${endpoint} failed`, response.status)
        return response.body?.cancel()
      })
      .catch(error => console.error(`WAHA ${endpoint} unreachable`, error))
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

/** A photo kept from an earlier message, read again so the admin's "its name is..." is answered with the menu in view. */
async function readKeptPhoto(url: string, label: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length > MAX_MEDIA_BYTES) return null
    return { label, base64: encodeBase64(bytes), mimeType: (response.headers.get('content-type') || 'image/jpeg').split(';')[0] }
  } catch {
    return null
  }
}

async function uploadImage(base64: string, mimeType: string): Promise<string | null> {
  const form = new FormData()
  form.append('file', `data:${mimeType};base64,${base64}`)
  form.append('upload_preset', CLOUDINARY_PRESET)
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: form })
  if (!response.ok) {
    console.error('Photo upload failed', response.status, (await response.text()).slice(0, 300))
    return null
  }
  return (await response.json()).secure_url || null
}

async function askGemini(input: unknown, maxTokens: number): Promise<{ parsed?: Parsed; busy?: boolean }> {
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
        generation_config: { thinking_level: 'low', temperature: 0.7, max_output_tokens: maxTokens },
        response_format: { type: 'text', mime_type: 'application/json' },
      }),
    }).catch(error => { console.error('Gemini unreachable', error); return null })
    console.log(`Gemini ${response?.status ?? 'unreachable'} in ${Date.now() - started} ms`)
    if (!response || response.status === 429 || response.status >= 500) {
      if (attempt < RETRY_WAITS.length) { await sleep(RETRY_WAITS[attempt]); continue }
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
async function runStep(step: Step, ctx: Context, phone: string, batch: string, getPhoto: (number: number) => Promise<string | null>): Promise<string | null> {
  const log = (action: string, table: string, id: string, before: unknown, after: Record<string, unknown>) =>
    db.from('assistant_changes').insert({ store_id: ctx.store.id, phone, action, target_table: table, target_id: id, before, after: { ...after, batch } })

  if (step.op === 'undo') return undoLast(ctx.store.id, phone)

  const wanted = photosUsed(step)
  if (wanted.length) {
    const urls: Record<number, string> = {}
    for (const number of wanted) {
      const url = await getPhoto(number)
      if (!url) return `${step.label}: PHOTO${number} could not be uploaded, so nothing was saved for it. Ask the owner to send it again.`
      urls[number] = url
    }
    step.fields = withPhoto(step.fields, urls)
  }

  // Left out of the change log on purpose: "undo" removes what's logged as added, and a shop is never deleted from here
  if (step.op === 'create_store') {
    const { data, error } = await db.from('restaurants').insert(step.fields).select('*').single()
    if (error) { console.error(error); return `${step.label}: the database refused this: ${error.message}` }
    console.log(`Shop opened by the admin: ${data.slug}`)
    applyToContext(ctx, step, data)
    return null
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

/** A shop's records, each under the short code the model calls it by, and the other names its owner uses. */
async function loadShop(store: Store): Promise<{ records: StoreRecord[]; aliases: { said: string; menu_item_id: string }[] }> {
  if (!store.id) return { records: [], aliases: [] }
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

  return {
    records: [
      { code: 'S', table: 'restaurants', id: store.id, row: store },
      ...coded('categories', 'C', rawCategories),
      ...coded('menu_items', 'P', rawItems),
      ...coded('offers', 'O', rawOffers),
    ],
    aliases: aliases || [],
  }
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

/** What the model asked to see before answering, read fresh from the database, on the shop's clock. */
async function lookAt(looks: Look[], store: Store): Promise<string> {
  const zone = storeZone(store)
  const when = (value: string) => toLocalTime(value, zone)
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
  const count = async (table: string, days: number, source?: string) => {
    let query = db.from(table).select('id', { count: 'exact', head: true }).eq('restaurant_id', store.id).gte('created_at', daysAgo(days))
    if (source) query = query.eq('source', source)
    return (await query).count ?? 0
  }

  const parts: string[] = []
  for (const look of looks) {
    if (look === 'recent_changes') {
      const { data } = await db.from('assistant_changes').select('action, target_table, before, after, created_at, undone_at')
        .eq('store_id', store.id).order('created_at', { ascending: false }).limit(15)
      const lines = (data || []).map(change => {
        const { batch: _batch, name, ...after } = change.after || {}
        const what = change.action === 'update'
          ? Object.keys(after).map(key => `${key} ${JSON.stringify(change.before?.[key] ?? null)} to ${JSON.stringify(after[key])}`).join(', ')
          : `added to ${change.target_table}`
        return `- ${when(change.created_at)}: ${name ?? ''}: ${what}${change.undone_at ? ' (taken back since)' : ''}`
      })
      parts.push(`Recent changes made through you (changes made in the store panel aren't listed):\n${lines.join('\n') || 'none'}`)
    }
    if (look === 'visits') {
      const [week, month, qrWeek, qrMonth] = await Promise.all([count('qr_scans', 7), count('qr_scans', 30), count('qr_scans', 7, 'qr'), count('qr_scans', 30, 'qr')])
      parts.push(`Visits to the shop page: ${week} in the last 7 days (${qrWeek} from scanning its QR code), ${month} in the last 30 days (${qrMonth} from QR). One visit per person per session.`)
    }
    if (look === 'orders') {
      const [week, month, { data: latest }] = await Promise.all([
        count('orders', 7),
        count('orders', 30),
        db.from('orders').select('created_at, items, total_price').eq('restaurant_id', store.id).order('created_at', { ascending: false }).limit(5),
      ])
      const lines = (latest || []).map(order => {
        const items = Array.isArray(order.items) ? order.items.map((item: any) => item?.name ?? item?.title).filter(Boolean).join('، ') : ''
        return `- ${when(order.created_at)}: ${items || 'items not recorded'}${order.total_price ? `, ${order.total_price}` : ''}`
      })
      parts.push(`Order button presses: ${week} in the last 7 days, ${month} in the last 30 days. These count customers pressing "order" and opening WhatsApp; the shop may not have received or completed every one, so say so if it matters.\nLatest:\n${lines.join('\n') || 'none'}`)
    }
  }
  return parts.join('\n\n')
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
    const response = await fetch(`${SITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-assistant-secret': env('ASSISTANT_SECRET') },
      body: JSON.stringify({ slug, restaurantId: storeId, type: 'offers' }),
    })
    if (!response.ok) console.error('The site did not refresh', response.status)
    await response.body?.cancel()
  } catch (error) {
    console.error('Could not refresh the site', error)
  }
}

interface InboxRow {
  message_id: string
  kind: Piece['kind']
  text: string | null
  media_url: string | null
  mime_type: string | null
}

/**
 * Owners often send one thought in pieces. Each piece waits a moment; only the last one in a row answers,
 * for all of them. Returns the pieces to answer, or null when a later message will answer them.
 */
async function gather(message: { id: string; sentAt: number; text: string; mediaUrl: string | null; mimeType: string | null }, phone: string, kind: Piece['kind']): Promise<InboxRow[] | null> {
  await db.from('assistant_inbox').insert({ message_id: message.id, phone, kind, sent_at: message.sentAt, text: message.text || null, media_url: message.mediaUrl, mime_type: message.mimeType })
  await sleep(GATHER_MS)

  // In the order the owner sent them; one that reached us later but was sent earlier still comes first
  const { data: waiting } = await db.from('assistant_inbox').select('*').eq('phone', phone).is('taken_at', null)
    .order('sent_at').order('received_at').order('message_id')
  if (!waiting?.length || waiting.at(-1)!.message_id !== message.id) return null

  const { data: taken } = await db.from('assistant_inbox').update({ taken_at: new Date().toISOString() })
    .in('message_id', waiting.map(row => row.message_id)).is('taken_at', null).select('*')
  if (!taken?.some(row => row.message_id === message.id)) return null

  // An answer still being worked out for this owner goes first, so this one sees what it did
  const mine = new Set(taken.map(row => row.message_id))
  const started = Date.now()
  while (Date.now() - started < BUSY_WAIT_MS) {
    const { data: busy } = await db.from('assistant_inbox').select('message_id').eq('phone', phone)
      .not('taken_at', 'is', null).is('done_at', null).gte('taken_at', new Date(Date.now() - 3 * 60_000).toISOString())
    if (!busy?.some(row => !mine.has(row.message_id))) break
    await sleep(1500)
  }

  return taken.sort((a, b) => (a.sent_at ?? 0) - (b.sent_at ?? 0) || String(a.received_at).localeCompare(String(b.received_at)) || a.message_id.localeCompare(b.message_id))
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
  const [{ data: owners }, { data: ownStores }, { data: overrides }, { data: admin }] = await Promise.all([
    db.from('profiles').select('restaurant_id').eq('phone', e164).eq('role', 'restaurant_owner'),
    db.from('restaurants').select('id').eq('whatsapp_number', e164),
    db.from('assistant_numbers').select('store_id, enabled').eq('phone', phone),
    db.from('assistant_admins').select('phone').eq('phone', phone).maybeSingle(),
  ])
  const isAdmin = Boolean(admin)
  const storeIds = allowedStoreIds(
    [...(owners || []).map(owner => owner.restaurant_id), ...(ownStores || []).map(store => store.id)],
    overrides || [],
  )
  if (storeIds.length === 0 && !isAdmin) return { reply: null, ignored: 'not a store owner' }

  const kind = pieceKind(message)
  if (kind === 'text' && !message.text) return { reply: null, ignored: 'empty message' }

  const batch = await gather(message, phone, kind)
  if (!batch) return { reply: null, ignored: 'answered together with a later message' }

  try {
    return await answer(message.session, phone, storeIds, batch, isAdmin)
  } finally {
    await db.from('assistant_inbox').update({ done_at: new Date().toISOString() }).in('message_id', batch.map(row => row.message_id))
    // Old rows are only needed for a few minutes
    db.from('assistant_inbox').delete().lt('received_at', new Date(Date.now() - 2 * 86_400_000).toISOString()).then(({ error }) => error && console.error(error))
  }
}

/** Reads everything the owner just sent, looks at the shop, acts and answers once. */
async function answer(session: string, phone: string, storeIds: string[], batch: InboxRow[], isAdmin: boolean) {
  const to = `${phone}@c.us`
  let ongoing = false
  const reply = (text: string) => ({ reply: text, chatId: to, session, wait_seconds: replyDelay(text, ongoing) })

  const { data: found } = isAdmin
    ? await db.from('restaurants').select('*').order('created_at')
    : await db.from('restaurants').select('*').in('id', storeIds)
  if (!found?.length && !isAdmin) return { reply: null, ignored: 'store not found' }

  // Same rule as the store panel: a suspended subscription can't edit. The admin reaches every shop.
  const stores: Store[] = isAdmin ? found || [] : found!.filter(store => store.is_subscription_active !== false)
  if (stores.length === 0 && !isAdmin) return reply('اشتراك متجرك متوقف. تواصل مع الإدارة لتجديده على الرقم +90 535 257 41 34')

  const { data: chat } = await db.from('assistant_chats').select('*').eq('phone', phone).maybeSingle()
  // Mid-conversation, the owner sees it being read and typed straight away, while the answer is worked out
  ongoing = isOngoing(chat?.updated_at, Date.now())
  if (ongoing) showTyping(session, to)
  const expired = chat?.pending_at && Date.now() - new Date(chat.pending_at).getTime() > PHOTO_MINUTES * 60_000
  const saved = expired ? null : chat?.pending ?? null
  const held: string | null = saved?.type === 'choose_store' ? saved.text : null
  const savedPhotos: string[] = saved?.type === 'photos' ? saved.urls : saved?.type === 'photo' ? [saved.url] : []

  // The words, all together, are what a store is picked by; a voice note or photo alone has none
  const words = batch.map(row => row.text).filter(Boolean).join('\n')
  // The admin stays on the last shop they worked on, and the model moves between shops itself
  const pick: StorePick = isAdmin
    ? { storeId: stores.some(store => store.id === chat?.store_id) ? chat.store_id : null, text: words || '(media)', held: null, reply: null, switched: false }
    : pickStore(stores, chat?.store_id ?? null, held, words || '(media)')
  const keptPhotos = pick.switched && stores.length > 1 ? [] : savedPhotos
  if (!isAdmin && (!pick.storeId || pick.reply)) {
    const entries: HistoryEntry[] = [{ from: 'owner', text: words || '(media)' }, { from: 'bot', text: pick.reply! }]
    await saveChat(phone, chat, entries, pick.storeId, pick.held ? { type: 'choose_store', text: pick.held } : null)
    return reply(pick.reply!)
  }
  const store = stores.find(candidate => candidate.id === pick.storeId) ?? NO_STORE

  // Each photo, voice note and sticker, downloaded in the order sent. A request held while the owner
  // picked a store comes first, since that's what they want done.
  const pieces: Piece[] = pick.text !== (words || '(media)') ? [{ kind: 'text', text: pick.text }] : []
  const photos: { base64: string; mimeType: string }[] = []
  const images: { label: string; base64: string; mimeType: string }[] = []
  const voices: { label: string; base64: string; mimeType: string }[] = []
  let mediaCount = 0
  for (const row of batch) {
    const text = row.kind === 'text' ? row.text || '' : row.text || undefined
    if (row.kind === 'text' || row.kind === 'other') { pieces.push({ kind: row.kind, text }); continue }
    const bytes = row.media_url && mediaCount < MAX_MEDIA ? await downloadMedia(row.media_url) : null
    if (!bytes) { pieces.push({ kind: 'failed', text }); continue }
    mediaCount++
    const mimeType = (row.mime_type || '').split(';')[0]
    const base64 = encodeBase64(bytes)
    console.log(`Media received: ${row.kind}, ${mimeType}, ${bytes.length} bytes`)
    if (row.kind === 'photo') {
      photos.push({ base64, mimeType })
      images.push({ label: `PHOTO${keptPhotos.length + photos.length}:`, base64, mimeType })
    } else if (row.kind === 'sticker') {
      images.push({ label: `Sticker ${images.filter(image => image.label.startsWith('Sticker')).length + 1}:`, base64, mimeType })
    } else {
      voices.push({ label: `Voice note ${voices.length + 1}:`, base64, mimeType })
    }
    pieces.push({ kind: row.kind, text })
  }

  // A menu sent earlier is seen again by the admin's next message, as far as there's room after the new photos
  if (isAdmin && keptPhotos.length) {
    const room = Math.max(0, MAX_MEDIA - mediaCount)
    const wanted = keptPhotos.map((url, index) => ({ url, label: `PHOTO${index + 1}:` })).slice(Math.max(0, keptPhotos.length - room))
    const earlier = await Promise.all(wanted.map(photo => readKeptPhoto(photo.url, photo.label)))
    images.unshift(...earlier.filter(photo => photo !== null))
  }

  const countCall = async () => (await db.rpc('assistant_count_call', { daily_limit: DAILY_AI_LIMIT })).data !== false
  if (!await countCall()) return reply('عندي ضغط اليوم. جرّب بكرا إن شاء الله.')

  const [shop, { data: rawStockPhotos }] = await Promise.all([
    loadShop(store),
    db.from('stock_photos').select('name, keywords, image_url').order('name').limit(MAX_STOCK_PHOTOS),
  ])
  let aliases = shop.aliases

  // Only the conversation and shop details go to Google: no owner's number or sender name
  const history: HistoryEntry[] = chat?.history || []
  const ctx: Context = {
    store,
    records: shop.records,
    photos: keptPhotos.length + photos.length,
    photosKept: keptPhotos.length,
    lastReply: history.filter(entry => entry.from === 'bot').at(-1)?.text,
    stockPhotos: (rawStockPhotos || []).map((photo, index) => ({ code: `ST${index + 1}`, name: photo.name, keywords: photo.keywords || [], url: photo.image_url })),
    isAdmin,
    stores: isAdmin ? stores.map((candidate, index) => ({ code: `A${index + 1}`, id: candidate.id, name: candidate.name, slug: candidate.slug })) : undefined,
  }

  const said = describePieces(pieces, keptPhotos.length)
  let seen = ''
  // Photos and stickers come before the words, so each is judged on its own; voice notes after them
  const request = (note: string) => {
    // Built each time, since the admin may have moved to another shop or opened a new one
    const text = [buildInput(ctx, aliases, history, said, storeLocalTime(ctx.store)), seen, note].filter(Boolean).join('\n\n')
    if (!images.length && !voices.length) return text
    const media = (items: typeof images, type: 'image' | 'audio') =>
      items.flatMap(item => [{ type: 'text', text: item.label }, { type, data: item.base64, mime_type: item.mimeType }])
    return [...media(images, 'image'), { type: 'text', text }, ...media(voices, 'audio')]
  }

  // Kept photos are already uploaded and come first. A new one is only uploaded once it's really going to be used, and only once.
  const uploaded: Record<number, string | null> = {}
  const getPhoto = async (number: number) => {
    if (number <= keptPhotos.length) return keptPhotos[number - 1] ?? null
    const photo = photos[number - keptPhotos.length - 1]
    if (!photo) return null
    if (!(number in uploaded)) uploaded[number] = await uploadImage(photo.base64, photo.mimeType)
    return uploaded[number]
  }

  const batchId = batch.at(-1)!.message_id
  const done: Step[] = []
  const used = new Set<number>()
  let heard = ''
  let draft = ''
  let note = ''
  let looked = false
  let answered = false
  let busy = false
  const rounds = isAdmin ? ADMIN_ROUNDS : MAX_ROUNDS
  // Every shop changed in this message, by id, to refresh once it's done
  const changed = new Map<string, string>()

  // The agent looks, acts, hears what really happened, and can put it right before answering
  for (let round = 0; round < rounds; round++) {
    if (round > 0 && !await countCall()) break
    const result = await askGemini(request(note), isAdmin ? ADMIN_REPLY_TOKENS : REPLY_TOKENS)
    if (!result.parsed) { busy = !!result.busy; break }

    // A voice note it wrote nothing down for wasn't really heard, so it isn't acted on
    if (voices.length && !String(result.parsed.heard ?? '').trim()) {
      console.log('Voice note: nothing written down')
      if (round === 0) {
        note = 'System note: you did not write what the owner said in the voice note, and nothing was sent. Listen to it again and answer. If you still can\'t make it out, change nothing and tell them you didn\'t catch it.'
        continue
      }
      result.parsed.actions = []
    }

    if (!heard) {
      // What it saw goes in the log and the conversation, so a wrong call on a photo can be traced
      const shows = images.length ? String(result.parsed.photo_shows ?? '').slice(0, 300) : ''
      if (images.length) console.log(`Photo shows: ${shows || '(nothing said)'}`)
      heard = [shows && `صورة: ${shows}`, String(result.parsed.heard ?? '')].filter(Boolean).join(' - ')
    }

    // Moving comes before anything else it sent, so nothing lands on the shop it's leaving
    const target = round < rounds - 2 ? readSwitchStore(ctx, result.parsed.switch_store) : null
    if (target) {
      const next = stores.find(candidate => candidate.id === target.id) ?? ctx.store
      const loaded = await loadShop(next)
      ctx.store = next
      ctx.records = loaded.records
      aliases = loaded.aliases
      seen = ''
      looked = false
      console.log(`Admin moved to ${target.slug}`)
      note = `You are now on ${target.name}, and only moved: nothing was saved by that. Saved so far: ${describeForMemory(done) || 'nothing'}. Do what they asked and answer.`
      continue
    }

    // It can look around once before deciding, while there are rounds left to act and answer
    const looks = readLooks(result.parsed.look)
    if (looks.length && !looked && round < rounds - 2 && ctx.store.id) {
      looked = true
      console.log(`Looked at: ${looks.join(', ')}`)
      seen = `What you asked to see:\n${await lookAt(looks, ctx.store)}`
      note = 'Now decide what to do and answer.'
      continue
    }

    // Its last try is only for answering, so the owner always hears something real
    const lastRound = round === rounds - 1
    const actions = lastRound ? [] : readActions(result.parsed.actions)
    const problems: string[] = []
    for (const action of actions) {
      const { step, problem } = checkAction(ctx, action)
      if (!step) { problems.push(problem!); continue }
      const photosInStep = photosUsed(step)
      const failed = await runStep(step, ctx, phone, batchId, getPhoto)
      if (failed) { problems.push(failed); continue }
      done.push(step)
      changed.set(ctx.store.id, ctx.store.slug)
      photosInStep.forEach(number => used.add(number))
    }

    draft = safeReply(result.parsed.reply, shopLinks(ctx.store), isAdmin ? ADMIN_REPLY_LENGTH : undefined)
    const emptyClaim = actions.length === 0 && done.length === 0 && claimsSave(draft)
    if (problems.length === 0 && draft && !emptyClaim) { answered = true; break }

    note = `System note: your draft reply was not sent. Saved so far: ${describeForMemory(done) || 'nothing'}. ${
      emptyClaim ? 'Your draft said something changed, but you sent no actions, so nothing did.' : ''
    }${problems.length ? ` These did not go through:\n${problems.join('\n')}` : ''}${!draft && !problems.length ? ' Your reply was empty or held a link other than the ones you may share.' : ''}
${round === rounds - 2 ? 'This is your last try, so nothing more can be saved: leave actions empty and tell the owner honestly what was saved, what was not, and ask for whatever is missing.' : 'Fix what you can with new actions, without repeating what was saved, or tell the owner honestly, asking for whatever is missing. Then write your reply.'}`
  }

  const unheard = voices.length ? '(رسالة صوتية ما انفهمت)' : images.length ? '(صورة)' : ''
  const owner: HistoryEntry = { from: 'owner', text: (heard || words || unheard).slice(0, 500) }

  // The admin setting up a whole menu doesn't need asking about photos for it
  const withAsk = (text: string) => (isAdmin ? text : withPhotoQuestion(text, done))
  let finalReply: string
  if (answered) {
    finalReply = withAsk(withFacts(draft, done))
  } else if (done.length > 0) {
    finalReply = `${withAsk(withFacts('', done))}\nوالباقي ما زبط معي، فيك تبعتلي ياه كمان مرة؟`
  } else {
    finalReply = busy ? 'عندي ضغط هلق، جرّب بعد شوي.' : 'معليش، ما زبط معي. فيك تبعتها كمان مرة؟'
  }

  // Photos not used yet, earlier ones and new ones, are kept for a while, so "this one is for the bread" still works.
  // The newest are kept when there are too many.
  // A menu the admin has just had added isn't kept, or their next message would read it and add it again.
  const photosLeft: string[] = []
  for (let number = isAdmin && done.length > 0 ? 0 : ctx.photos; number >= 1 && photosLeft.length < MAX_KEPT_PHOTOS; number--) {
    if (used.has(number)) continue
    const url = await getPhoto(number)
    if (url) photosLeft.unshift(url)
  }

  const bot: HistoryEntry = { from: 'bot', text: finalReply }
  const did = describeForMemory(done)
  if (did) bot.did = did
  await saveChat(phone, chat, [owner, bot], ctx.store.id || null, photosLeft.length ? { type: 'photos', urls: photosLeft } : null)
  await Promise.all([...changed].map(([id, slug]) => publishChanges(slug, id)))

  return reply(finalReply)
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
