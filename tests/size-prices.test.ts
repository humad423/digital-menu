import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { cleanSizeRows, lowestSizePrice, readPlainSizes, readSizePrices } from '../src/utils/sizePrices.ts'

describe('a price for each size', () => {
  test('sizes with prices are read apart from plain clothing sizes', () => {
    const saved = [{ name: 'صغير', price: 600 }, { name: 'وسط', price: 850 }, 'M', { name: '', price: 5 }, { name: 'كبير', price: 0 }]
    assert.deepEqual(readSizePrices(saved), [{ name: 'صغير', price: 600 }, { name: 'وسط', price: 850 }])
    assert.deepEqual(readPlainSizes(saved), ['M'])
    assert.deepEqual(readSizePrices(JSON.stringify(saved)), [{ name: 'صغير', price: 600 }, { name: 'وسط', price: 850 }])
    assert.deepEqual(readSizePrices(null), [])
  })

  test('the product shows its cheapest size', () => {
    assert.equal(lowestSizePrice([{ name: 'كبير', price: 1100 }, { name: 'صغير', price: 600 }]), 600)
  })

  test("the owner's rows are tidied, and mistakes are named", () => {
    assert.deepEqual(cleanSizeRows([{ name: ' صغير ', price: '600' }, { name: '', price: '' }, { name: 'وسط', price: '٨٥٠' }]).sizes,
      [{ name: 'صغير', price: 600 }, { name: 'وسط', price: 850 }])
    assert.match(cleanSizeRows([{ name: 'كبير', price: '' }]).problem!, /سعر المقاس «كبير»/)
    assert.match(cleanSizeRows([{ name: '', price: '500' }]).problem!, /اسم كل مقاس/)
    assert.match(cleanSizeRows([{ name: 'وسط', price: '5' }, { name: 'وسط', price: '6' }]).problem!, /مرتين/)
    assert.deepEqual(cleanSizeRows([]), { sizes: [] })
  })
})
