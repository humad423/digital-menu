// The assistant is an agent: the model decides what to change and what to say.
// This file gives it the shop's data and keeps it inside that one shop, nothing more.
// Free of network and database code so it can be tested.

import { ADMIN_BRIEF } from './brief.ts'

export const HISTORY_SAVED = 30
export const HISTORY_SENT = 20
export const PHOTO_MINUTES = 30
export const MAX_MESSAGE_AGE_SECONDS = 300
// One round to look around, up to two to act and put things right, and a last one only to answer
export const MAX_ROUNDS = 4
export const CONVERSATION_GAP_MINUTES = 15
const MAX_ACTIONS = 200
const CURRENCY = '₺'
/** How the model names a photo it wants to use: PHOTO1, PHOTO2... and PHOTO when there is only one. */
const PHOTO_NAME = /^PHOTO(\d*)$/
/** Things the model can ask to see before answering. */
export const LOOKS = ['recent_changes', 'visits', 'orders'] as const
export type Look = (typeof LOOKS)[number]
/** A new price this many times higher or lower than the old one is checked with the owner first. */
const PRICE_JUMP = 3

export type StoreTable = 'restaurants' | 'categories' | 'menu_items' | 'offers'
type Row = Record<string, unknown>

/** The same settings the store panel refuses to let an owner change. */
const ADMIN_ONLY = new Set([
  'slug', 'is_subscription_active', 'is_menu_active', 'subscription_notes', 'max_offers_limit', 'show_on_home', 'show_stores_button',
  'name', 'phone', 'whatsapp_number', 'latitude', 'longitude', 'store_type', 'timezone',
])
/**
 * Settings an owner could change and then forget to change back, like the hours or switching delivery off.
 * The owner changes these from the store panel; the assistant only changes them for a while, with
 * special_days and delivery_paused_until, which end on their own. Prices, delivery fees included, stay the assistant's.
 */
const PANEL_ONLY = new Set([
  'opening_time', 'closing_time', 'days_off', 'is_on_holiday',
  'has_delivery', 'delivery_from', 'delivery_until', 'enable_whatsapp_orders',
])
/** How far ahead a one-day change can be made, and how many there can be. */
const SPECIAL_DAYS_AHEAD = 30
const MAX_SPECIAL_DAYS = 14
/** What ties a record to its identity and its shop. */
const LOCKED = new Set(['id', 'created_at', 'restaurant_id'])
/** Left out of what the model reads when they hold their usual value, to keep long lists short. */
const USUAL: Row = { is_available: true, is_hidden: false, is_offer: false, allow_custom_amount: false, is_active: true, min_quantity: 1, bonus_quantity: 1, item3_quantity: 1, item4_quantity: 1 }
const NEVER_SHOWN = new Set(['id', 'created_at', 'restaurant_id', 'subscription_notes', 'is_subscription_active', 'images', 'phone', 'whatsapp_number', 'latitude', 'longitude'])
const LINKS = new Set(['image_url', 'logo_url', 'cover_url'])

export interface StoreRecord {
  code: string
  table: StoreTable
  id: string
  row: Row
}

export interface Store extends Row {
  id: string
  name: string
  slug: string
  store_type: string | null
  max_offers_limit: number | null
}

export interface HistoryEntry {
  from: 'owner' | 'bot'
  text: string
  /** What was really saved during this message, so the model remembers it. */
  did?: string
}

export interface Context {
  store: Store
  records: StoreRecord[]
  /** How many photos can be used right now, as PHOTO1, PHOTO2...: sent in these messages, or kept from recent ones. */
  photos: number
  /** How many of them, from PHOTO1 on, came in earlier messages; the rest came just now. */
  photosKept?: number
  /** The assistant's previous message, so a price it asked to confirm can go through once the owner says yes. */
  lastReply?: string
  /** The time now, in milliseconds; tests set it */
  now?: number
  /** Ready-made photos of products that look the same everywhere, named ST1, ST2... */
  stockPhotos?: { code: string; name: string; keywords: string[]; url: string }[]
  /** True when the Alfsouq admin is writing: any shop, and new ones. */
  isAdmin?: boolean
  /** Every shop, for the admin, named A1, A2... */
  stores?: ShopChoice[]
}

export interface ShopChoice {
  code: string
  id: string
  name: string
  slug: string
}

/** Stands in for the shop until the admin picks or opens one; nothing can be saved on it. */
export const NO_STORE: Store = { id: '', name: '(no shop chosen yet)', slug: '', store_type: null, max_offers_limit: null }

/** One of the messages the owner sent in a row, in the order sent. */
export interface Piece {
  /** failed: a photo or voice note that couldn't be downloaded. */
  kind: 'text' | 'photo' | 'voice' | 'sticker' | 'other' | 'failed'
  text?: string
}

export type Step =
  | { op: 'update'; table: StoreTable; id: string; code: string; label: string; said: string; fields: Row; before: Row }
  | { op: 'add'; table: Exclude<StoreTable, 'restaurants'>; label: string; ref: string | null; fields: Row }
  | { op: 'create_store'; label: string; fields: Row }
  | { op: 'undo' }

export interface RawAction {
  op?: unknown
  record?: unknown
  table?: unknown
  fields?: unknown
  ref?: unknown
  said_name?: unknown
}

export interface Parsed {
  photo_shows?: unknown
  heard?: unknown
  look?: unknown
  switch_store?: unknown
  actions?: unknown
  reply?: unknown
}

/** The shop the admin's message wants to move to, if it's a real one and not the current one. */
export function readSwitchStore(ctx: Context, raw: unknown): ShopChoice | null {
  if (!ctx.isAdmin || typeof raw !== 'string') return null
  const choice = ctx.stores?.find(store => store.code === raw)
  return choice && choice.id !== ctx.store.id ? choice : null
}

/** What the model asked to see, limited to what it can ask for. */
export const readLooks = (raw: unknown): Look[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((item): item is Look => (LOOKS as readonly unknown[]).includes(item)))] : []

export { SYSTEM_INSTRUCTION } from './brief.ts'

/** The shop's own date and time, so "today", "tomorrow" and "at 6" mean what the owner means. */
export function storeLocalTime(store: Store, now: Date = new Date()): string {
  const format = (timeZone: string) =>
    now.toLocaleString('en-GB', { timeZone, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'shortOffset' })
  try {
    return format(String(store.timezone || 'Europe/Istanbul'))
  } catch {
    return format('Europe/Istanbul')
  }
}

export function normalizeName(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

const clean = (value: unknown, length: number) =>
  String(value ?? '').replace(/[\r\n*_~`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, length)

const latinDigits = (value: string) => value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))

const money = (value: unknown) => `${value} ${CURRENCY}`

/** Sender and media from a WAHA webhook, or the reason it should be ignored. */
export function readMessage(body: any, now: number) {
  const payload = body?.payload
  if (body?.event !== 'message' || !payload?.id || !payload?.from) return { ignored: 'not a new message' as const }
  if (payload.fromMe === true) return { ignored: 'sent by the bot' as const }

  const from = String(payload.from)
  if (from === 'status@broadcast' || from.endsWith('@g.us') || from.endsWith('@newsletter') || from.endsWith('@broadcast')) {
    return { ignored: 'not a private chat' as const }
  }
  const timestamp = Number(payload.timestamp) || 0
  if (!timestamp || now - timestamp > MAX_MESSAGE_AGE_SECONDS) return { ignored: 'too old' as const }

  const isPhone = (value: unknown) => typeof value === 'string' && /@(c\.us|s\.whatsapp\.net)$/.test(value)
  const phoneId = [from, payload._data?.Info?.SenderAlt, payload._data?.Info?.Sender].find(isPhone) as string | undefined
  const phone = phoneId ? phoneId.split('@')[0].split(':')[0].replace(/\D/g, '') : null

  return {
    id: String(payload.id),
    /** When WhatsApp says it was sent, in seconds. */
    sentAt: timestamp,
    session: String(body.session || 'default'),
    from,
    phone,
    lid: from.endsWith('@lid') ? from : null,
    text: String(payload.body || '').trim(),
    hasMedia: payload.hasMedia === true,
    mediaUrl: typeof payload.media?.url === 'string' ? payload.media.url : null,
    mimeType: typeof payload.media?.mimetype === 'string' ? payload.media.mimetype : null,
    // WhatsApp sends stickers as webp images; photos from the camera or gallery come as jpeg
    isSticker: payload._data?.Message?.stickerMessage != null || payload._data?.type === 'sticker' || payload.media?.mimetype === 'image/webp',
  }
}

/** What kind of message each one is, from WhatsApp's details. */
export function pieceKind(message: { hasMedia: boolean; mimeType: string | null; isSticker?: boolean }): Piece['kind'] {
  if (!message.hasMedia) return 'text'
  if (message.isSticker) return 'sticker'
  if (/^image\//.test(message.mimeType || '')) return 'photo'
  if (/^audio\//.test(message.mimeType || '')) return 'voice'
  return 'other'
}

/**
 * The owner's messages sent in a row, read as one, in order. Photos are numbered as the model will use them,
 * and anything it can't open is named so it can say so.
 */
export function describePieces(pieces: Piece[], photosBefore = 0): string {
  // Photos kept from earlier messages come first, so new ones carry on after them
  let photo = photosBefore
  let voice = 0
  let sticker = 0
  const lines = pieces.map(piece => {
    const caption = piece.text ? `, with the words: ${piece.text}` : ''
    switch (piece.kind) {
      case 'text': return piece.text || '(empty)'
      case 'photo': return `(PHOTO${++photo} is attached${caption})`
      case 'voice': return `(voice note ${++voice} is attached: listen to it)`
      case 'sticker': return `(sticker ${++sticker} is attached: a reaction, not a product photo${caption})`
      case 'failed': return `(a photo or voice note that didn't come through, so you can't see or hear it: ask them to send it again${caption})`
      default: return `(a video or file, which you can't open or watch${caption}: tell them in your own words, and ask for what you need another way, like photos, a voice note or text)`
    }
  })
  if (lines.length === 1) return lines[0]
  return `They sent ${lines.length} messages in a row; read them together as one:\n${lines.map((line, index) => `${index + 1}. ${line}`).join('\n')}`
}

const isEmpty = (value: unknown) =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

/** The photos a product or offer already has, in order, main one first. */
function savedPhotos(row: Row): string[] {
  let list: unknown = row.images
  if (typeof list === 'string') {
    try { list = JSON.parse(list) } catch { list = [] }
  }
  const photos = Array.isArray(list) ? list.filter((url): url is string => typeof url === 'string' && url.length > 0) : []
  if (photos.length === 0 && typeof row.image_url === 'string' && row.image_url) photos.push(row.image_url)
  return photos
}

/** How the model names a photo a record already has: P3#1 is the first photo of P3. */
const SAVED_PHOTO = /^([A-Z]\d+)#(\d+)$/
/** How the model names a ready-made photo: ST1, ST2... */
const STOCK_PHOTO = /^ST\d+$/

/**
 * A record as the model reads it: short, with links to other records written as their codes, times on the shop's clock,
 * and its photos named like P3#1, so it can keep them when adding more.
 */
function showRecord(ctx: Context, record: StoreRecord): string {
  const shown: Row = {}
  const photos = savedPhotos(record.row)
  for (const [key, value] of Object.entries(record.row)) {
    if (NEVER_SHOWN.has(key) || isEmpty(value) || USUAL[key] === value) continue
    if (key === 'image_url' && photos.length) continue
    if (LINKS.has(key)) shown[key] = 'set'
    else if (key.endsWith('_id')) shown[key] = ctx.records.find(other => other.id === value)?.code ?? value
    else if (key.endsWith('_until')) shown[key] = toLocalTime(value, storeZone(ctx.store))
    else shown[key] = value
  }
  if (photos.length && record.table !== 'restaurants') shown.images = photos.map((_, index) => `${record.code}#${index + 1}`)
  return JSON.stringify(shown)
}

/** Turns names like P3#1 back into the photos they stand for, or says which one doesn't exist. */
function readSavedPhotos(ctx: Context, value: unknown): { value?: unknown; problem?: string } {
  let problem: string | undefined
  const swap = (inner: unknown): unknown => {
    if (typeof inner === 'string') {
      if (STOCK_PHOTO.test(inner)) {
        const stock = ctx.stockPhotos?.find(photo => photo.code === inner)
        if (!stock) problem ??= `${inner} is not one of the ready-made photos. Nothing was saved for this.`
        return stock?.url ?? inner
      }
      const match = inner.match(SAVED_PHOTO)
      if (!match) return inner
      const photo = savedPhotos(ctx.records.find(record => record.code === match[1])?.row ?? {})[Number(match[2]) - 1]
      if (!photo) problem ??= `${inner} is not a photo in this shop. Nothing was saved for this.`
      return photo ?? inner
    }
    if (Array.isArray(inner)) return inner.map(swap)
    return inner
  }
  const swapped = swap(value)
  return problem ? { problem } : { value: swapped }
}

const DEFAULT_ZONE = 'Europe/Istanbul'

/** The shop's time zone, or Turkey's when it isn't a real one. */
export function storeZone(store: Store): string {
  const zone = String(store.timezone || DEFAULT_ZONE)
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return zone
  } catch {
    return DEFAULT_ZONE
  }
}

/** A moment as the shop's wall clock shows it. */
function wallClock(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(at).map(part => [part.type, part.value]),
  )
  return { year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour % 24, minute: +parts.minute }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** A saved moment as "YYYY-MM-DD HH:MM" on the shop's clock, the way the model reads and writes times. */
export function toLocalTime(value: unknown, timeZone: string): string {
  const at = new Date(String(value))
  if (Number.isNaN(at.getTime())) return String(value)
  const t = wallClock(at, timeZone)
  return `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}`
}

/** "YYYY-MM-DD HH:MM" on the shop's clock as an exact moment to save, or null when it isn't a time. */
export function fromLocalTime(value: unknown, timeZone: string): string | null {
  const text = latinDigits(String(value ?? '').trim())
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/)
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  // Start as if the shop were on GMT, then move by however far its clock is off, twice for summer-time edges
  let moment = wanted
  for (let i = 0; i < 2; i++) {
    const t = wallClock(new Date(moment), timeZone)
    moment += wanted - Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute)
  }
  return new Date(moment).toISOString()
}

/** Which photos the model can use now, and where they came from. */
function photoLine(ctx: Context): string {
  if (ctx.photos === 0) return 'none'
  const kept = Math.min(ctx.photosKept ?? 0, ctx.photos)
  const names = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => `PHOTO${from + index}`).join(', ')
  return [
    kept > 0 && `${names(1, kept)}, sent in an earlier message and not used yet`,
    kept < ctx.photos && `${names(kept + 1, ctx.photos)}, sent just now`,
  ].filter(Boolean).join('; ')
}

/**
 * What a sharp colleague would spot at a glance: things that are off, or that customers can't get right now.
 * The model brings one up only when it matters to what the owner is doing.
 */
export function noticeLines(ctx: Context, now: number = Date.now()): string[] {
  const notes: string[] = []
  const zone = storeZone(ctx.store)
  // The shop as it is now, with whatever was just changed in this message
  const store = (ctx.records.find(record => record.table === 'restaurants')?.row ?? ctx.store) as Store
  if (store.is_menu_active === false) notes.push("The Alfsouq team has switched the shop's page off, so customers can't see it now.")
  if (store.is_on_holiday === true) notes.push(`The shop is marked as on holiday (is_on_holiday), so customers see it closed${store.holiday_message ? `, with the message "${clean(store.holiday_message, 100)}"` : ''}.`)
  if (Date.parse(String(store.closed_until ?? '')) > now) notes.push(`The shop is closed for a while, until ${toLocalTime(store.closed_until, zone)}, then it opens on its own.`)
  const pausedUntil = Date.parse(String(store.delivery_paused_until ?? ''))
  if (pausedUntil > now) notes.push(`Delivery is paused until ${toLocalTime(store.delivery_paused_until, zone)}, then it comes back on its own.`)
  const today = toLocalTime(new Date(now).toISOString(), zone).slice(0, 10)
  const days = (Array.isArray(store.special_days) ? store.special_days as Row[] : []).filter(day => String(day.date) >= today)
  if (days.length) notes.push(`One-day changes in special_days from today on: ${JSON.stringify(days)}. Each ends on its own after its day.`)

  const products = ctx.records.filter(record => record.table === 'menu_items' && record.row.is_hidden !== true)
  const name = (record: StoreRecord) => `${record.code} ${labelOf(record.row)}`
  const cantOrder = (record: StoreRecord | undefined) => {
    if (!record) return false
    if (record.row.is_hidden === true) return true
    if (record.row.is_available !== false) return false
    const until = Date.parse(String(record.row.out_of_stock_until ?? ''))
    return !(until <= now)
  }

  for (const product of products.filter(record => record.row.is_available === false)) {
    const until = product.row.out_of_stock_until
    const back = Date.parse(String(until ?? ''))
    notes.push(!until
      ? `${name(product)} is out of stock, with no time set for it to come back.`
      : back <= now
        ? `${name(product)} was out until ${toLocalTime(until, zone)}, which has passed, so customers see it available again.`
        : `${name(product)} is out of stock until ${toLocalTime(until, zone)}.`)
  }

  for (const offer of ctx.records.filter(record => record.table === 'offers' && record.row.is_active !== false)) {
    const total = offerTotal(ctx, offer.row)
    if (total > 0 && Number(offer.row.offer_price) >= total) {
      notes.push(`Offer ${offer.code} "${labelOf(offer.row)}" costs ${String(offer.row.offer_price)}, which is no longer below its products' total of ${total} at today's prices.`)
    }
    const blocked = OFFER_SLOTS.map(([item]) => ctx.records.find(record => record.id === offer.row[item])).filter(cantOrder)
    if (blocked.length) notes.push(`Offer ${offer.code} "${labelOf(offer.row)}" includes ${blocked.map(record => name(record!)).join(', ')}, which customers can't get right now.`)
  }

  const byName = new Map<string, StoreRecord[]>()
  for (const product of products) {
    const key = normalizeName(product.row.name)
    byName.set(key, [...(byName.get(key) ?? []), product])
  }
  for (const same of byName.values()) {
    if (same.length > 1) notes.push(`These products have the same name: ${same.map(name).join(', ')}.`)
  }

  const bare = products.filter(product => !hasPhoto(product.row))
  if (bare.length) {
    notes.push(`${bare.length} of ${products.length} products have no photo${bare.length <= 6 ? `: ${bare.map(name).join(', ')}` : ''}. Only bring this up if it fits the moment.`)
  }
  return notes
}

/**
 * How often the assistant called the owner "أستاذ" lately. A model can't count its own habits,
 * so it's told, and decides for itself whether to say it this time.
 */
export function titleUse(history: HistoryEntry[]): string {
  const recent = history.filter(entry => entry.from === 'bot').slice(-4)
  const used = recent.filter(entry => /استاذ/.test(normalizeName(entry.text))).length
  if (used === 0) return 'you haven\'t called them "أستاذ" in your recent messages.'
  return `you called them "أستاذ" in ${used} of your last ${recent.length} messages${used >= 2 ? ', which is already a lot: leave it out now' : ''}.`
}

export function buildInput(ctx: Context, aliases: { said: string; menu_item_id: string }[], history: HistoryEntry[], text: string, localTime: string): string {
  const known = aliases
    .map(alias => {
      const record = ctx.records.find(candidate => candidate.id === alias.menu_item_id)
      return record ? `${alias.said} means ${record.code}` : null
    })
    .filter(Boolean)

  const section = (table: StoreTable) =>
    ctx.records.filter(record => record.table === table).map(record => `${record.code} ${showRecord(ctx, record)}`).join('\n') || 'none'

  const historyLine = (e: HistoryEntry) => `${e.from === 'owner' ? 'Owner' : 'You'}: ${e.text}${e.did ? `\nDid: ${e.did}` : ''}`

  return [
    ...(ctx.isAdmin ? [ADMIN_BRIEF, `All shops:\n${(ctx.stores ?? []).map(store => `${store.code} ${store.name} (${store.slug})`).join('\n') || 'none'}`] : []),
    `How you've been talking: ${titleUse(history)}`,
    `Local time: ${localTime}`,
    `Shop:\n${section('restaurants')}`,
    `Categories:\n${section('categories')}`,
    `Products:\n${section('menu_items')}`,
    `Offers:\n${section('offers')}`,
    `Other names the owner uses:\n${known.join('\n') || 'none'}`,
    `Links you may share:\n${shopLinkLines(ctx.store, history)}`,
    `Photos you can use: ${photoLine(ctx)}`,
    `Ready-made photos:\n${(ctx.stockPhotos ?? []).map(photo => `${photo.code} ${photo.name}${photo.keywords.length ? ` (${photo.keywords.join(', ')})` : ''}`).join('\n') || 'none'}`,
    `Worth noticing in this shop now:\n${noticeLines(ctx).join('\n') || 'nothing'}`,
    `Recent conversation:\n${history.slice(-HISTORY_SENT).map(historyLine).join('\n') || 'none'}`,
    `New message from the owner:\n${text || '(no text)'}`,
  ].join('\n\n')
}

const OFFER_SLOTS = [['primary_item_id', 'min_quantity'], ['bonus_item_id', 'bonus_quantity'], ['item3_id', 'item3_quantity'], ['item4_id', 'item4_quantity']] as const
const OFFER_PRODUCT_FIELDS = new Set<string>(OFFER_SLOTS.flat())

/** What the products in an offer cost together, at their current prices. */
function offerTotal(ctx: Context, fields: Row): number {
  return OFFER_SLOTS.reduce((total, [item, quantity]) => {
    const product = ctx.records.find(record => record.id === fields[item])
    return product ? total + Number(product.row.price) * (Number(fields[quantity]) || 1) : total
  }, 0)
}

/** The products in an offer and how many of each, in any order. Empty when it has none. */
function offerProducts(row: Row): string {
  const counts = new Map<string, number>()
  for (const [item, quantity] of OFFER_SLOTS) {
    if (row[item]) counts.set(String(row[item]), (counts.get(String(row[item])) ?? 0) + (Number(row[quantity]) || 1))
  }
  return [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([id, amount]) => `${id}x${amount}`).join(',')
}

/**
 * Two offers with the same products, or the same name, look like one to customers. Hidden offers count too.
 * Only what is being set is checked, so a pair saved before this can still be fixed.
 */
function duplicateOfferProblem(ctx: Context, row: Row, changed: string[], selfId?: string): string | null {
  const products = offerProducts(row)
  const title = normalizeName(row.title)
  const checkProducts = Boolean(products) && changed.some(key => OFFER_PRODUCT_FIELDS.has(key))
  const checkTitle = Boolean(title) && changed.includes('title')
  for (const other of ctx.records) {
    if (other.table !== 'offers' || other.id === selfId) continue
    const hidden = other.row.is_active === false ? ', which is hidden now' : ''
    if (checkProducts && offerProducts(other.row) === products) {
      return `${other.code} "${labelOf(other.row)}"${hidden} already has exactly these products, so nothing was saved. Tell the owner, and offer to change ${hidden ? 'or show again ' : ''}that offer instead of making a copy.`
    }
    if (checkTitle && normalizeName(other.row.title) === title) {
      return `${other.code}${hidden} is already called "${labelOf(other.row)}", so nothing was saved. Ask the owner for a different name for this offer.`
    }
  }
  return null
}

/** A discount has to be a real one: customers would otherwise see a fake saving. */
function discountProblem(table: StoreTable, row: Row): string | null {
  if (table === 'offers') {
    const original = Number(row.original_price)
    if (original > 0 && Number(row.offer_price) < original) return null
    return `The offer price ${String(row.offer_price)} is not below the original price ${String(row.original_price ?? 'none')}, so it was NOT saved. An offer must be cheaper than the product's price. Tell the owner and ask for a lower price.`
  }
  if (table === 'menu_items' && Number(row.original_price) > 0 && Number(row.price) >= Number(row.original_price)) {
    return `The price ${String(row.price)} is not below the crossed-out old price ${String(row.original_price)}, so it was NOT saved. Either lower the price, or set original_price to null if the product is no longer discounted.`
  }
  return null
}

const labelOf = (row: Row) => clean(row.name ?? row.title, 80) || 'السجل'

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null) || (typeof a !== 'object' && a !== null && a !== undefined && Number(a) === Number(b))

/** Turns what the model wrote into real values, keeping every link inside this shop. */
function readFields(ctx: Context, table: StoreTable, raw: unknown): { fields?: Row; problem?: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { problem: 'fields must be an object of the values to save.' }
  const now = ctx.now ?? Date.now()
  const fields: Row = {}
  for (const [key, value] of Object.entries(raw as Row)) {
    if (LOCKED.has(key)) continue
    if (table === 'restaurants' && !ctx.isAdmin && ADMIN_ONLY.has(key)) return { problem: `${key} belongs to the Alfsouq team. Nothing was saved for this.` }
    if (table === 'restaurants' && !ctx.isAdmin && PANEL_ONLY.has(key)) {
      return { problem: `${key} is one of the shop's lasting settings, which the owner changes in the store panel, so nothing was saved. You only make changes for a while: special_days for a day's hours or delivery, delivery_paused_until to stop delivery for a while, closed_until to close the shop for a while. If they meant it for good, tell them they can change it from the store panel and send its link.` }
    }
    if (table === 'restaurants' && key === 'special_days') {
      const days = readNewSpecialDays(value, ctx.store, now)
      if (days.problem) return { problem: days.problem }
      fields[key] = days.list
      continue
    }
    if (table === 'restaurants' && (key === 'whatsapp_number' || key === 'phone') && value !== null) {
      const number = readPhone(value)
      if (!number) return { problem: `"${String(value)}" is not a full phone number, so nothing was saved for this. Ask for it again.` }
      fields[key] = number
      continue
    }
    if (table === 'restaurants' && SHOP_HOURS.has(key) && value !== null) {
      const hour = latinDigits(String(value).trim()).match(HOUR)
      if (!hour) return { problem: `${key}: "${String(value)}" is not a time written as HH:MM. Nothing was saved for this.` }
      fields[key] = `${hour[1].padStart(2, '0')}:${hour[2]}`
      continue
    }
    if (key.endsWith('_id') && value !== null) {
      const target = ctx.records.find(record => record.code === value || record.id === value)
      if (!target) return { problem: `${key}: ${String(value)} is not part of this shop. Nothing was saved for this.` }
      fields[key] = target.id
      continue
    }
    if ((key === 'price' || key === 'offer_price') && !(typeof value === 'number' && value > 0)) {
      return { problem: `${String(value)} is not a real price, so nothing was saved for this. Ask the owner for the price.` }
    }
    if (key.endsWith('_until') && value !== null) {
      const moment = fromLocalTime(value, storeZone(ctx.store))
      if (!moment) return { problem: `${key}: "${String(value)}" is not a time. Nothing was saved for this. Write it in the shop's local time as "YYYY-MM-DD HH:MM".` }
      if (Date.parse(moment) <= now) return { problem: `${key}: ${String(value)} has already passed on the shop's clock, so nothing was saved for this. Check the date and time.` }
      fields[key] = moment
      continue
    }
    const wanted = photoNumbers(value)
    if (wanted.some(number => number > ctx.photos)) {
      return { problem: ctx.photos === 0
        ? 'There is no photo available. Nothing was saved for this. Ask the owner to send one.'
        : `There ${ctx.photos === 1 ? 'is only PHOTO1' : `are only PHOTO1 to PHOTO${ctx.photos}`}. Nothing was saved for this.` }
    }
    if (key === 'image_url' || key === 'images') {
      const saved = readSavedPhotos(ctx, value)
      if (saved.problem) return { problem: saved.problem }
      fields[key] = saved.value
      continue
    }
    fields[key] = value
  }
  return { fields }
}

const HOUR = /^([01]?\d|2[0-3]):([0-5]\d)$/
const SHOP_HOURS = new Set(['opening_time', 'closing_time', 'delivery_from', 'delivery_until'])

/** A phone number the way the site saves it, like +905321234567, or null when it isn't a whole one. A number with no country code is taken as Turkish. */
function readPhone(value: unknown): string | null {
  const typed = latinDigits(String(value ?? '')).replace(/[^\d+]/g, '')
  const digits = typed.replace(/\D/g, '').replace(/^00/, '')
  const international = typed.startsWith('+') || typed.startsWith('00')
  const full = international ? digits : digits.startsWith('0') ? `90${digits.slice(1)}` : digits.length === 10 ? `90${digits}` : digits
  return /^[1-9]\d{10,14}$/.test(full) ? `+${full}` : null
}

/** A date some days before or after a YYYY-MM-DD one. */
function shiftDay(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/**
 * The shop's one-day changes as the model wrote them, checked: real dates from today on, real times.
 * Days already past drop off, so the list never grows old.
 */
function readNewSpecialDays(value: unknown, store: Store, now: number): { list?: Row[]; problem?: string } {
  const shape = 'special_days is the whole list of day changes, like [{"date":"2026-11-08","closed":true,"note":"عزا"}] or [{"date":"2026-11-08","close":"18:00","delivery_from":"21:00"}]; send [] to clear them.'
  if (!Array.isArray(value)) return { problem: `${shape} Nothing was saved for this.` }
  const today = toLocalTime(new Date(now).toISOString(), storeZone(store)).slice(0, 10)
  const last = shiftDay(today, SPECIAL_DAYS_AHEAD)
  const list: Row[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return { problem: `${shape} Nothing was saved for this.` }
    const day = raw as Row
    const date = latinDigits(String(day.date ?? '').trim())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { problem: `"${String(day.date)}" is not a date written as YYYY-MM-DD. Nothing was saved for this.` }
    if (date < today) continue
    if (date > last) return { problem: `${date} is more than ${SPECIAL_DAYS_AHEAD} days away, so nothing was saved for this. A change that far ahead or for good belongs in the store panel.` }
    if (list.some(other => other.date === date)) return { problem: `${date} is in the list twice. Put everything for one day in one entry. Nothing was saved for this.` }

    const entry: Row = { date }
    if (day.closed === true) entry.closed = true
    if (day.delivery_off === true) entry.delivery_off = true
    for (const key of ['open', 'close', 'delivery_from', 'delivery_until']) {
      if (day[key] === undefined || day[key] === null || day[key] === '') continue
      const match = latinDigits(String(day[key]).trim()).match(HOUR)
      if (!match) return { problem: `${date} ${key}: "${String(day[key])}" is not a time written as HH:MM. Nothing was saved for this.` }
      entry[key] = `${match[1].padStart(2, '0')}:${match[2]}`
    }
    if (day.note) entry.note = clean(day.note, 80)
    if (Object.keys(entry).length === 1 || (Object.keys(entry).length === 2 && entry.note)) {
      return { problem: `${date}: nothing about the day changes in this entry. Nothing was saved for this.` }
    }
    list.push(entry)
  }
  if (list.length > MAX_SPECIAL_DAYS) return { problem: `That is more than ${MAX_SPECIAL_DAYS} days of changes, so nothing was saved for this. A change that long belongs in the store panel.` }
  return { list: list.sort((a, b) => String(a.date).localeCompare(String(b.date))) }
}

/** A new price far from the old one is checked with the owner first; it goes through once the assistant has asked about that number. */
function priceJumpProblem(label: string, before: unknown, after: unknown, lastReply = ''): string | null {
  const old = Number(before)
  const next = Number(after)
  if (!(old > 0) || !(next > 0)) return null
  if (next < old * PRICE_JUMP && next > old / PRICE_JUMP) return null
  if (mentionsPrice(lastReply, next)) return null
  return `${label}: the new price ${next} is far from the current ${old}, so it was NOT saved yet. Ask the owner if they really mean ${next}, and save it once they say yes.`
}

const NEW_STORE_FIELDS = ['store_type', 'whatsapp_number', 'latitude', 'longitude', 'opening_time', 'closing_time', 'delivery_radius_km', 'menu_note']

/**
 * A new shop as the admin's message described it. It starts off the home page until it's ready,
 * and its page stays closed until it has a number to take the orders.
 */
function readNewStore(ctx: Context, raw: unknown): { step?: Step; problem?: string } {
  const given = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Row
  const name = clean(given.name, 80)
  if (!name) return { problem: 'A new shop needs a name, so nothing was created. Ask for it.' }
  const slug = String(given.slug ?? '').trim().toLowerCase()
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { problem: `"${String(given.slug)}" can't be the shop's link. Use only latin letters, digits and dashes, like "halwayat-ariha". Nothing was created.` }
  const same = ctx.stores?.find(store => store.slug === slug || normalizeName(store.name) === normalizeName(name))
  if (same) return { problem: `${same.code} "${same.name}" already exists, so nothing was created. Ask if they mean that shop, or use a different name and link.` }

  const wanted = Object.fromEntries(NEW_STORE_FIELDS.filter(key => given[key] !== undefined && given[key] !== null && given[key] !== '').map(key => [key, given[key]]))
  const { fields, problem } = readFields(ctx, 'restaurants', wanted)
  if (!fields) return { problem }
  return {
    step: {
      op: 'create_store',
      label: name,
      fields: { store_type: 'restaurant', ...fields, name, slug, show_on_home: false, whatsapp_number: fields.whatsapp_number ?? '', is_menu_active: Boolean(fields.whatsapp_number) },
    },
  }
}

/** Reads one action. Anything outside this shop comes back as a note the model reads, so it can answer in its own words. */
export function checkAction(ctx: Context, raw: unknown): { step?: Step; problem?: string } {
  const action = (raw && typeof raw === 'object' ? raw : {}) as RawAction
  const op = String(action.op ?? '')
  const record = ctx.records.find(candidate => candidate.code === action.record)

  if (op === 'undo') return { step: { op: 'undo' } }

  if (op === 'create_store') {
    return ctx.isAdmin ? readNewStore(ctx, action.fields) : { problem: 'You cannot create a shop. Only the Alfsouq team can.' }
  }

  if ((op === 'update' || op === 'add') && !ctx.store.id) {
    return { problem: 'No shop is chosen yet, so nothing was saved. Use switch_store or create_store first, or ask which shop they mean.' }
  }

  if (op === 'update') {
    if (!record) return { problem: `${String(action.record)} is not a record in this shop.` }
    const { fields, problem } = readFields(ctx, record.table, action.fields)
    if (!fields) return { problem }
    // A shop opened without a number has its page closed; its first number is what opens it
    if (record.table === 'restaurants' && fields.whatsapp_number && !record.row.whatsapp_number && !('is_menu_active' in fields)) fields.is_menu_active = true
    const before: Row = {}
    for (const key of Object.keys(fields)) {
      if (sameValue(fields[key], record.row[key])) delete fields[key]
      else before[key] = record.row[key] ?? null
    }
    if (Object.keys(fields).length === 0) return { problem: `${labelOf(record.row)}: nothing is different from what is already saved, so nothing changed.` }
    if ('price' in fields || 'offer_price' in fields || 'original_price' in fields) {
      const discount = discountProblem(record.table, { ...record.row, ...fields })
      if (discount) return { problem: discount }
    }
    const priceKey = record.table === 'menu_items' ? 'price' : record.table === 'offers' ? 'offer_price' : null
    if (priceKey && priceKey in fields) {
      const jump = priceJumpProblem(labelOf(record.row), record.row[priceKey], fields[priceKey], ctx.lastReply)
      if (jump) return { problem: jump }
    }
    if (record.table === 'offers') {
      const duplicate = duplicateOfferProblem(ctx, { ...record.row, ...fields }, Object.keys(fields), record.id)
      if (duplicate) return { problem: duplicate }
    }
    return { step: { op: 'update', table: record.table, id: record.id, code: record.code, label: labelOf(record.row), said: clean(action.said_name, 60), fields, before } }
  }

  if (op === 'add') {
    const table = String(action.table ?? '')
    if (table === 'restaurants') return { problem: 'You cannot create a shop. Only the Alfsouq team can.' }
    if (table !== 'categories' && table !== 'menu_items' && table !== 'offers') return { problem: `"${clean(table, 30)}" is not something you can add to.` }
    const { fields, problem } = readFields(ctx, table, action.fields)
    if (!fields) return { problem }
    // Customers would see a product with no price as free
    const priceField = table === 'menu_items' ? 'price' : table === 'offers' ? 'offer_price' : null
    if (priceField && fields[priceField] === undefined) {
      return { problem: `${labelOf(fields)}: it has no price, so it was NOT added. Ask the owner for the price, then add it.` }
    }
    if (table === 'offers' && !fields.original_price) fields.original_price = offerTotal(ctx, fields) || null
    const discount = discountProblem(table, fields)
    if (discount) return { problem: discount }
    if (table === 'offers') {
      const limit = ctx.store.max_offers_limit || 5
      const count = ctx.records.filter(candidate => candidate.table === 'offers').length
      if (count >= limit) return { problem: `This shop has reached its limit of ${limit} offers, which belongs to the Alfsouq team. Nothing was added. They can remove an old offer from their store panel, or ask the team for more.` }
      const duplicate = duplicateOfferProblem(ctx, fields, Object.keys(fields))
      if (duplicate) return { problem: duplicate }
    }
    return { step: { op: 'add', table, label: labelOf(fields), ref: action.ref ? clean(action.ref, 10) : null, fields } }
  }

  if (op === 'delete') {
    return { problem: 'You cannot delete anything, so nothing was deleted. Hide a product with is_hidden true, or stop an offer with is_active false.' }
  }

  return { problem: `"${clean(op, 30)}" is not an action you have.` }
}

export const readActions = (raw: unknown): unknown[] => (Array.isArray(raw) ? raw.slice(0, MAX_ACTIONS) : [])

/** Which photos a value names, as numbers: PHOTO and PHOTO1 are 1, PHOTO2 is 2. */
function photoNumbers(value: unknown): number[] {
  if (typeof value === 'string') {
    const match = value.match(PHOTO_NAME)
    return match ? [Number(match[1] || 1)] : []
  }
  if (Array.isArray(value)) return value.flatMap(photoNumbers)
  if (value && typeof value === 'object') return Object.values(value).flatMap(photoNumbers)
  return []
}

/** The photos a change uses, in order, without repeats. */
export const photosUsed = (step: Step): number[] =>
  step.op === 'update' || step.op === 'add' ? [...new Set(photoNumbers(step.fields))] : []

export const usesPhoto = (step: Step) => photosUsed(step).length > 0

/** Puts each uploaded photo's address wherever the model wrote its name. */
export function withPhoto(fields: Row, urls: Record<number, string>): Row {
  const swap = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const match = value.match(PHOTO_NAME)
      return match ? urls[Number(match[1] || 1)] ?? value : value
    }
    if (Array.isArray(value)) return value.map(swap)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, swap(inner)]))
    return value
  }
  return swap(fields) as Row
}

/** Keeps the model's view of the shop right after a change, so later actions in the same message see it. */
export function applyToContext(ctx: Context, step: Step, saved?: Row): void {
  if (step.op === 'update') {
    const record = ctx.records.find(candidate => candidate.id === step.id)
    if (record) record.row = { ...record.row, ...step.fields }
    if (step.table === 'restaurants') ctx.store = { ...ctx.store, ...step.fields }
  } else if (step.op === 'create_store' && saved) {
    const opened = saved as Store
    ctx.store = opened
    ctx.records = [{ code: 'S', table: 'restaurants', id: opened.id, row: opened }]
    ctx.stores = [...(ctx.stores ?? []), { code: `A${(ctx.stores?.length ?? 0) + 1}`, id: opened.id, name: opened.name, slug: opened.slug }]
  } else if (step.op === 'add' && saved) {
    const prefix = { categories: 'C', menu_items: 'P', offers: 'O' }[step.table]
    const code = step.ref || `${prefix}${ctx.records.filter(record => record.table === step.table).length + 1}`
    ctx.records.push({ code, table: step.table, id: String(saved.id), row: saved })
  }
}

const shortValue = (key: string, value: unknown) => (LINKS.has(key) || key === 'images' ? 'a photo' : JSON.stringify(value))

/** What was saved, for the model's memory of the conversation. */
export function describeForMemory(done: Step[]): string {
  return done.map(step => {
    switch (step.op) {
      case 'update': return `updated ${step.code} ${step.label}: ${Object.entries(step.fields).map(([key, value]) => `${key} ${shortValue(key, step.before[key])} to ${shortValue(key, value)}`).join(', ')}`
      case 'add': return `added to ${step.table}: ${step.label}`
      case 'create_store': return `opened a new shop: ${step.label}`
      case 'undo': return 'took back the last request'
    }
  }).join('; ')
}

const savedPrice = (step: Step): unknown => {
  if (step.op !== 'update' && step.op !== 'add') return undefined
  return step.fields.price ?? step.fields.offer_price
}

/** A plain account for the owner, only used when the model's own words leave something out. */
export function describeForOwner(done: Step[]): string {
  return done.map(step => {
    const price = savedPrice(step)
    switch (step.op) {
      case 'update': return price !== undefined ? `${step.label} صار بـ${money(price)}` : `عدلت ${step.label}`
      case 'add': return price !== undefined ? `ضفت ${step.label} بـ${money(price)}` : `ضفت ${step.label}`
      case 'create_store': return `فتحت متجر جديد: ${step.label}`
      case 'undo': return 'رجعت آخر تعديل'
    }
  }).join('، ')
}

const PANEL_URL = 'https://partner.alfsouq.com'
/** The Alfsouq team's WhatsApp, for anything beyond running the shop. */
const TEAM_WHATSAPP = 'https://wa.me/905352574134'

/** The shop's page for customers, while customers can open it. */
const menuUrl = (store: Store) =>
  store.slug && store.is_menu_active !== false && store.is_subscription_active !== false ? `https://alfsouq.com/m/${store.slug}` : null

/** The only links the assistant may send this owner. */
export const shopLinks = (store: Store): string[] => [menuUrl(store), PANEL_URL, TEAM_WHATSAPP].filter((link): link is string => !!link)

/** How long ago the assistant last sent a link, so it can judge whether sending it again would be too much. */
function lastShared(link: string, history: HistoryEntry[]): string {
  const replies = history.filter(entry => entry.from === 'bot')
  const index = replies.findLastIndex(entry => entry.text.includes(link))
  if (index < 0) return 'not shared in the recent conversation'
  const ago = replies.length - 1 - index
  return ago === 0 ? 'you shared it in your last message' : `you shared it ${ago + 1} messages ago`
}

function shopLinkLines(store: Store, history: HistoryEntry[] = []): string {
  const menu = menuUrl(store)
  return [
    menu ? `Shop page for customers: ${menu} (${lastShared(menu, history)})` : 'Shop page: not open to customers right now, so do not share it.',
    `Store panel: ${PANEL_URL} (${lastShared(PANEL_URL, history)})`,
    `The Alfsouq team on WhatsApp: ${TEAM_WHATSAPP} (number +90 535 257 41 34)`,
  ].join('\n')
}

const URL_PATTERN = /https?:\/\/[^\s]+/gi

/**
 * The model's message to the owner, or an empty string if it can't be sent as it is.
 * Lines and *bold* are kept for WhatsApp; the only links allowed are the shop's own.
 */
export function safeReply(value: unknown, allowedLinks: string[] = [], maxLength = 1500): string {
  const reply = String(value ?? '')
    .replace(/\r/g, '')
    .replace(/\*\*/g, '*')
    .replace(/`/g, '')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
  const links = reply.match(URL_PATTERN) ?? []
  const allowed = links.every(link => allowedLinks.includes(link.replace(/[.,،!?؟:;)]+$/, '')))
  return !allowed || /www\.|\.com/i.test(reply.replace(URL_PATTERN, '')) ? '' : reply
}

/** True when a message says something was changed. Only used to catch a claim with nothing behind it. */
export function claimsSave(reply: string): boolean {
  const said = normalizeName(reply)
  return /(خفيت|خفينا|اخفيت|اخفينا|عدلت|عدلنا|عدلتلك|ضفت|ضفنا|ضفتلك|نزلت|نزلنا|حطيت|حطينا|غيرت|غيرنا|حذفت|حذفنا|شلت|شلنا|رجعت|رجعنا|سجلت|سجلنا|صار السعر)/.test(said)
    || /(^|\s)تم(ت)?(\s|$)/.test(said)
}

function mentionsPrice(reply: string, price: unknown): boolean {
  const number = String(price).replace('.', '\\.')
  return new RegExp(`(^|[^\\d.])${number}($|[^\\d])`).test(latinDigits(reply))
}

/**
 * The owner must hear the real price that was saved. The model's words stay as they are
 * unless they leave one out, then the saved value is added after them.
 */
export function withFacts(reply: string, done: Step[]): string {
  if (!reply) return describeForOwner(done)
  const missing = done.filter(step => {
    const price = savedPrice(step)
    return price !== undefined && !mentionsPrice(reply, price)
  })
  return missing.length ? `${reply}\n${describeForOwner(missing)}` : reply
}

const hasPhoto = (fields: Row) => savedPhotos(fields).length > 0

/** A few ways of asking, so the same sentence doesn't come back every time. */
const PHOTO_QUESTIONS = {
  one: [
    'ما وصلتني صورة إلها، عندك وحدة؟',
    'لسا بدون صورة، إذا عندك صورة إلها ابعتلي ياها.',
    'وإذا في عندك صورة إلها ابعتها، بتفرق كتير عند الزباين.',
    'هي هلق بدون صورة، فيك تبعتلي وحدة إذا عندك.',
  ],
  many: [
    'ما وصلتني صور إلهن، عندك؟',
    'لسا بدون صور، إذا عندك صور إلهن ابعتلي ياهن.',
    'وإذا في عندك صور إلهن ابعتهن، بتفرق كتير عند الزباين.',
  ],
}

/**
 * A product added with no photo always gets asked about, once, in the same message.
 * The model's own question is kept when it asked; otherwise one short line is added.
 */
export function withPhotoQuestion(reply: string, done: Step[], random: () => number = Math.random): string {
  const bare = done.filter(step => step.op === 'add' && step.table === 'menu_items' && !hasPhoto(step.fields))
  if (bare.length === 0 || /صور/.test(normalizeName(reply))) return reply
  const choices = bare.length > 1 ? PHOTO_QUESTIONS.many : PHOTO_QUESTIONS.one
  return `${reply}\n${choices[Math.floor(random() * choices.length)]}`
}

/** True while the owner and the assistant are mid-conversation, like two people already texting. */
export function isOngoing(lastActivity: string | null | undefined, now: number): boolean {
  if (!lastActivity) return false
  return now - new Date(lastActivity).getTime() < CONVERSATION_GAP_MINUTES * 60_000
}

/**
 * How long to wait before replying, in seconds. A person takes a while to notice a first
 * message, then answers quickly once they're talking, and the times are never all the same.
 */
export function replyDelay(reply: string, ongoing: boolean, random: () => number = Math.random): number {
  if (ongoing) return Math.round(1 + random() * 2 + Math.min(reply.length / 60, 2))
  return Math.round(8 + random() * 17 + Math.min(reply.length / 12, 10))
}

/**
 * Store owners are recognised from the site's own records, the same way they log in.
 * Extra rows can add a store for a number, or switch the assistant off for one.
 */
export function allowedStoreIds(ownedIds: (string | null)[], overrides: { store_id: string; enabled: boolean }[]): string[] {
  const allowed = new Set(ownedIds.filter((id): id is string => !!id))
  for (const { store_id, enabled } of overrides) {
    if (enabled) allowed.add(store_id)
    else allowed.delete(store_id)
  }
  return [...allowed]
}

function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    row = next
  }
  return row[b.length]
}

export interface StorePick {
  storeId: string | null
  /** The message to act on: a held one once the store is known. */
  text: string
  held: string | null
  reply: string | null
  switched: boolean
}

/** Works out which store a message is for, when one number manages several. */
export function pickStore(stores: { id: string; name: string }[], currentId: string | null, held: string | null, text: string): StorePick {
  if (stores.length === 1) return { storeId: stores[0].id, text, held: null, reply: null, switched: stores[0].id !== currentId }

  const said = normalizeName(text)
  const digits = latinDigits(said)
  const named = (/^\d+$/.test(digits) && stores[Number(digits) - 1]) || stores.find(store => {
    const name = normalizeName(store.name)
    return said.includes(name) || editDistance(said, name) <= Math.max(1, Math.floor(name.length / 4))
  })

  let current = stores.some(store => store.id === currentId) ? currentId : null
  if (/(غير|بدل).*(متجر|محل)/.test(said) && !named) current = null

  if (named && named.id !== current) {
    if (held) return { storeId: named.id, text: held, held: null, reply: null, switched: true }
    if (said.length <= normalizeName(named.name).length + 4) {
      return { storeId: named.id, text, held: null, reply: `تمام، هلق عم نشتغل على ${named.name}. شو بدك تعدل؟`, switched: true }
    }
    return { storeId: named.id, text, held: null, reply: null, switched: true }
  }

  if (!current) {
    const list = stores.map((store, index) => `${index + 1}. ${store.name}`).join('\n')
    const keep = /(غير|بدل).*(متجر|محل)/.test(said) ? held : text
    return { storeId: null, text, held: keep, reply: `عندك أكتر من متجر، لأي واحد؟\n${list}`, switched: false }
  }

  return { storeId: current, text, held: null, reply: null, switched: false }
}
