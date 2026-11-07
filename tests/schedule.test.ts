import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { deliveryNow, describeSpecialDay, openNow, upcomingSpecialDays } from '../src/utils/schedule.ts'

// Times are Turkey's (GMT+3): 09:00Z is 12:00 there. 2026-11-08 is a Sunday.
const at = (iso: string) => new Date(iso)
const shop = (changes: object = {}) => ({ timezone: 'Europe/Istanbul', opening_time: '09:00', closing_time: '23:00', days_off: [], ...changes })

describe('open or closed on the store clock', () => {
  test('usual hours, and a store that closes after midnight', () => {
    assert.equal(openNow(shop(), at('2026-11-08T09:00:00Z')).isOpen, true)
    assert.equal(openNow(shop(), at('2026-11-08T21:00:00Z')).isOpen, false, 'midnight in Turkey')
    const late = shop({ opening_time: '18:00', closing_time: '02:00' })
    assert.equal(openNow(late, at('2026-11-08T22:30:00Z')).isOpen, true, '01:30, still last night\'s shift')
  })

  test('a day changed on its own: closed, closing early, opening on a day off', () => {
    assert.equal(openNow(shop({ special_days: [{ date: '2026-11-08', closed: true }] }), at('2026-11-08T09:00:00Z')).isOpen, false)
    const early = shop({ special_days: [{ date: '2026-11-08', close: '18:00' }] })
    assert.equal(openNow(early, at('2026-11-08T14:00:00Z')).isOpen, true, '17:00')
    assert.equal(openNow(early, at('2026-11-08T16:00:00Z')).isOpen, false, '19:00')
    assert.equal(openNow(early, at('2026-11-09T16:00:00Z')).isOpen, true, 'the next day is back to usual')
    const sundayOff = shop({ days_off: ['الأحد'] })
    assert.equal(openNow(sundayOff, at('2026-11-08T09:00:00Z')).isOpen, false)
    assert.equal(openNow({ ...sundayOff, special_days: [{ date: '2026-11-08', open: '10:00', close: '14:00' }] }, at('2026-11-08T09:00:00Z')).isOpen, true)
  })
})

describe('closed for a while', () => {
  test('closed until a time, then open again on its own', () => {
    const away = shop({ closed_until: '2026-11-08T10:00:00Z' })
    assert.deepEqual(
      { isOpen: openNow(away, at('2026-11-08T09:00:00Z')).isOpen, until: openNow(away, at('2026-11-08T09:00:00Z')).closedUntil },
      { isOpen: false, until: '13:00' },
    )
    assert.equal(openNow(away, at('2026-11-08T10:30:00Z')).isOpen, true)
  })
})

describe('delivery now', () => {
  test('delivery hours, a pause that ends on its own, and a day without delivery', () => {
    assert.deepEqual(deliveryNow(shop(), at('2026-11-08T09:00:00Z')), { available: true })
    const evenings = shop({ delivery_from: '17:00', delivery_until: '22:00' })
    assert.deepEqual(deliveryNow(evenings, at('2026-11-08T09:00:00Z')), { available: false, reason: 'التوصيل من 17:00 إلى 22:00' })
    assert.equal(deliveryNow(evenings, at('2026-11-08T15:00:00Z')).available, true)

    const paused = shop({ delivery_paused_until: '2026-11-08T11:00:00Z' })
    assert.deepEqual(deliveryNow(paused, at('2026-11-08T09:00:00Z')), { available: false, reason: 'التوصيل متوقف حتى 14:00' })
    assert.equal(deliveryNow(paused, at('2026-11-08T11:30:00Z')).available, true, 'back on its own')
    assert.match(deliveryNow(shop({ delivery_paused_until: '2026-11-09T07:00:00Z' }), at('2026-11-08T09:00:00Z')).reason!, /غداً 10:00/)

    assert.match(deliveryNow(shop({ special_days: [{ date: '2026-11-08', delivery_off: true, note: 'ما في سائق' }] }), at('2026-11-08T09:00:00Z')).reason!, /لا يوجد توصيل اليوم: ما في سائق/)
    const nineOnly = shop({ special_days: [{ date: '2026-11-08', delivery_from: '21:00' }] })
    assert.deepEqual(deliveryNow(nineOnly, at('2026-11-08T09:00:00Z')), { available: false, reason: 'التوصيل من 21:00 إلى 23:00' })
    assert.equal(deliveryNow(nineOnly, at('2026-11-08T18:30:00Z')).available, true)
    assert.equal(deliveryNow(shop({ has_delivery: false }), at('2026-11-08T09:00:00Z')).available, false)
  })
})

describe('the panel list of changes', () => {
  test('only today and later, in plain words', () => {
    const store = shop({ special_days: [{ date: '2026-11-07', closed: true }, { date: '2026-11-09', open: '12:00' }, { date: '2026-11-08', closed: true, note: 'عزاء' }] })
    const days = upcomingSpecialDays(store, at('2026-11-08T09:00:00Z'))
    assert.deepEqual(days.map(day => day.date), ['2026-11-08', '2026-11-09'])
    assert.equal(describeSpecialDay(days[0], store, at('2026-11-08T09:00:00Z')), 'اليوم: مغلق (عزاء)')
    assert.equal(describeSpecialDay(days[1], store, at('2026-11-08T09:00:00Z')), 'غداً: الدوام من 12:00 إلى 23:00')
  })
})
