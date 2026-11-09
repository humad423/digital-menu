import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { managerPhones } from '../src/utils/phone.ts'

describe('the numbers that manage a store', () => {
  test('cleaned, without blanks or the same number twice', () => {
    assert.deepEqual(managerPhones(['0535 257 41 34', '+905352574134', '', null, '+905313451175']), ['+905352574134', '+905313451175'])
  })

  test('an unfinished number is left out', () => {
    assert.deepEqual(managerPhones(['+90', '+90 53']), [])
  })
})
