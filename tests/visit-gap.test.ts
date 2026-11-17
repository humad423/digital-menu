import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { isNewVisit } from '../src/utils/visitGap.ts'

describe('the same phone is counted once every few hours', () => {
  const hour = 3_600_000
  const now = Date.parse('2026-11-17T12:00:00Z')

  test('a first visit counts', () => {
    assert.ok(isNewVisit(null, now))
    assert.ok(isNewVisit('true', now), 'an old marker from before counts as no visit yet')
  })

  test('coming back within the gap is the same visit, after it a new one', () => {
    assert.ok(!isNewVisit(String(now - 1 * hour), now))
    assert.ok(!isNewVisit(String(now - 5.9 * hour), now))
    assert.ok(isNewVisit(String(now - 6 * hour), now))
    assert.ok(isNewVisit(String(now - 30 * hour), now))
  })

  test('a clock moved back does not stop counting for good', () => {
    assert.ok(isNewVisit(String(now + 5 * hour), now))
  })
})
