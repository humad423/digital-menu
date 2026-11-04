import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { COLOR_OPTIONS, SIZE_OPTIONS, addOptions, isRealDiscount, orderOptions, toggleOption } from '../src/utils/productOptions.ts'

const colors = COLOR_OPTIONS.map(color => color.name)

describe('real discounts', () => {
  test('only a lower price above zero counts', () => {
    assert.equal(isRealDiscount(80, 100), true)
    assert.equal(isRealDiscount(100, 100), false)
    assert.equal(isRealDiscount(120, 100), false)
    assert.equal(isRealDiscount(0, 100), false)
    assert.equal(isRealDiscount(80, Number.NaN), false)
  })
})

describe('choosing sizes and colors', () => {
  test('tapping selects, and tapping again removes', () => {
    assert.deepEqual(toggleOption([], 'M'), ['M'])
    assert.deepEqual(toggleOption(['M', 'L'], 'M'), ['L'])
  })

  test('sizes are saved in their usual order whatever order they were tapped', () => {
    assert.deepEqual(orderOptions(['XL', 'S', 'M'], SIZE_OPTIONS), ['S', 'M', 'XL'])
  })

  test('something added by the owner stays, after the listed ones', () => {
    assert.deepEqual(orderOptions(['فري سايز', 'L', 'S'], SIZE_OPTIONS), ['S', 'L', 'فري سايز'])
  })

  test('a spelling difference counts as the same choice', () => {
    assert.deepEqual(toggleOption(['احمر'], 'أحمر'), [])
    assert.deepEqual(orderOptions(['احمر'], colors), ['أحمر'])
    assert.deepEqual(addOptions(['S'], 's', SIZE_OPTIONS), ['S'])
  })

  test('typing a listed one selects the listed one', () => {
    assert.deepEqual(addOptions([], 'احمر', colors), ['أحمر'])
    assert.deepEqual(addOptions([], 'xl', SIZE_OPTIONS), ['XL'])
  })

  test('several can be typed at once, and blanks are ignored', () => {
    assert.deepEqual(addOptions([], 'خمري، زيتي, ', colors), ['خمري', 'زيتي'])
    assert.deepEqual(addOptions(['M'], '   ', SIZE_OPTIONS), ['M'])
  })

  test('what is already saved on a product is kept as it was', () => {
    assert.deepEqual(orderOptions(['سمول لارج اكس لارج'], SIZE_OPTIONS), ['سمول لارج اكس لارج'])
  })
})
