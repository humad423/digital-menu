import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { CONTACT_MESSAGE, ORDER_SOURCE_LINE, whatsappLink } from '../src/utils/whatsappMessage.ts'

describe('messages show they came from Alfsouq', () => {
  test('both the message button and an order name Alfsouq', () => {
    assert.match(CONTACT_MESSAGE, /ألف سوق/)
    assert.match(ORDER_SOURCE_LINE, /ألف سوق/)
  })

  test('the link holds only digits for the number and carries the text safely', () => {
    const link = whatsappLink('+90 535 257-41 34', CONTACT_MESSAGE)
    assert.ok(link.startsWith('https://wa.me/905352574134?text='))
    assert.equal(decodeURIComponent(link.split('?text=')[1]), CONTACT_MESSAGE)
  })
})
