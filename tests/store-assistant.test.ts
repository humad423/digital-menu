import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  UPLOADED_IMAGE, buildInput, decide, describeDone, normalizeName, pickStore, readMessage,
  type Context, type Pending,
} from '../supabase/functions/store-assistant/logic.ts'

const products = [
  { code: 'P1', id: 'item-1', name: 'بندورة حمرا', price: 35, unit: 'kg', original_price: null, image_url: null },
  { code: 'P2', id: 'item-2', name: 'بندورة كرزية', price: 60, unit: 'kg', original_price: null, image_url: null },
  { code: 'P3', id: 'item-3', name: 'خبز', price: 10, unit: 'piece', original_price: null, image_url: 'bread.jpg' },
]
const categories = [{ code: 'C1', id: 'cat-1', name: 'خضار' }, { code: 'C2', id: 'cat-2', name: 'مخبوزات' }]

const ctx = (changes: Partial<Context> = {}): Context => ({
  store: { id: 'store', name: 'متجر', slug: 'store', store_type: 'restaurant', max_offers_limit: 5 },
  products,
  categories,
  pending: null,
  hasImage: false,
  offerCount: 0,
  ...changes,
})
const change = (fields = {}) => ({ said_name: 'بندره', product: 'P1', possible: [], price: 40, before_price: null, unit: null, category: null, ...fields })
const parsed = (intent: string, changes: unknown[] = [], reply = 'رد طبيعي') => ({ heard: 'x', intent, changes, reply })

describe('reading WAHA messages', () => {
  const now = 1_800_000_000
  const body = (payload = {}, extra = {}) => ({
    event: 'message', session: 'default',
    payload: { id: 'm1', timestamp: now, from: '905000000000@c.us', fromMe: false, body: 'مرحبا', hasMedia: false, ...payload },
    ...extra,
  })

  test('reads a normal message', () => {
    const message = readMessage(body(), now) as any
    assert.equal(message.phone, '905000000000')
    assert.equal(message.text, 'مرحبا')
  })

  test('finds the real number behind @lid when it is sent', () => {
    const message = readMessage(body({ from: '1@lid', _data: { Info: { SenderAlt: '905000000000:12@s.whatsapp.net' } } }), now) as any
    assert.equal(message.phone, '905000000000')
    assert.equal(readMessage(body({ from: '1@lid' }), now).lid, '1@lid')
  })

  test('ignores the bot, groups, statuses, old messages and other events', () => {
    for (const ignored of [
      body({ fromMe: true }), body({ from: '1@g.us' }), body({ from: 'status@broadcast' }),
      body({ timestamp: now - 3600 }), body({}, { event: 'session.status' }), {},
    ]) {
      assert.ok('ignored' in readMessage(ignored, now))
    }
  })

  test('reads media details', () => {
    const message = readMessage(body({ hasMedia: true, media: { url: 'http://x/a.ogg', mimetype: 'audio/ogg' } }), now) as any
    assert.equal(message.mimeType, 'audio/ogg')
  })
})

describe('changing prices', () => {
  test('a clear change saves straight away, without asking', () => {
    const decision = decide(ctx(), parsed('update_price', [change()]))
    assert.deepEqual(decision.actions, [{ type: 'update_price', id: 'item-1', name: 'بندورة حمرا', said: 'بندره', price: 40 }])
    assert.equal(decision.reply, null)
    assert.equal(decision.pending, null)
    assert.equal(describeDone(decision.actions), 'تمام، عدلت بندورة حمرا لـ40 ₺ 👍')
  })

  test('a very different price asks first, then saves on yes', () => {
    const decision = decide(ctx(), parsed('update_price', [change({ price: 400 })]))
    assert.equal(decision.actions.length, 0)
    assert.match(decision.reply!, /كان 35 ₺، أكيد بدك تخليه 400 ₺/)
    const yes = decide(ctx({ pending: decision.pending }), parsed('confirm'))
    assert.equal((yes.actions[0] as any).price, 400)
    assert.equal(yes.pending, null)
  })

  test('unsure between two products asks which one', () => {
    const decision = decide(ctx(), parsed('update_price', [change({ product: null, possible: ['P1', 'P2'] })]))
    assert.equal(decision.reply, 'قصدك بندورة حمرا ولا بندورة كرزية؟')
    assert.equal(decision.actions.length, 0)
  })

  test('one close guess asks before saving', () => {
    const decision = decide(ctx(), parsed('update_price', [change({ product: null, possible: ['P1'] })]))
    assert.match(decision.reply!, /قصدك بندورة حمرا/)
    assert.equal(decision.actions.length, 0)
    assert.equal(decision.pending!.type, 'confirm_prices')
  })

  test('a missing price asks in the model\'s natural words', () => {
    const decision = decide(ctx(), parsed('update_price', [change({ price: null })], 'قديش صار سعرها؟'))
    assert.equal(decision.reply, 'قديش صار سعرها؟')
  })

  test('the same price changes nothing', () => {
    const decision = decide(ctx(), parsed('update_price', [change({ price: 35 })]))
    assert.equal(decision.actions.length, 0)
    assert.match(decision.reply!, /هو نفسه/)
  })

  test('a code outside this store is not trusted', () => {
    const decision = decide(ctx(), parsed('update_price', [change({ said_name: 'شي', product: 'P99', price: 20 })]))
    assert.equal(decision.actions.length, 0)
    assert.match(decision.reply!, /ما لقيت شي بمنتجاتك/)
  })

  test('several clear changes save together, and an unknown one is asked about', () => {
    const decision = decide(ctx(), parsed('update_price', [change(), change({ said_name: 'بطاطا', product: null, price: 20 })]))
    assert.equal(decision.actions.length, 1)
    assert.match(decision.reply!, /ما لقيت بطاطا/)
    assert.equal(decision.pending!.type, 'offer_new_product')
  })
})

describe('adding a product', () => {
  const add = (fields = {}) => change({ said_name: 'بطاطا', product: null, price: 20, category: 'C1', ...fields })

  test('asks once for a photo, and adds without one when told', () => {
    const asked = decide(ctx(), parsed('add_product', [add()]))
    assert.match(asked.reply!, /صورة لـبطاطا/)
    const skipped = decide(ctx({ pending: asked.pending }), parsed('skip_image'))
    assert.equal(skipped.actions[0].type, 'add_product')
    assert.equal((skipped.actions[0] as any).image_url, null)
  })

  test('a photo completes it', () => {
    const asked = decide(ctx(), parsed('add_product', [add()]))
    const done = decide(ctx({ pending: asked.pending, hasImage: true }), parsed('chat'))
    assert.equal((done.actions[0] as any).image_url, UPLOADED_IMAGE)
  })

  test('asks only for what is missing, in order', () => {
    const noPrice = decide(ctx(), parsed('add_product', [add({ price: null })]))
    assert.match(noPrice.reply!, /قديش سعر بطاطا/)
    const withPrice = decide(ctx({ pending: noPrice.pending }), parsed('update_price', [change({ said_name: '', product: null, price: 20 })]))
    assert.match(withPrice.reply!, /صورة/)
  })

  test('asks for the category when several exist, and uses the only one otherwise', () => {
    assert.match(decide(ctx(), parsed('add_product', [add({ category: null })])).reply!, /بأي قسم/)
    const one = decide(ctx({ categories: [categories[0]] }), parsed('add_product', [add({ category: null })]))
    assert.equal((one.pending as any).category_id, 'cat-1')
  })

  test('a supermarket needs a price before the discount', () => {
    const market = ctx({ store: { ...ctx().store, store_type: 'supermarket' } })
    assert.match(decide(market, parsed('add_product', [add()])).reply!, /قبل الخصم/)
  })

  test('yes to adding an unknown product starts it', () => {
    const offered: Pending = { type: 'offer_new_product', name: 'بطاطا', said: 'بطاطا', price: 20, unit: null }
    assert.match(decide(ctx({ pending: offered }), parsed('confirm')).reply!, /بأي قسم/)
  })
})

describe('offers', () => {
  const offer = (fields = {}) => change({ said_name: 'خبز', product: 'P3', price: 8, ...fields })

  test('uses the current price as the old one and saves straight away', () => {
    const decision = decide(ctx(), parsed('add_offer', [offer()]))
    assert.deepEqual(decision.actions[0], { type: 'store_offer', item_id: 'item-3', name: 'خبز', price: 8, before_price: 10, image_url: 'bread.jpg' })
    assert.match(describeDone(decision.actions), /نزلت عرض خبز بـ8 ₺ بدل 10 ₺/)
  })

  test('a supermarket offer goes on the product itself', () => {
    const market = ctx({ store: { ...ctx().store, store_type: 'supermarket' } })
    assert.equal(decide(market, parsed('add_offer', [offer()])).actions[0].type, 'item_offer')
  })

  test('asks for what is missing', () => {
    assert.match(decide(ctx(), parsed('add_offer', [offer({ price: null })])).reply!, /سعر العرض/)
    assert.match(decide(ctx(), parsed('add_offer', [offer({ price: 50 })])).reply!, /قبل العرض/)
  })

  test('respects the store\'s limit', () => {
    const decision = decide(ctx({ offerCount: 5 }), parsed('add_offer', [offer()]))
    assert.equal(decision.actions.length, 0)
    assert.match(decision.reply!, /حد العروض/)
  })
})

describe('one number with several stores', () => {
  const stores = [{ id: 'a', name: 'سوبر ماركت النور' }, { id: 'b', name: 'مطعم الأصيل' }]

  test('one store goes straight on', () => {
    assert.equal(pickStore([stores[0]], null, null, 'الخبز ب5').storeId, 'a')
  })

  test('asks once, keeps the message, and acts on it after the answer', () => {
    const first = pickStore(stores, null, null, 'الخبز ب5')
    assert.equal(first.storeId, null)
    assert.match(first.reply!, /لأي واحد/)
    const second = pickStore(stores, null, first.held, 'مطعم الاصيل')
    assert.equal(second.storeId, 'b')
    assert.equal(second.text, 'الخبز ب5')
    assert.equal(second.reply, null)
  })

  test('understands a number, Arabic digits and a spelling mistake', () => {
    assert.equal(pickStore(stores, null, 'x', '٢').storeId, 'b')
    assert.equal(pickStore(stores, null, 'x', '1').storeId, 'a')
    assert.equal(pickStore(stores, null, 'x', 'مطعم الاصل').storeId, 'b')
  })

  test('stays on the chosen store, and can switch', () => {
    assert.equal(pickStore(stores, 'b', null, 'الخبز ب5').storeId, 'b')
    assert.equal(pickStore(stores, 'b', null, 'بدي غير المتجر').storeId, null)
    assert.equal(pickStore(stores, 'b', null, 'سوبر ماركت النور الخبز ب5').storeId, 'a')
  })
})

describe('conversation', () => {
  test('the model cannot announce a save or send links', () => {
    assert.equal(decide(ctx(), parsed('confirm', [], 'تم الحفظ')).reply, 'تمام، شو بدك نعدل؟')
    assert.match(decide(ctx(), parsed('chat', [], 'شوف https://bad.example')).reply!, /ما فهمت/)
  })

  test('a greeting keeps what is in progress', () => {
    const pending: Pending = { type: 'image_for', item_id: 'item-3', name: 'خبز' }
    const decision = decide(ctx({ pending }), parsed('chat', [], 'أهلين'))
    assert.equal(decision.reply, 'أهلين')
    assert.deepEqual(decision.pending, pending)
  })

  test('undo and cancel', () => {
    assert.equal(decide(ctx(), parsed('undo')).actions[0].type, 'undo')
    const pending: Pending = { type: 'image_for', item_id: 'item-3', name: 'خبز' }
    assert.equal(decide(ctx({ pending }), parsed('cancel')).pending, null)
  })

  test('a photo for an existing product', () => {
    const decision = decide(ctx({ hasImage: true }), parsed('set_image', [change({ said_name: 'خبز', product: 'P3', price: null })]))
    assert.equal(decision.actions[0].type, 'set_image')
    assert.equal(decide(ctx({ hasImage: true }), parsed('set_image', [])).reply, 'لأي منتج هالصورة؟')
  })

  test('the input holds the conversation but no phone number', () => {
    const input = buildInput(ctx(), [{ said: 'طماطم', menu_item_id: 'item-1' }], [{ from: 'owner', text: 'بدي غير البندورة' }], 'صار 50')
    assert.match(input, /طماطم means P1/)
    assert.match(input, /Owner: بدي غير البندورة/)
    assert.match(input, /P2 \| بندورة كرزية \| 60 \| kg/)
    assert.ok(!input.includes('905'))
  })

  test('names are compared loosely', () => {
    assert.equal(normalizeName(' البنَدورة  الحمراء '), normalizeName('البندورة الحمراء'))
    assert.equal(normalizeName('شاورمة'), normalizeName('شاورمه'))
  })
})
