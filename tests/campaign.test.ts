import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { campaignLink, isCampaignCode, isCampaignPath, newCampaignCode, readCampaignCode } from '../src/utils/campaignLinks.ts'

describe('campaign links', () => {
  test('the code is read from the address, and anything odd is ignored', () => {
    assert.equal(readCampaignCode('?c=fb-nov'), 'fb-nov')
    assert.equal(readCampaignCode('?c=FB-Nov&fbclid=abc'), 'fb-nov')
    assert.equal(readCampaignCode('?fbclid=abc&c=k7m2pq'), 'k7m2pq')
    assert.equal(readCampaignCode(''), null)
    assert.equal(readCampaignCode('?c='), null)
    assert.equal(readCampaignCode('?c=a'), null)
    assert.equal(readCampaignCode("?c=x'; drop"), null)
    assert.equal(readCampaignCode('?c=' + 'a'.repeat(33)), null)
  })

  test('codes and landing pages stay inside the site', () => {
    assert.ok(isCampaignCode('tiktok-1'))
    assert.ok(!isCampaignCode('Tik Tok'))
    assert.ok(isCampaignPath('/'))
    assert.ok(isCampaignPath('/m/halwayat-ariha'))
    assert.ok(!isCampaignPath('https://evil.example.com'))
    assert.ok(!isCampaignPath('//evil.example.com'.replace('//', '/\\')))
    assert.ok(!isCampaignPath('/m/x?y=1'))
  })

  test('the link to hand out', () => {
    assert.equal(campaignLink('https://alfsouq.com', '/m/halwayat-ariha', 'fb-nov'), 'https://alfsouq.com/m/halwayat-ariha?c=fb-nov')
    assert.equal(campaignLink('https://alfsouq.com', '/', 'k7m2pq'), 'https://alfsouq.com/?c=k7m2pq')
  })

  test('a new code is short and valid', () => {
    for (let i = 0; i < 50; i++) {
      const code = newCampaignCode()
      assert.equal(code.length, 6)
      assert.ok(isCampaignCode(code))
    }
  })
})
