import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { DATE_LOCALE, formatNumber, latinDigits, numberText } from '../src/utils/numbers.ts'

describe('numbers are written in English digits everywhere', () => {
  test('Arabic and Persian digits become English, and words stay', () => {
    assert.equal(latinDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789')
    assert.equal(latinDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789')
    assert.equal(latinDigits('شاورما ٣ قطع 12'), 'شاورما 3 قطع 12')
  })

  test('a number box understands both kinds of digit, even mixed', () => {
    assert.equal(numberText('٥1'), '51')
    assert.equal(numberText('1٥'), '15')
    assert.equal(numberText('١٥'), '15')
    assert.equal(numberText('15'), '15')
  })

  test('a decimal point can be written any usual way, once', () => {
    assert.equal(numberText('١٫٥'), '1.5')
    assert.equal(numberText('12,5'), '12.5')
    assert.equal(numberText('1.2.3'), '1.23')
    assert.equal(numberText('12.'), '12.')
  })

  test('anything that is not a number is dropped', () => {
    assert.equal(numberText('15 كم'), '15')
    assert.equal(numberText('abc'), '')
    assert.equal(numberText(''), '')
  })

  test('a minus only counts where it is allowed', () => {
    assert.equal(numberText('-٤٠٫٥', true), '-40.5')
    assert.equal(numberText('-40'), '40')
    assert.equal(numberText('-', true), '-')
  })

  test('dates keep Arabic words with English digits and the everyday calendar', () => {
    const text = new Date('2026-11-09T12:00:00Z').toLocaleDateString(DATE_LOCALE, { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' })
    assert.doesNotMatch(text, /[٠-٩]/)
    assert.match(text, /2026/)
  })

  test('big numbers are grouped with English digits', () => {
    assert.equal(formatNumber(15000), '15,000')
  })
})
