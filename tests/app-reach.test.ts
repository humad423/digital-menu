import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { entryFor } from '../src/utils/visitOrigin.ts'
import { isPushEndpoint, keyToBytes, readAudience, readNotice, roundCoordinate, subscribersWithin } from '../src/utils/push.ts'

const STORE = 'e38346d1-8996-401b-b249-9f4381123199'

describe('how a visit began', () => {
  test('a store QR code, a store link, or the site itself', () => {
    assert.equal(entryFor('/m/halwayat-ariha', '?source=qr'), 'qr')
    assert.equal(entryFor('/m/halwayat-ariha', '?src=qr'), 'qr')
    assert.equal(entryFor('/m/halwayat-ariha', ''), 'store')
    assert.equal(entryFor('/m/halwayat-ariha', '?source=share'), 'store')
    assert.equal(entryFor('/', ''), 'site')
    assert.equal(entryFor('/offers', ''), 'site')
  })
})

describe('offer notifications', () => {
  test('only real push services are written to', () => {
    assert.ok(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc'))
    assert.ok(isPushEndpoint('https://web.push.apple.com/QF8'))
    assert.ok(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x'))
    assert.ok(isPushEndpoint('https://wns2-db5p.notify.windows.com/w/?token=x'))
    assert.ok(!isPushEndpoint('http://fcm.googleapis.com/fcm/send/abc'))
    assert.ok(!isPushEndpoint('https://evil.example.com/fcm.googleapis.com'))
    assert.ok(!isPushEndpoint('https://fcm.googleapis.com.evil.com/x'))
    assert.ok(!isPushEndpoint('https://169.254.169.254/latest'))
    assert.ok(!isPushEndpoint(42))
  })

  test('a location is kept to about a kilometre, and nonsense is dropped', () => {
    assert.equal(roundCoordinate(40.80082804, 90), 40.8)
    assert.equal(roundCoordinate(29.42869579, 180), 29.43)
    assert.equal(roundCoordinate(undefined, 90), null)
    assert.equal(roundCoordinate('abc', 90), null)
    assert.equal(roundCoordinate(120, 90), null)
  })

  test('people within reach of any of the stores hear about it, once each', () => {
    const people = [
      { endpoint: 'near-first', p256dh: 'k', auth: 'a', lat: 40.81, lng: 29.43 },
      { endpoint: 'near-second', p256dh: 'k', auth: 'a', lat: 41.0, lng: 29.1 },
      { endpoint: 'far', p256dh: 'k', auth: 'a', lat: 39.9, lng: 32.8 },
      { endpoint: 'unknown', p256dh: 'k', auth: 'a', lat: null, lng: null },
    ]
    const stores = [{ lat: 40.8008, lng: 29.4287, radiusKm: 10 }, { lat: 41.01, lng: 29.11, radiusKm: 5 }, { lat: 40.805, lng: 29.43, radiusKm: 10 }]
    assert.deepEqual(subscribersWithin(people, stores).map(person => person.endpoint), ['near-first', 'near-second'])
    assert.deepEqual(subscribersWithin(people, []), [])
  })

  test('who it goes to: everyone, near a store, a kind of store, or a category', () => {
    assert.deepEqual(readAudience(undefined).audience, { kind: 'all' })
    assert.deepEqual(readAudience({ kind: 'store', restaurantId: STORE, radiusKm: '7' }).audience, { kind: 'store', restaurantId: STORE, radiusKm: 7 })
    assert.deepEqual(readAudience({ kind: 'store', restaurantId: STORE, radiusKm: null }).audience, { kind: 'store', restaurantId: STORE, radiusKm: null })
    assert.deepEqual(readAudience({ kind: 'type', type: 'supermarket' }).audience, { kind: 'type', type: 'supermarket' })
    assert.deepEqual(readAudience({ kind: 'category', categoryId: '33333333-3333-3333-3333-333333333333' }).audience, { kind: 'category', categoryId: '33333333-3333-3333-3333-333333333333' })
    assert.match(readAudience({ kind: 'store' }).problem!, /المتجر/)
    assert.match(readAudience({ kind: 'store', restaurantId: STORE, radiusKm: 500 }).problem!, /بين 1 و100/)
    assert.match(readAudience({ kind: 'type', type: "x'; drop" }).problem!, /نوع/)
    assert.match(readAudience({ kind: 'anything' }).problem!, /لمن/)
  })

  test('a notice needs a short title and text, and links only inside the site', () => {
    const notice = readNotice({ title: 'عروض اليوم', body: 'شوف العروض', url: '/?type=restaurant', audience: { kind: 'type', type: 'restaurant' } }).notice!
    assert.equal(notice.url, '/?type=restaurant')
    assert.equal(notice.audience.kind, 'type')
    assert.match(readNotice({ title: '', body: 'x' }).problem!, /عنوان/)
    assert.match(readNotice({ title: 'x', body: 'y', url: 'https://evil.example.com' }).problem!, /صفحة من ألف سوق/)
    assert.match(readNotice({ title: 'x', body: 'y', url: '//evil.example.com' }).problem!, /صفحة من ألف سوق/)
    assert.match(readNotice({ title: 'x', body: 'y', url: '/\\evil.example.com' }).problem!, /صفحة من ألف سوق/)
  })

  test('the public key turns into the bytes browsers expect', () => {
    assert.deepEqual([...keyToBytes('AQID')], [1, 2, 3])
    assert.equal(keyToBytes('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U').length, 65)
  })
})
