import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findStoreIdByPhone, normalizePhoneNumber } from '../src/utils/phone.ts'

describe('normalizePhoneNumber', () => {
  it('returns E.164 for the formats stores and customers type', () => {
    assert.equal(normalizePhoneNumber('+90 535 257 41 34'), '+905352574134')
    assert.equal(normalizePhoneNumber('05352574134'), '+905352574134')
    assert.equal(normalizePhoneNumber('5352574134', '+90'), '+905352574134')
    assert.equal(normalizePhoneNumber('00905352574134'), '+905352574134')
    assert.equal(normalizePhoneNumber('+90+905352574134'), '+905352574134')
  })

  it('strips invisible direction marks', () => {
    assert.equal(normalizePhoneNumber('‪+905352574134‬'), '+905352574134')
  })

  it('returns an empty string when there are no digits', () => {
    assert.equal(normalizePhoneNumber(null), '')
    assert.equal(normalizePhoneNumber('---'), '')
  })
})

describe('findStoreIdByPhone', () => {
  const stores = [
    { id: 'a', whatsapp_number: '+905352574134' },
    { id: 'b', whatsapp_number: '0538 073 43 97' },
    { id: 'short', whatsapp_number: '4134' },
    { id: 'no-digits', whatsapp_number: '-' },
    { id: 'none', whatsapp_number: null },
  ]

  it('matches the exact number across formats', () => {
    assert.equal(findStoreIdByPhone(stores, '+905352574134'), 'a')
    assert.equal(findStoreIdByPhone(stores, '+905380734397'), 'b')
  })

  it('does not give access on a shared suffix', () => {
    assert.equal(findStoreIdByPhone(stores, '+905559994134'), null)
  })

  it('does not match a store whose number has no digits', () => {
    assert.equal(findStoreIdByPhone(stores, '+905550000000'), null)
  })

  it('refuses when two stores share the number', () => {
    const shared = [
      { id: 'x', whatsapp_number: '+905352574134' },
      { id: 'y', whatsapp_number: '05352574134' },
    ]
    assert.equal(findStoreIdByPhone(shared, '+905352574134'), null)
  })

  it('refuses an empty phone', () => {
    assert.equal(findStoreIdByPhone(stores, ''), null)
  })
})
