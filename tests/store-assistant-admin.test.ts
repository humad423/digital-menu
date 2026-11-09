import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  NO_STORE, applyToContext, buildInput, checkAction, readSwitchStore, safeReply,
  type Context, type Step, type Store,
} from '../supabase/functions/store-assistant/logic.ts'

const store: Store = { id: 'store-1', name: 'حلويات الشام', slug: 'sham', store_type: 'restaurant', max_offers_limit: 5, whatsapp_number: '+905000000000' }
const stores = [
  { code: 'A1', id: 'store-1', name: 'حلويات الشام', slug: 'sham' },
  { code: 'A2', id: 'store-2', name: 'مطعم الياسمين', slug: 'yasmin' },
]

const owner = (changes: Partial<Context> = {}): Context => ({
  store,
  records: [{ code: 'S', table: 'restaurants', id: store.id, row: store }],
  photos: 0,
  ...changes,
})
const admin = (changes: Partial<Context> = {}): Context => owner({ isAdmin: true, stores, ...changes })
const open = (fields: Record<string, unknown>) => ({ op: 'create_store', fields })

describe('what only the admin can do', () => {
  test('an owner still cannot open a shop, rename theirs or change the usual hours', () => {
    assert.match(checkAction(owner(), open({ name: 'جديد', slug: 'new-shop' })).problem!, /cannot create/)
    assert.match(checkAction(owner(), { op: 'update', record: 'S', fields: { name: 'اسم تاني' } }).problem!, /Alfsouq team/)
    assert.match(checkAction(owner(), { op: 'update', record: 'S', fields: { opening_time: '10:00' } }).problem!, /store panel/)
  })

  test('an owner cannot move to another shop, even by naming its code', () => {
    assert.equal(readSwitchStore(owner({ stores }), 'A2'), null)
  })

  test('the admin can rename a shop and change its usual hours', () => {
    assert.ok(checkAction(admin(), { op: 'update', record: 'S', fields: { name: 'اسم تاني' } }).step)
    const { step } = checkAction(admin(), { op: 'update', record: 'S', fields: { opening_time: '٩:٣٠', delivery_until: '22:00' } })
    assert.deepEqual((step as any).fields, { opening_time: '09:30', delivery_until: '22:00' })
  })

  test('a time that is not one is refused', () => {
    assert.match(checkAction(admin(), { op: 'update', record: 'S', fields: { closing_time: 'بالليل' } }).problem!, /HH:MM/)
  })

  test('nobody can delete, the admin included', () => {
    assert.match(checkAction(admin(), { op: 'delete', record: 'S' }).problem!, /cannot delete/)
  })

  test('the admin brief goes only to the admin', () => {
    const input = (ctx: Context) => buildInput(ctx, [], [], 'مرحبا', 'now')
    assert.doesNotMatch(input(owner()), /Alfsouq admin/)
    assert.match(input(admin()), /Alfsouq admin/)
    assert.match(input(admin()), /A2 مطعم الياسمين \(yasmin\)/)
  })
})

describe('moving between shops', () => {
  test('goes only to a shop that exists and isn\'t the current one', () => {
    assert.equal(readSwitchStore(admin(), 'A2')?.id, 'store-2')
    assert.equal(readSwitchStore(admin(), 'A1'), null)
    assert.equal(readSwitchStore(admin(), 'A9'), null)
    assert.equal(readSwitchStore(admin(), undefined), null)
  })

  test('with no shop chosen nothing can be saved, and the model is told what to do', () => {
    const ctx = admin({ store: NO_STORE, records: [] })
    assert.match(checkAction(ctx, { op: 'add', table: 'categories', fields: { name: 'حلويات' } }).problem!, /No shop is chosen/)
    assert.doesNotThrow(() => buildInput(ctx, [], [], 'مرحبا', 'now'))
  })
})

describe('opening a new shop', () => {
  test('needs a name and a usable link', () => {
    assert.match(checkAction(admin(), open({ slug: 'new-shop' })).problem!, /needs a name/)
    assert.match(checkAction(admin(), open({ name: 'جديد', slug: 'شاورما' })).problem!, /latin/)
    assert.match(checkAction(admin(), open({ name: 'جديد', slug: 'new shop' })).problem!, /latin/)
  })

  test('a shop that already exists is not opened twice', () => {
    assert.match(checkAction(admin(), open({ name: 'مطعم الياسمين', slug: 'other' })).problem!, /already exists/)
    assert.match(checkAction(admin(), open({ name: 'اسم تاني', slug: 'yasmin' })).problem!, /already exists/)
  })

  test('without a number it stays off the home page with its page closed', () => {
    const { step } = checkAction(admin(), open({ name: 'شاورما الريف', slug: 'Shawarma-Rif' }))
    assert.deepEqual((step as any).fields, {
      store_type: 'restaurant', name: 'شاورما الريف', slug: 'shawarma-rif', show_on_home: false, whatsapp_number: '', is_menu_active: false,
    })
  })

  test('with a number its page opens, still off the home page', () => {
    const { step } = checkAction(admin(), open({ name: 'شاورما الريف', slug: 'rif', whatsapp_number: '٠٥٣٢ ١٢٣ ٤٥ ٦٧' }))
    const fields = (step as any).fields
    assert.equal(fields.whatsapp_number, '+905321234567')
    assert.equal(fields.is_menu_active, true)
    assert.equal(fields.show_on_home, false)
  })

  test('half a number, or fields it has no business setting, do not get through', () => {
    assert.match(checkAction(admin(), open({ name: 'جديد', slug: 'new', whatsapp_number: '0532' })).problem!, /full phone number/)
    const { step } = checkAction(admin(), open({ name: 'جديد', slug: 'new', is_subscription_active: false, id: 'x' }))
    assert.equal('is_subscription_active' in (step as any).fields, false)
    assert.equal('id' in (step as any).fields, false)
  })

  test('its first number opens a page that was closed', () => {
    const draft = { ...store, whatsapp_number: '', is_menu_active: false }
    const ctx = admin({ store: draft, records: [{ code: 'S', table: 'restaurants', id: store.id, row: draft }] })
    const { step } = checkAction(ctx, { op: 'update', record: 'S', fields: { whatsapp_number: '+905321234567' } })
    assert.deepEqual((step as any).fields, { whatsapp_number: '+905321234567', is_menu_active: true })
  })

  test('changing a number does not open a page the admin closed', () => {
    const closed = { ...store, is_menu_active: false }
    const ctx = admin({ store: closed, records: [{ code: 'S', table: 'restaurants', id: store.id, row: closed }] })
    const { step } = checkAction(ctx, { op: 'update', record: 'S', fields: { whatsapp_number: '+905321234567' } })
    assert.equal('is_menu_active' in (step as any).fields, false)
  })

  test('what follows it in the same message goes on the new shop', () => {
    const ctx = admin()
    const opened = checkAction(ctx, open({ name: 'شاورما الريف', slug: 'rif' })).step as Step
    applyToContext(ctx, opened, { id: 'store-3', name: 'شاورما الريف', slug: 'rif', store_type: 'restaurant', max_offers_limit: 5 })
    assert.equal(ctx.store.id, 'store-3')
    assert.deepEqual(ctx.records.map(record => record.code), ['S'])
    assert.equal(ctx.stores?.at(-1)?.code, 'A3')

    const category = checkAction(ctx, { op: 'add', table: 'categories', ref: 'N1', fields: { name: 'سندويش' } }).step as Step
    applyToContext(ctx, category, { id: 'cat-new', name: 'سندويش' })
    const product = checkAction(ctx, { op: 'add', table: 'menu_items', fields: { name: 'شاورما', price: 120, category_id: 'N1' } })
    assert.equal((product.step as any).fields.category_id, 'cat-new')
  })

  test('a menu read back to the admin can be longer than an owner\'s reply', () => {
    const long = 'س'.repeat(3000)
    assert.equal(safeReply(long).length, 1500)
    assert.equal(safeReply(long, [], 4000).length, 3000)
  })
})
