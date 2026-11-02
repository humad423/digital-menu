import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { zonesForCustomer } from '../src/utils/zones.ts'

const gebze = { id: 'gebze', name: 'كيبزا', latitude: 40.8118, longitude: 29.4189, radius_km: 8 }
const cayirova = { id: 'cayirova', name: 'شايروفا', latitude: 40.8167, longitude: 29.375, radius_km: 5 }
const sultanbeyli = { id: 'sultanbeyli', name: 'سلطان بيلي', latitude: 40.9672, longitude: 29.2667, radius_km: 6 }
const aleppo = { id: 'aleppo', name: 'حلب', latitude: 36.2021, longitude: 37.1343, radius_km: 20 }
const zones = [aleppo, sultanbeyli, cayirova, gebze]

describe('zonesForCustomer', () => {
  it('offers every area when GPS is not available', () => {
    assert.deepEqual(zonesForCustomer(zones, null), zones)
  })

  it('offers only nearby areas, closest first', () => {
    const inGebze = { lat: 40.81, lng: 29.42 }
    assert.deepEqual(zonesForCustomer(zones, inGebze).map(z => z.id), ['gebze', 'cayirova', 'sultanbeyli'])
  })

  it('hides areas in another city', () => {
    const inAleppo = { lat: 36.2, lng: 37.13 }
    assert.deepEqual(zonesForCustomer(zones, inAleppo).map(z => z.id), ['aleppo'])
  })

  it('offers nothing when the customer is far from every area', () => {
    const inAnkara = { lat: 39.93, lng: 32.85 }
    assert.deepEqual(zonesForCustomer(zones, inAnkara), [])
  })
})
