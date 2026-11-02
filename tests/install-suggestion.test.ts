import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldSuggestInstall } from '../src/utils/installSuggestion.ts'

const DAY = 24 * 60 * 60 * 1000
const now = 1_000 * DAY

describe('shouldSuggestInstall', () => {
  it('stays quiet for new visitors', () => {
    assert.equal(shouldSuggestInstall(1, null, now), false)
    assert.equal(shouldSuggestInstall(2, null, now), false)
  })

  it('suggests to returning visitors', () => {
    assert.equal(shouldSuggestInstall(3, null, now), true)
  })

  it('stays quiet for 60 days after a dismissal', () => {
    assert.equal(shouldSuggestInstall(10, now - 59 * DAY, now), false)
    assert.equal(shouldSuggestInstall(10, now - 61 * DAY, now), true)
  })
})
