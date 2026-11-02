import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { isStoreWithinRange } from '../src/utils/distance.ts'
import { pickCityName } from '../src/utils/userLocation.ts'

describe('pickCityName', () => {
  test('uses the city when it is in Arabic', () => {
    assert.equal(pickCityName({ city: 'كبزة', locality: 'Mustafapasa', principalSubdivision: 'ولاية قوجالة' }), 'كبزة')
  })

  test('prefers an Arabic name over a Latin city', () => {
    assert.equal(pickCityName({ city: 'Darica', locality: 'دارجة' }), 'دارجة')
  })

  test('falls back to the Latin name when there is no Arabic one', () => {
    assert.equal(pickCityName({ city: 'Darica', locality: 'Bayramoglu' }), 'Darica')
  })

  test('falls back to the province, then to nothing', () => {
    assert.equal(pickCityName({ city: ' ', locality: '', principalSubdivision: 'ولاية قوجالة' }), 'ولاية قوجالة')
    assert.equal(pickCityName({}), null)
  })
})

describe('isStoreWithinRange', () => {
  const here = { lat: 40.8, lng: 29.43 }
  const store = { latitude: 40.8, longitude: 29.5, has_delivery: true, delivery_radius_km: 10 }

  test('shows a store whose range reaches the customer', () => {
    assert.equal(isStoreWithinRange(here.lat, here.lng, store), true)
  })

  test('hides a store whose range does not reach the customer', () => {
    assert.equal(isStoreWithinRange(here.lat, here.lng, { ...store, delivery_radius_km: 2 }), false)
  })

  test('hides a store with no position on the map', () => {
    assert.equal(isStoreWithinRange(here.lat, here.lng, { ...store, latitude: null, longitude: null }), false)
  })
})
