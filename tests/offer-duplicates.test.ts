import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { bundleProducts, duplicateBundleMessage } from '../src/utils/offerDuplicates.ts'

const cheeseAndJuice = { id: 'o1', title: 'حلاوة الجبن مع عصير برتقال', primary_item_id: 'cheese', min_quantity: 1, bonus_item_id: 'juice', bonus_quantity: 1, is_active: true }
const cheese = { id: 'o2', title: 'حلاوة الجبن', primary_item_id: 'cheese', min_quantity: 1, is_active: true }
const offers = [cheeseAndJuice, cheese]

describe('repeated bundles', () => {
  test('the same products in another order are the same bundle', () => {
    assert.equal(bundleProducts({ primary_item_id: 'juice', bonus_item_id: 'cheese' }), bundleProducts(cheeseAndJuice))
    assert.notEqual(bundleProducts({ primary_item_id: 'cheese', min_quantity: 2 }), bundleProducts(cheese))
  })

  test('a new bundle with the same products is refused', () => {
    const message = duplicateBundleMessage({ title: 'عرض العصير', primary_item_id: 'juice', min_quantity: 1, bonus_item_id: 'cheese', bonus_quantity: 1 }, offers)
    assert.match(message!, /نفس المنتجات: «حلاوة الجبن مع عصير برتقال»/)
  })

  test('a new bundle with the same name is refused, whatever the spelling', () => {
    assert.match(duplicateBundleMessage({ title: ' حلاوة  الجبن ', primary_item_id: 'juice' }, offers)!, /اسمه «حلاوة الجبن»/)
  })

  test('hidden bundles count, and the owner is told to show the old one', () => {
    const hidden = [{ ...cheese, is_active: false }]
    assert.match(duplicateBundleMessage({ title: 'جديد', primary_item_id: 'cheese', min_quantity: 1 }, hidden)!, /مخفي حالياً. أظهره/)
  })

  test('a different bundle is fine', () => {
    assert.equal(duplicateBundleMessage({ title: 'كيلو حلاوة', primary_item_id: 'cheese', min_quantity: 2 }, offers), null)
  })

  test('saving a bundle without changing its products or name is fine, even beside an older copy', () => {
    const copy = { ...cheeseAndJuice, id: 'o3' }
    assert.equal(duplicateBundleMessage({ ...copy, title: copy.title }, [...offers, copy], copy), null)
    assert.equal(duplicateBundleMessage({ ...copy, title: 'اسم جديد' }, [...offers, copy], copy), null)
    assert.match(duplicateBundleMessage({ ...cheese, id: 'o2', bonus_item_id: 'juice', bonus_quantity: 1 }, offers, cheese)!, /نفس المنتجات/)
  })
})
