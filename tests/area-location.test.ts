import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { areaLocation } from '../src/utils/areaLocation.ts'

describe("a home seller's location", () => {
  test('is kept only to the area, about a kilometre', () => {
    assert.equal(areaLocation(40.825378307, true), 40.83)
    assert.equal(areaLocation(29.384052652, true), 29.38)
  })

  test("other stores' locations are kept exactly", () => {
    assert.equal(areaLocation(40.825378307, false), 40.825378307)
  })
})
