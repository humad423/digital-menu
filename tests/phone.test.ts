import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findStoreIdByPhone, joinPhone, normalizePhoneNumber, splitPhone } from '../src/utils/phone.ts'

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

describe('phone number boxes', () => {
  it('splits a saved number into code and the rest', () => {
    assert.deepEqual(splitPhone('+905352574134'), { code: '+90', local: '5352574134' })
    assert.deepEqual(splitPhone('+963944123456'), { code: '+963', local: '944123456' })
    assert.deepEqual(splitPhone(''), { code: '+90', local: '' })
  })

  it('a number with no code starts on the default country', () => {
    assert.deepEqual(splitPhone('05352574134'), { code: '+90', local: '5352574134' })
  })

  it('an unknown country is kept, not lost', () => {
    assert.equal(joinPhone(splitPhone('+4915112345678').code, splitPhone('+4915112345678').local), '+4915112345678')
  })

  it('joins them, dropping the zero people type first', () => {
    assert.equal(joinPhone('+90', '0535 257 41 34'), '+905352574134')
    assert.equal(joinPhone('+963', '0944123456'), '+963944123456')
    assert.equal(joinPhone('+90', ''), '')
  })

  it('a pasted full number keeps its own code', () => {
    assert.equal(joinPhone('+90', '+963 944 123 456'), '+963944123456')
    assert.equal(joinPhone('+90', '00963944123456'), '+963944123456')
  })

  it('the result is what the site saves', () => {
    for (const [code, local] of [['+90', '5352574134'], ['+963', '944123456'], ['+965', '51234567'], ['+966', '501234567']]) {
      const full = joinPhone(code, local)
      assert.equal(normalizePhoneNumber(full), full, full)
    }
  })
})
