import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  PHOTO, allowedStoreIds, applyToContext, buildInput, checkAction, claimsSave, describeForMemory, isOngoing, normalizeName, pickStore, readActions, readMessage, replyDelay, safeReply, usesPhoto, withFacts, withPhoto,
  type Context, type Step, type StoreRecord,
} from '../supabase/functions/store-assistant/logic.ts'

const store = { id: 'store', name: 'متجر', slug: 'store', store_type: 'restaurant', max_offers_limit: 5, subscription_notes: 'سري', phone: '905000000000' }
const records: StoreRecord[] = [
  { code: 'S', table: 'restaurants', id: 'store', row: store },
  { code: 'C1', table: 'categories', id: 'cat-1', row: { name: 'خضار' } },
  { code: 'C2', table: 'categories', id: 'cat-2', row: { name: 'مخبوزات' } },
  { code: 'P1', table: 'menu_items', id: 'item-1', row: { name: 'بندورة حمرا', price: 35, unit: 'kg', category_id: 'cat-1' } },
  { code: 'P2', table: 'menu_items', id: 'item-2', row: { name: 'بندورة كرزية', price: 60, unit: 'kg', category_id: 'cat-1' } },
  { code: 'P3', table: 'menu_items', id: 'item-3', row: { name: 'خبز', price: 10, unit: 'piece', category_id: 'cat-2', image_url: 'bread.jpg', images: ['bread.jpg'] } },
]

const ctx = (changes: Partial<Context> = {}): Context => ({ store, records: records.map(record => ({ ...record })), photo: null, ...changes })

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
    assert.equal((readMessage(body({ from: '1@lid' }), now) as any).lid, '1@lid')
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

describe('keeping the agent inside its own shop', () => {
  test('it can change any field it decides to', () => {
    assert.deepEqual(checkAction(ctx(), { op: 'update', record: 'P1', said_name: 'بندره', fields: { price: 40, description: 'طازة' } }).step, {
      op: 'update', table: 'menu_items', id: 'item-1', code: 'P1', label: 'بندورة حمرا', said: 'بندره', fields: { price: 40, description: 'طازة' }, before: { price: 35, description: null },
    })
    assert.ok(checkAction(ctx(), { op: 'update', record: 'S', fields: { closing_time: '22:00', holiday_message: 'راجعين السبت' } }).step)
  })

  test('there are no price rules: the model\'s judgement decides', () => {
    assert.ok(checkAction(ctx(), { op: 'update', record: 'P1', fields: { price: 3500 } }).step)
  })

  test('nothing is saved without a real price', () => {
    assert.match(checkAction(ctx(), { op: 'add', table: 'menu_items', fields: { name: 'تفاح', category_id: 'C1' } }).problem!, /no price/)
    assert.match(checkAction(ctx(), { op: 'add', table: 'menu_items', fields: { name: 'تفاح', price: 0, category_id: 'C1' } }).problem!, /not a real price/)
    assert.match(checkAction(ctx(), { op: 'add', table: 'offers', fields: { title: 'عرض' } }).problem!, /no price/)
    for (const price of [0, -5, null, '40']) {
      assert.match(checkAction(ctx(), { op: 'update', record: 'P1', fields: { price } }).problem!, /not a real price/)
    }
    assert.ok(checkAction(ctx(), { op: 'add', table: 'categories', fields: { name: 'مشروبات' } }).step)
  })

  test('an offer must be cheaper than the product', () => {
    const offer = (fields: object) => checkAction(ctx(), { op: 'add', table: 'offers', fields: { title: 'عرض', primary_item_id: 'P1', ...fields } })
    assert.match(offer({ offer_price: 35 }).problem!, /not below the original price 35/)
    assert.match(offer({ offer_price: 40 }).problem!, /not below/)
    assert.match(offer({ offer_price: 20, original_price: 15 }).problem!, /not below/)
    assert.equal((offer({ offer_price: 30 }).step as any).fields.original_price, 35)
    assert.equal((offer({ offer_price: 30, primary_item_id: 'P1', min_quantity: 2 }).step as any).fields.original_price, 70)
    assert.equal((offer({ offer_price: 300, original_price: 333 }).step as any).fields.original_price, 333)
  })

  test('changing an offer keeps it cheaper, and other changes to it still work', () => {
    const offers: StoreRecord[] = [{ code: 'O1', table: 'offers', id: 'o1', row: { title: 'قديم', offer_price: 15, original_price: 0 } }, { code: 'O2', table: 'offers', id: 'o2', row: { title: 'عرض', offer_price: 80, original_price: 100 } }]
    const context = ctx({ records: [...records, ...offers] })
    assert.ok(checkAction(context, { op: 'update', record: 'O1', fields: { is_active: false } }).step)
    assert.match(checkAction(context, { op: 'update', record: 'O2', fields: { offer_price: 100 } }).problem!, /not below/)
    assert.ok(checkAction(context, { op: 'update', record: 'O2', fields: { offer_price: 90 } }).step)
  })

  test('a crossed-out price on a product must be above its price', () => {
    assert.match(checkAction(ctx(), { op: 'update', record: 'P1', fields: { original_price: 30 } }).problem!, /crossed-out/)
    assert.ok(checkAction(ctx(), { op: 'update', record: 'P1', fields: { original_price: 40 } }).step)
    const discounted = ctx({ records: [{ code: 'P1', table: 'menu_items', id: 'x', row: { name: 'y', price: 80, original_price: 100 } }] })
    assert.match(checkAction(discounted, { op: 'update', record: 'P1', fields: { price: 120 } }).problem!, /crossed-out/)
    assert.ok(checkAction(discounted, { op: 'update', record: 'P1', fields: { price: 120, original_price: null } }).step)
  })

  test('a shop cannot be created or deleted', () => {
    assert.match(checkAction(ctx(), { op: 'add', table: 'restaurants', fields: { name: 'x' } }).problem!, /cannot create a shop/)
    assert.match(checkAction(ctx(), { op: 'delete', record: 'S' }).problem!, /cannot delete/)
  })

  test('nothing can be deleted: a product is hidden and an offer is stopped instead', () => {
    for (const record of ['P1', 'C1', 'S']) {
      const { step, problem } = checkAction(ctx(), { op: 'delete', record })
      assert.equal(step, undefined)
      assert.match(problem!, /is_hidden true/)
    }
    assert.deepEqual((checkAction(ctx(), { op: 'update', record: 'P1', fields: { is_hidden: true } }).step as any).fields, { is_hidden: true })
  })

  test('another shop\'s records are out of reach', () => {
    assert.match(checkAction(ctx(), { op: 'update', record: 'P99', fields: { price: 1 } }).problem!, /not a record/)
    assert.match(checkAction(ctx(), { op: 'update', record: 'P1', fields: { category_id: 'other-store-category' } }).problem!, /not part of this shop/)
    assert.match(checkAction(ctx(), { op: 'add', table: 'offers', fields: { title: 'x', offer_price: 1, primary_item_id: 'other-store-item' } }).problem!, /not part of this shop/)
  })

  test('a record cannot be moved to another shop or given a new identity', () => {
    const { step } = checkAction(ctx(), { op: 'update', record: 'C1', fields: { name: 'جديد', restaurant_id: 'other-store', id: 'x', created_at: 'y' } }) as any
    assert.deepEqual(step.fields, { name: 'جديد' })
    const added = checkAction(ctx(), { op: 'add', table: 'offers', fields: { title: 'x', offer_price: 1, original_price: 2, restaurant_id: 'other-store' } }).step as any
    assert.deepEqual(added.fields, { title: 'x', offer_price: 1, original_price: 2 })
  })

  test('only tables of the shop can be used', () => {
    for (const table of ['profiles', 'orders', 'assistant_numbers']) {
      assert.match(checkAction(ctx(), { op: 'add', table, fields: { role: 'admin' } }).problem!, /not something you can add to/)
    }
  })

  test('what the panel keeps for admins stays out of reach', () => {
    for (const key of ['slug', 'is_subscription_active', 'is_menu_active', 'subscription_notes', 'max_offers_limit', 'show_on_home', 'name', 'phone', 'whatsapp_number', 'latitude', 'longitude', 'store_type']) {
      assert.match(checkAction(ctx(), { op: 'update', record: 'S', fields: { [key]: true } }).problem!, /belongs to the Alfsouq team/)
    }
  })

  test('the shop\'s offer limit holds, as it does in the panel', () => {
    const offers = Array.from({ length: 5 }, (_, i) => ({ code: `O${i + 1}`, table: 'offers' as const, id: `o${i}`, row: { title: 'x' } }))
    assert.match(checkAction(ctx({ records: [...records, ...offers] }), { op: 'add', table: 'offers', fields: { title: 'x', offer_price: 1, original_price: 2 } }).problem!, /limit of 5/)
    assert.ok(checkAction(ctx(), { op: 'add', table: 'offers', fields: { title: 'x', offer_price: 1, primary_item_id: 'P1' } }).step)
  })

  test('codes become real ids, and a record added earlier can be used by its ref', () => {
    const added = checkAction(ctx(), { op: 'add', table: 'menu_items', fields: { name: 'بطاطا', price: 20, category_id: 'C2' } }).step as any
    assert.equal(added.fields.category_id, 'cat-2')

    const context = ctx()
    const category = checkAction(context, { op: 'add', table: 'categories', ref: 'N1', fields: { name: 'مشروبات' } }).step!
    applyToContext(context, category, { id: 'new-cat', name: 'مشروبات' })
    const product = checkAction(context, { op: 'add', table: 'menu_items', fields: { name: 'عصير', price: 5, category_id: 'N1' } }).step as any
    assert.equal(product.fields.category_id, 'new-cat')
  })

  test('later actions see what earlier ones changed', () => {
    const context = ctx()
    const step = checkAction(context, { op: 'update', record: 'P1', fields: { price: 40 } }).step!
    applyToContext(context, step)
    assert.match(checkAction(context, { op: 'update', record: 'P1', fields: { price: 40 } }).problem!, /nothing is different/)
  })

  test('the same value changes nothing, even when the database wrote it as text', () => {
    const context = ctx({ records: [{ code: 'P1', table: 'menu_items', id: 'x', row: { name: 'y', price: '35.00' } }] })
    assert.match(checkAction(context, { op: 'update', record: 'P1', fields: { price: 35 } }).problem!, /nothing is different/)
  })

  test('a photo can only be used when there is one, and goes wherever the model put it', () => {
    const fields = { image_url: PHOTO, images: [PHOTO] }
    assert.match(checkAction(ctx(), { op: 'update', record: 'P1', fields }).problem!, /no photo/)
    const { step } = checkAction(ctx({ photo: 'new' }), { op: 'update', record: 'P1', fields })
    assert.equal(usesPhoto(step!), true)
    assert.deepEqual(withPhoto(fields, 'https://x/a.jpg'), { image_url: 'https://x/a.jpg', images: ['https://x/a.jpg'] })
  })

  test('anything that is not a real action does nothing', () => {
    assert.deepEqual(readActions('delete everything'), [])
    assert.match(checkAction(ctx(), { op: 'run_sql', sql: 'drop table offers' }).problem!, /not an action/)
    assert.match(checkAction(ctx(), null).problem!, /not an action/)
    assert.match(checkAction(ctx(), { op: 'update', record: 'P1', fields: 'price=1' }).problem!, /must be an object/)
  })
})

describe('what the owner is told', () => {
  const saved: Step = { op: 'update', table: 'menu_items', id: 'item-1', code: 'P1', label: 'بندورة حمرا', said: '', fields: { price: 40 }, before: { price: 35 } }

  test('the model\'s words are sent as they are when they hold the real price', () => {
    assert.equal(withFacts('تكرم، صارت البندورة بـ40', [saved]), 'تكرم، صارت البندورة بـ40')
    assert.equal(withFacts('تكرم، صارت البندورة بـ٤٠', [saved]), 'تكرم، صارت البندورة بـ٤٠')
  })

  test('a saved price the model left out or got wrong is added', () => {
    assert.match(withFacts('تكرم عيونك', [saved]), /صار بـ40 ₺/)
    assert.match(withFacts('صارت بـ400', [saved]), /صار بـ40 ₺/)
  })

  test('changes without a price need no addition', () => {
    const hours: Step = { op: 'update', table: 'restaurants', id: 'store', code: 'S', label: 'متجر', said: '', fields: { closing_time: '22:00' }, before: { closing_time: '23:00' } }
    assert.equal(withFacts('صرنا نسكر عالعشرة', [hours]), 'صرنا نسكر عالعشرة')
  })

  test('an empty reply still reports what was saved', () => {
    assert.match(withFacts('', [saved]), /بندورة حمرا صار بـ40 ₺/)
  })

  test('a claim of a change is noticed, and ordinary talk is not', () => {
    for (const said of ['عدلت السعر', 'تم الحفظ', 'ضفتلك ياه', 'تمت']) assert.equal(claimsSave(said), true, said)
    for (const said of ['أهلين', 'تمام', 'قديش السعر؟', 'كيفك اليوم']) assert.equal(claimsSave(said), false, said)
  })

  test('links never reach the owner', () => {
    assert.equal(safeReply('شوف https://bad.example'), '')
    assert.equal(safeReply('أهلين *فيك*'), 'أهلين فيك')
  })

  test('the model remembers what really changed', () => {
    assert.match(describeForMemory([saved]), /updated P1 بندورة حمرا: price 35 to 40/)
    assert.match(describeForMemory([{ op: 'undo' }]), /took back/)
  })
})

describe('reply timing', () => {
  const now = Date.parse('2026-11-04T12:00:00Z')

  test('a conversation counts as ongoing for a while after the last message', () => {
    assert.equal(isOngoing('2026-11-04T11:55:00Z', now), true)
    assert.equal(isOngoing('2026-11-04T11:30:00Z', now), false)
    assert.equal(isOngoing(null, now), false)
  })

  test('the first message waits a while, for a varied time', () => {
    const waits = Array.from({ length: 50 }, () => replyDelay('تكرم', false))
    assert.ok(new Set(waits).size > 3)
    assert.ok(Math.min(...waits) >= 8)
    assert.ok(replyDelay('x'.repeat(5000), false, () => 0.99) <= 35)
  })

  test('replies in an ongoing conversation go out quickly, and still vary', () => {
    const waits = Array.from({ length: 50 }, () => replyDelay('تكرم', true))
    assert.ok(new Set(waits).size > 1)
    assert.ok(Math.min(...waits) >= 1)
    assert.ok(replyDelay('x'.repeat(5000), true, () => 0.99) <= 5)
  })
})

describe('what the model is given', () => {
  const input = buildInput(
    ctx(),
    [{ said: 'طماطم', menu_item_id: 'item-1' }],
    [{ from: 'owner', text: 'بدي غير البندورة' }, { from: 'bot', text: 'تكرم', did: 'updated P1' }],
    'صار 50',
    'Wednesday 09:30',
  )

  test('it holds the shop, the conversation and what was really saved', () => {
    assert.match(input, /طماطم means P1/)
    assert.match(input, /Owner: بدي غير البندورة/)
    assert.match(input, /Did: updated P1/)
    assert.match(input, /P2 \{[^}]*"price":60/)
    assert.match(input, /Wednesday 09:30/)
  })

  test('it writes links to other records as codes, and leaves out long values and private notes', () => {
    assert.match(input, /P1 \{[^}]*"category_id":"C1"/)
    assert.ok(!input.includes('cat-1'))
    assert.ok(!input.includes('bread.jpg'))
    assert.ok(!input.includes('سري'))
    assert.ok(!input.includes('905'))
  })

  test('names are compared loosely', () => {
    assert.equal(normalizeName(' البنَدورة  الحمراء '), normalizeName('البندورة الحمراء'))
    assert.equal(normalizeName('شاورمة'), normalizeName('شاورمه'))
  })
})

describe('recognising store owners', () => {
  test('an owner is recognised with no extra setup', () => {
    assert.deepEqual(allowedStoreIds(['a'], []), ['a'])
  })

  test('the same store found twice counts once', () => {
    assert.deepEqual(allowedStoreIds(['a', 'a', null], []), ['a'])
  })

  test('someone with no store gets nothing', () => {
    assert.deepEqual(allowedStoreIds([null], []), [])
  })

  test('a store can be added for a number, or switched off', () => {
    assert.deepEqual(allowedStoreIds(['a'], [{ store_id: 'b', enabled: true }]), ['a', 'b'])
    assert.deepEqual(allowedStoreIds(['a'], [{ store_id: 'a', enabled: false }]), [])
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
