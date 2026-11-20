import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { bestDeal, dealEnds, isPromotionLive, promotionPrice, storeDateTime, storeMoment, type Promotion } from '../src/utils/promotions.ts'

const zone = 'Europe/Istanbul'
// Thursday 2026-11-19, 14:00 in Istanbul
const thursday2pm = new Date('2026-11-19T11:00:00Z')
const cake = { id: 'cake', category_id: 'cakes' }
const cut = (changes: Partial<Promotion> = {}): Promotion => ({ id: 'p1', kind: 'price_cut', prices: [{ item_id: 'cake', size: null, price: 450 }], ...changes })

describe('when an offer runs', () => {
  test('runs always when nothing limits it', () => {
    assert.equal(isPromotionLive(cut(), thursday2pm, zone), true)
  })

  test('a switched-off offer never runs', () => {
    assert.equal(isPromotionLive(cut({ is_active: false }), thursday2pm, zone), false)
  })

  test('runs only between its start and its end', () => {
    assert.equal(isPromotionLive(cut({ starts_at: '2026-11-20T00:00:00Z' }), thursday2pm, zone), false)
    assert.equal(isPromotionLive(cut({ ends_at: '2026-11-19T10:00:00Z' }), thursday2pm, zone), false)
    assert.equal(isPromotionLive(cut({ starts_at: '2026-11-18T00:00:00Z', ends_at: '2026-11-20T00:00:00Z' }), thursday2pm, zone), true)
  })

  test('runs only on its days and hours, on the store clock', () => {
    assert.equal(isPromotionLive(cut({ days: [4], from_time: '13:00', until_time: '18:00' }), thursday2pm, zone), true)
    assert.equal(isPromotionLive(cut({ days: [4], from_time: '15:00', until_time: '18:00' }), thursday2pm, zone), false)
    assert.equal(isPromotionLive(cut({ days: [5] }), thursday2pm, zone), false)
  })

  test('hours past midnight count for the evening they began', () => {
    // Friday 01:00 in Istanbul, inside Thursday night's 22:00 to 02:00
    const fridayNight = new Date('2026-11-19T22:00:00Z')
    assert.equal(isPromotionLive(cut({ days: [4], from_time: '22:00', until_time: '02:00' }), fridayNight, zone), true)
    assert.equal(isPromotionLive(cut({ days: [5], from_time: '22:00', until_time: '02:00' }), fridayNight, zone), false)
  })
})

describe('what a product costs under an offer', () => {
  test('a price cut sets the new price, for the whole product or one size', () => {
    assert.equal(promotionPrice(cut(), cake, '', 550), 450)
    const sized = cut({ prices: [{ item_id: 'cake', size: '14 سم', price: 450 }, { item_id: 'cake', size: '20 سم', price: 1000 }] })
    assert.equal(promotionPrice(sized, cake, '20 سم', 1150), 1000)
    assert.equal(promotionPrice(sized, cake, '16 سم', 750), null, 'a size the offer leaves out keeps its price')
  })

  test('a price cut never raises a price', () => {
    assert.equal(promotionPrice(cut(), cake, '', 400), null)
  })

  test('a category discount takes its percent off, leaving out excluded products', () => {
    const tenOff: Promotion = { id: 'p2', kind: 'category_percent', percent: 10, category_ids: ['cakes'] }
    assert.equal(promotionPrice(tenOff, cake, '', 550), 495)
    assert.equal(promotionPrice({ ...tenOff, excluded_item_ids: ['cake'] }, cake, '', 550), null)
    assert.equal(promotionPrice(tenOff, { id: 'tea', category_id: 'drinks' }, '', 20), null)
  })

  test('offers never add up: the lowest one price wins', () => {
    const tenOff: Promotion = { id: 'p2', kind: 'category_percent', percent: 10, category_ids: ['cakes'] }
    const deal = bestDeal([tenOff, cut()], cake, '', 550, thursday2pm, zone)!
    assert.deepEqual([deal.price, deal.was, deal.percent, deal.promotion.id], [450, 550, 18, 'p1'])
    assert.equal(bestDeal([cut({ is_active: false })], cake, '', 550, thursday2pm, zone), null)
  })
})

describe('telling customers how long it lasts', () => {
  test('says when it ends today, tomorrow or later', () => {
    assert.equal(dealEnds(cut({ ends_at: '2026-11-19T20:00:00Z' }), thursday2pm, zone), 'ينتهي اليوم 11:00 م')
    assert.equal(dealEnds(cut({ ends_at: '2026-11-20T09:00:00Z' }), thursday2pm, zone), 'ينتهي بكرا 12:00 م')
    assert.equal(dealEnds(cut({ ends_at: '2026-11-25T09:00:00Z' }), thursday2pm, zone), 'حتى الأربعاء 25/11')
    assert.equal(dealEnds(cut({ days: [4], from_time: '13:00', until_time: '18:00' }), thursday2pm, zone), 'حتى الساعة 6:00 م')
    assert.equal(dealEnds(cut(), thursday2pm, zone), null)
  })
})

describe('store times in the forms', () => {
  test('a store date and time become the right moment and back', () => {
    const moment = storeMoment('2026-11-21', '23:30', zone)
    assert.equal(moment, '2026-11-21T20:30:00.000Z')
    assert.deepEqual(storeDateTime(moment, zone), { date: '2026-11-21', time: '23:30' })
    assert.equal(storeMoment('', '10:00', zone), null)
  })
})
