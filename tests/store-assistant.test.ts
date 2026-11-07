import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  allowedStoreIds, applyToContext, buildInput, checkAction, claimsSave, describeForMemory, describePieces, fromLocalTime, isOngoing, noticeLines, normalizeName,
  photosUsed, pickStore, pieceKind, readActions, readLooks, readMessage, titleUse, toLocalTime, replyDelay, safeReply, shopLinks, storeLocalTime, usesPhoto, withPhotoQuestion, withFacts, withPhoto,
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

const ctx = (changes: Partial<Context> = {}): Context => ({ store, records: records.map(record => ({ ...record })), photos: 0, ...changes })

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

  test('any price goes through once the owner was asked about it', () => {
    assert.ok(checkAction(ctx({ lastReply: 'أكيد بدك ياها بـ 3500؟' }), { op: 'update', record: 'P1', fields: { price: 3500 } }).step)
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
    for (const key of ['slug', 'is_subscription_active', 'is_menu_active', 'subscription_notes', 'max_offers_limit', 'show_on_home', 'name', 'phone', 'whatsapp_number', 'latitude', 'longitude', 'store_type', 'timezone']) {
      assert.match(checkAction(ctx(), { op: 'update', record: 'S', fields: { [key]: true } }).problem!, /belongs to the Alfsouq team/)
    }
  })

  test('the shop\'s offer limit holds, as it does in the panel', () => {
    const offers = Array.from({ length: 5 }, (_, i) => ({ code: `O${i + 1}`, table: 'offers' as const, id: `o${i}`, row: { title: 'x' } }))
    assert.match(checkAction(ctx({ records: [...records, ...offers] }), { op: 'add', table: 'offers', fields: { title: 'x', offer_price: 1, original_price: 2 } }).problem!, /limit of 5/)
    assert.ok(checkAction(ctx(), { op: 'add', table: 'offers', fields: { title: 'x', offer_price: 1, primary_item_id: 'P1' } }).step)
  })

  test('an offer cannot repeat another one\'s products or name, hidden ones included', () => {
    const offers: StoreRecord[] = [
      { code: 'O1', table: 'offers', id: 'o1', row: { title: 'بندورة مع خبز', offer_price: 40, original_price: 45, primary_item_id: 'item-1', min_quantity: 1, bonus_item_id: 'item-3', bonus_quantity: 1, is_active: false } },
      { code: 'O2', table: 'offers', id: 'o2', row: { title: 'كيلو كرزية', offer_price: 50, original_price: 60, primary_item_id: 'item-2', min_quantity: 1 } },
    ]
    const context = ctx({ records: [...records, ...offers] })
    const add = (fields: object) => checkAction(context, { op: 'add', table: 'offers', fields: { offer_price: 30, ...fields } })

    assert.match(add({ title: 'عرض جديد', primary_item_id: 'P3', bonus_item_id: 'P1' }).problem!, /O1 .*hidden.*exactly these products/)
    assert.match(add({ title: 'كيلو  كرزيه', primary_item_id: 'P1', min_quantity: 2 }).problem!, /O2 is already called/)
    assert.ok(add({ title: 'عرض جديد', primary_item_id: 'P1', bonus_item_id: 'P3', bonus_quantity: 2 }).step, 'a different amount is a different offer')

    assert.match(checkAction(context, { op: 'update', record: 'O2', fields: { bonus_item_id: 'P3', primary_item_id: 'P1' } }).problem!, /O1/)
    assert.match(checkAction(context, { op: 'update', record: 'O2', fields: { title: 'بندورة مع خبز' } }).problem!, /O1/)
    assert.ok(checkAction(context, { op: 'update', record: 'O1', fields: { is_active: true } }).step, 'showing or pricing an offer is not checked')
  })

  test('an older pair of repeated offers can still be fixed', () => {
    const offers: StoreRecord[] = [
      { code: 'O1', table: 'offers', id: 'o1', row: { title: 'عرض', offer_price: 40, original_price: 45, primary_item_id: 'item-1' } },
      { code: 'O2', table: 'offers', id: 'o2', row: { title: 'عرض', offer_price: 40, original_price: 45, primary_item_id: 'item-1' } },
    ]
    const context = ctx({ records: [...records, ...offers] })
    assert.ok(checkAction(context, { op: 'update', record: 'O2', fields: { title: 'عرض تاني' } }).step)
    assert.ok(checkAction(context, { op: 'update', record: 'O2', fields: { primary_item_id: 'P2' } }).step)
    assert.ok(checkAction(context, { op: 'update', record: 'O2', fields: { is_active: false } }).step)
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
    const fields = { image_url: 'PHOTO', images: ['PHOTO'] }
    assert.match(checkAction(ctx(), { op: 'update', record: 'P1', fields }).problem!, /no photo/)
    const { step } = checkAction(ctx({ photos: 1 }), { op: 'update', record: 'P1', fields })
    assert.equal(usesPhoto(step!), true)
    assert.deepEqual(withPhoto(fields, { 1: 'https://x/a.jpg' }), { image_url: 'https://x/a.jpg', images: ['https://x/a.jpg'] })
  })

  test('several photos each go where the model put them, and only ones that came can be used', () => {
    const two = ctx({ photos: 2 })
    const first = checkAction(two, { op: 'update', record: 'P1', fields: { image_url: 'PHOTO2', images: ['PHOTO2', 'PHOTO1'] } }).step!
    assert.deepEqual(photosUsed(first), [2, 1])
    assert.deepEqual(withPhoto((first as any).fields, { 1: 'a.jpg', 2: 'b.jpg' }), { image_url: 'b.jpg', images: ['b.jpg', 'a.jpg'] })
    assert.match(checkAction(two, { op: 'update', record: 'P2', fields: { image_url: 'PHOTO3' } }).problem!, /only PHOTO1 to PHOTO2/)
    assert.deepEqual(photosUsed({ op: 'update', table: 'menu_items', id: 'x', code: 'P1', label: 'y', said: '', fields: { name: 'PHOTO album' }, before: {} }), [], 'only a whole value names a photo')
  })

  test('a price far from the old one waits until the owner was asked about it', () => {
    const big = checkAction(ctx(), { op: 'update', record: 'P1', fields: { price: 350 } })
    assert.match(big.problem!, /far from the current 35/)
    assert.match(checkAction(ctx(), { op: 'update', record: 'P1', fields: { price: 5 } }).problem!, /far from/)
    assert.ok(checkAction(ctx({ lastReply: 'قصدك 350 ₺ للكيلو؟' }), { op: 'update', record: 'P1', fields: { price: 350 } }).step, 'it was asked, so the yes goes through')
    assert.ok(checkAction(ctx(), { op: 'update', record: 'P1', fields: { price: 50 } }).step, 'an ordinary change needs no question')
  })

  test('times are read and written on the shop\'s clock', () => {
    const moment = fromLocalTime('2026-11-08 18:00', 'Europe/Istanbul')
    assert.equal(moment, '2026-11-08T15:00:00.000Z')
    assert.equal(toLocalTime(moment, 'Europe/Istanbul'), '2026-11-08 18:00')
    assert.equal(fromLocalTime('2026-07-01 18:00', 'Europe/Berlin'), '2026-07-01T16:00:00.000Z', 'summer time')
    assert.equal(fromLocalTime('٢٠٢٦-١١-٠٨ ١٨:٠٠', 'Europe/Istanbul'), '2026-11-08T15:00:00.000Z')
    assert.equal(fromLocalTime('بكرا', 'Europe/Istanbul'), null)

    const saved = checkAction(ctx(), { op: 'update', record: 'P1', fields: { is_available: false, out_of_stock_until: '2026-11-08 18:00' } }).step as any
    assert.equal(saved.fields.out_of_stock_until, '2026-11-08T15:00:00.000Z')
    assert.match(checkAction(ctx(), { op: 'update', record: 'P1', fields: { out_of_stock_until: 'الساعة 6' } }).problem!, /not a time/)
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

  test('only the shop\'s own links reach the owner', () => {
    const links = shopLinks(store)
    assert.deepEqual(links, ['https://alfsouq.com/m/store', 'https://partner.alfsouq.com', 'https://wa.me/905352574134'])
    assert.equal(safeReply('شوف https://bad.example', links), '')
    assert.equal(safeReply('ادخل على www.bad.com', links), '')
    assert.equal(safeReply('هاد رابط محلك: https://alfsouq.com/m/store.', links), 'هاد رابط محلك: https://alfsouq.com/m/store.')
    assert.equal(safeReply('https://alfsouq.com/m/other', links), '', 'another shop\'s page')
    assert.equal(safeReply('https://alfsouq.com/m/storefront', links), '', 'a link that only starts like it')
    assert.deepEqual(shopLinks({ ...store, is_menu_active: false }), ['https://partner.alfsouq.com', 'https://wa.me/905352574134'], 'a closed page is not shared')
  })

  test('a product added without a photo is always asked about, once, in that message', () => {
    const bare: Step = { op: 'add', table: 'menu_items', label: 'كنافة', ref: null, fields: { name: 'كنافة', price: 50 } }
    const withImage: Step = { op: 'add', table: 'menu_items', label: 'خبز', ref: null, fields: { name: 'خبز', price: 10, image_url: 'PHOTO', images: ['PHOTO'] } }
    const first = () => 0

    assert.equal(withPhotoQuestion('ضفت الكنافة بـ 50 ₺', [bare], first), 'ضفت الكنافة بـ 50 ₺\nما وصلتني صورة إلها، عندك وحدة؟')
    assert.equal(withPhotoQuestion('ضفتها، عندك صوره إلها؟', [bare]), 'ضفتها، عندك صوره إلها؟', 'its own question is kept as it is')
    assert.equal(withPhotoQuestion('ضفت الخبز', [withImage]), 'ضفت الخبز')
    assert.equal(withPhotoQuestion('عدلت السعر', [{ op: 'update', table: 'menu_items', id: 'x', code: 'P1', label: 'y', said: '', fields: { price: 5 }, before: {} }]), 'عدلت السعر')
    assert.match(withPhotoQuestion('ضفتهن', [bare, { ...bare, label: 'بقلاوة' }], first), /صور إلهن/)
  })

  test('lists keep their lines and bold names for WhatsApp', () => {
    assert.equal(safeReply('هي منتجاتك:\n\n\n-  **عصير**: 5 ₺\r\n- خبز: 10 ₺  '), 'هي منتجاتك:\n\n- *عصير*: 5 ₺\n- خبز: 10 ₺')
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

  test('the time it is given is the shop\'s own, with the date and offset', () => {
    const moment = new Date('2026-11-07T21:30:00Z')
    assert.match(storeLocalTime(store, moment), /Sunday, 08\/11\/2026, 00:30 GMT\+3/)
    assert.match(storeLocalTime({ ...store, timezone: 'Europe/Berlin' }, moment), /Saturday, 07\/11\/2026, 22:30 GMT\+1/)
    assert.match(storeLocalTime({ ...store, timezone: 'Not/AZone' }, moment), /GMT\+3/, 'a broken zone falls back to Turkey')
  })

  test('it knows when it last sent each link, so it can judge whether to send it again', () => {
    assert.match(input, /alfsouq\.com\/m\/store \(not shared in the recent conversation\)/)
    const history = [
      { from: 'bot' as const, text: 'هاد رابط محلك https://alfsouq.com/m/store' },
      { from: 'owner' as const, text: 'تسلم' },
      { from: 'bot' as const, text: 'ولو' },
    ]
    const later = buildInput(ctx(), [], history, 'شو في', 'Wednesday 09:30')
    assert.match(later, /alfsouq\.com\/m\/store \(you shared it 2 messages ago\)/)
    assert.match(later, /partner\.alfsouq\.com \(not shared/)
  })

  test('it writes links to other records as codes, and leaves out long values and private notes', () => {
    assert.match(input, /P1 \{[^}]*"category_id":"C1"/)
    assert.ok(!input.includes('cat-1'))
    assert.ok(!input.includes('bread.jpg'))
    assert.ok(!input.includes('سري'))
    assert.ok(!input.includes(store.phone), 'the owner\'s own number stays private')
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

describe('messages sent in a row, photos and stickers', () => {
  test('each message is known by its kind, and a sticker is never a photo', () => {
    assert.equal(pieceKind({ hasMedia: false, mimeType: null }), 'text')
    assert.equal(pieceKind({ hasMedia: true, mimeType: 'image/jpeg' }), 'photo')
    assert.equal(pieceKind({ hasMedia: true, mimeType: 'image/webp', isSticker: true }), 'sticker')
    assert.equal(pieceKind({ hasMedia: true, mimeType: 'audio/ogg; codecs=opus' }), 'voice')
    assert.equal(pieceKind({ hasMedia: true, mimeType: 'video/mp4' }), 'other')
    const sticker = readMessage({ event: 'message', session: 'default', payload: { id: 's', from: '905000000000@c.us', timestamp: 1000, hasMedia: true, media: { url: 'http://x/s', mimetype: 'image/webp' } } }, 1000) as any
    assert.equal(sticker.isSticker, true)
  })

  test('pieces sent in a row are read together, in order, with photos numbered', () => {
    const text = describePieces([
      { kind: 'text', text: 'ضيف كنافة' },
      { kind: 'text', text: 'بـ 50' },
      { kind: 'photo' },
      { kind: 'sticker' },
      { kind: 'photo', text: 'وهي التانية' },
      { kind: 'voice' },
      { kind: 'failed' },
    ])
    assert.match(text, /sent 7 messages in a row; read them together/)
    assert.match(text, /1\. ضيف كنافة\n2\. بـ 50\n3\. \(PHOTO1 is attached\)\n4\. \(sticker 1 is attached: a reaction, not a product photo\)\n5\. \(PHOTO2 is attached, with the words: وهي التانية\)/)
    assert.match(text, /voice note 1/)
    assert.match(text, /didn't come through/)
    assert.equal(describePieces([{ kind: 'text', text: 'مرحبا' }]), 'مرحبا', 'a single message is shown as it is')
  })

  test('it can only ask to see what exists', () => {
    assert.deepEqual(readLooks(['visits', 'orders', 'visits', 'passwords', 3]), ['visits', 'orders'])
    assert.deepEqual(readLooks('visits'), [])
  })
})

describe('what a colleague would notice', () => {
  const now = Date.parse('2026-11-08T12:00:00Z')
  const shop = (extra: StoreRecord[], storeChanges = {}) => ctx({ store: { ...store, ...storeChanges }, records: [...records.map(record => ({ ...record })), ...extra] })

  test('an offer no longer cheaper than its products, or with a product customers can\'t get', () => {
    const offer: StoreRecord = { code: 'O1', table: 'offers', id: 'o1', row: { title: 'عرض البندورة', offer_price: 60, original_price: 70, primary_item_id: 'item-1', min_quantity: 1 } }
    const notes = noticeLines(shop([offer]), now)
    assert.ok(notes.some(note => /O1 .*costs 60.*total of 35/.test(note)))

    const hidden = shop([offer])
    const tomato = hidden.records.find(record => record.code === 'P1')!
    tomato.row = { ...tomato.row, is_hidden: true }
    assert.ok(noticeLines(hidden, now).some(note => /includes P1 بندورة حمرا, which customers can't get/.test(note)))
  })

  test('things out of stock, with their return time on the shop\'s clock', () => {
    const context = shop([])
    context.records.find(record => record.code === 'P2')!.row = { ...context.records.find(record => record.code === 'P2')!.row, is_available: false, out_of_stock_until: '2026-11-08T15:00:00Z' }
    context.records.find(record => record.code === 'P3')!.row = { ...context.records.find(record => record.code === 'P3')!.row, is_available: false }
    const notes = noticeLines(context, now)
    assert.ok(notes.some(note => /P2 بندورة كرزية is out of stock until 2026-11-08 18:00/.test(note)))
    assert.ok(notes.some(note => /P3 خبز is out of stock, with no time set/.test(note)))
    assert.ok(noticeLines(context, Date.parse('2026-11-08T16:00:00Z')).some(note => /which has passed/.test(note)))
  })

  test('the same product twice, photos missing, and a shop closed to customers', () => {
    const twin: StoreRecord = { code: 'P4', table: 'menu_items', id: 'item-4', row: { name: 'بندوره حمرا', price: 30 } }
    const notes = noticeLines(shop([twin], { is_on_holiday: true, holiday_message: 'سفر' }), now)
    assert.ok(notes.some(note => /same name: P1 بندورة حمرا, P4 بندوره حمرا/.test(note)))
    assert.ok(notes.some(note => /3 of 4 products have no photo/.test(note)))
    assert.ok(notes.some(note => /on holiday.*"سفر"/.test(note)))
    assert.deepEqual(noticeLines(ctx({ records: records.filter(record => record.table !== 'menu_items') }), now), [], 'nothing to say about a tidy shop')
  })
})

describe('a product with several photos', () => {
  const withPhotos = () => ctx({
    photos: 2,
    photosKept: 1,
    records: [...records.map(record => ({ ...record })), { code: 'P4', table: 'menu_items', id: 'item-4', row: { name: 'كنافة', price: 50, image_url: 'a.jpg', images: ['a.jpg', 'b.jpg'] } }],
  })

  test('its photos are shown by name, never by address', () => {
    const input = buildInput(withPhotos(), [], [], 'مرحبا', 'now')
    assert.match(input, /P4 \{[^}]*"images":\["P4#1","P4#2"\]/)
    assert.ok(!input.includes('a.jpg'))
    assert.match(input, /P3 \{[^}]*"images":\["P3#1"\]/, 'a single photo is named too')
    assert.match(input, /Photos you can use: PHOTO1, sent in an earlier message and not used yet; PHOTO2, sent just now/)
  })

  test('new photos are added to the ones it has, which stay unless left out', () => {
    const step = checkAction(withPhotos(), { op: 'update', record: 'P4', fields: { images: ['P4#1', 'P4#2', 'PHOTO2'] } }).step as any
    assert.deepEqual(step.fields.images, ['a.jpg', 'b.jpg', 'PHOTO2'])
    assert.deepEqual(withPhoto(step.fields, { 2: 'c.jpg' }).images, ['a.jpg', 'b.jpg', 'c.jpg'])
    assert.match(checkAction(withPhotos(), { op: 'update', record: 'P4', fields: { images: ['P4#3'] } }).problem!, /P4#3 is not a photo/)
    const main = checkAction(withPhotos(), { op: 'update', record: 'P4', fields: { image_url: 'P4#2', images: ['P4#2', 'P4#1'] } }).step as any
    assert.equal(main.fields.image_url, 'b.jpg', 'the main photo can be changed')
  })

  test('new photos are numbered after the ones kept from before', () => {
    assert.match(describePieces([{ kind: 'photo' }, { kind: 'photo' }], 1), /PHOTO2 is attached[\s\S]*PHOTO3 is attached/)
  })
})

describe('not repeating a title', () => {
  test('it is told how often it called them أستاذ lately', () => {
    const bot = (text: string) => ({ from: 'bot' as const, text })
    assert.match(titleUse([]), /haven't called them/)
    assert.match(titleUse([bot('تمام يا أستاذ'), bot('ضفتها')]), /in 1 of your last 2 messages\.$/)
    assert.match(titleUse([bot('تمام يا أستاذ'), bot('تكرم استاذ'), bot('تسلم يا أستاذ')]), /3 of your last 3 messages, which is already a lot: leave it out now/)
    assert.match(buildInput(ctx(), [], [bot('تكرم استاذ'), bot('تسلم يا أستاذ')], 'مرحبا', 'now'), /How you've been talking: you called them "أستاذ" in 2/)
  })
})
