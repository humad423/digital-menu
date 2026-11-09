import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { matchStockPhotos, readKeywords } from '../src/utils/stockPhotos.ts'
import { buildInput, checkAction, withPhotoQuestion, type Context, type Step } from '../supabase/functions/store-assistant/logic.ts'

const cola = { id: '1', name: 'كولا لترين ونص', keywords: ['بيبسي', 'كوكا'], image_url: 'cola.jpg' }
const water = { id: '2', name: 'عبوة ماء', keywords: ['مي', 'مياه'], image_url: 'water.jpg' }

describe('finding a ready-made photo for a product', () => {
  test('by its name or another name, whatever the spelling', () => {
    assert.deepEqual(matchStockPhotos('بيبسي لترين', [cola, water]), [cola])
    assert.deepEqual(matchStockPhotos('عبوه ماء', [cola, water]), [water])
    assert.deepEqual(matchStockPhotos('شاورما', [cola, water]), [])
    assert.deepEqual(matchStockPhotos('م', [cola, water]), [], 'a single letter matches nothing')
  })

  test('other names are split and tidied', () => {
    assert.deepEqual(readKeywords('بيبسي، كوكا, كوكا ,\nكولا'), ['بيبسي', 'كوكا', 'كولا'])
  })
})

describe('the assistant and ready-made photos', () => {
  const store = { id: 'store', name: 'متجر', slug: 'store', store_type: 'restaurant', max_offers_limit: 5 }
  const ctx: Context = {
    store,
    records: [{ code: 'C1', table: 'categories', id: 'cat-1', row: { name: 'مشروبات' } }],
    photos: 0,
    stockPhotos: [{ code: 'ST1', name: 'كولا لترين ونص', keywords: ['بيبسي'], url: 'https://x/cola.jpg' }],
  }

  test('a ready-made photo goes on the product by its code', () => {
    const { step } = checkAction(ctx, { op: 'add', table: 'menu_items', fields: { name: 'بيبسي لترين', price: 60, category_id: 'C1', image_url: 'ST1', images: ['ST1'] } })
    assert.equal((step as any).fields.image_url, 'https://x/cola.jpg')
    assert.deepEqual((step as any).fields.images, ['https://x/cola.jpg'])
  })

  test('a code that does not exist is refused', () => {
    assert.match(checkAction(ctx, { op: 'add', table: 'menu_items', fields: { name: 'ماء', price: 10, category_id: 'C1', image_url: 'ST9' } }).problem!, /not one of the ready-made/)
  })

  test('with a ready-made photo there is no question about a photo', () => {
    const step = checkAction(ctx, { op: 'add', table: 'menu_items', fields: { name: 'بيبسي', price: 60, category_id: 'C1', image_url: 'ST1', images: ['ST1'] } }).step as Step
    assert.equal(withPhotoQuestion('ضفت البيبسي', [step]), 'ضفت البيبسي')
  })

  test('the model sees the names and codes, never the addresses', () => {
    const input = buildInput(ctx, [], [], 'مرحبا', 'now')
    assert.match(input, /ST1 كولا لترين ونص \(بيبسي\)/)
    assert.ok(!input.includes('cola.jpg'))
  })
})
