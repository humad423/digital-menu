import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { useCartStore } from '../src/store/cartStore.ts'
import { getDeliveryFeeForDistance } from '../src/utils/distance.ts'
import { matchesSearch } from '../src/utils/text.ts'

describe('matchesSearch', () => {
  it('ignores Arabic letter variants', () => {
    assert.equal(matchesSearch('احمد', 'مطعم أحمد'), true)
    assert.equal(matchesSearch('شاورمة', 'شاورمه دجاج'), true)
    assert.equal(matchesSearch('مقلى', 'بطاطا مقلي'), true)
  })

  it('checks every field and allows an empty query', () => {
    assert.equal(matchesSearch('دجاج', 'برجر', 'برجر دجاج مشوي'), true)
    assert.equal(matchesSearch('سمك', 'برجر', null), false)
    assert.equal(matchesSearch('', 'أي شيء'), true)
  })
})

describe('cart', () => {
  beforeEach(() => useCartStore.getState().clearCart())

  it('stores only what the order needs', () => {
    const heavyItem = { id: 'a', name: 'برجر', price: 10, images: ['x'], description: 'y' }
    useCartStore.getState().addItem(heavyItem, 'store-1')
    assert.deepEqual(useCartStore.getState().items, [{ id: 'a', name: 'برجر', price: 10, quantity: 1 }])
  })

  it('keeps each size as its own line', () => {
    const { addItem } = useCartStore.getState()
    addItem({ id: 'shirt|M', name: 'قميص (مقاس M)', price: 5 }, 'store-1')
    addItem({ id: 'shirt|L', name: 'قميص (مقاس L)', price: 5 }, 'store-1')
    addItem({ id: 'shirt|M', name: 'قميص (مقاس M)', price: 5 }, 'store-1')
    assert.deepEqual(useCartStore.getState().items.map(i => [i.id, i.quantity]), [['shirt|M', 2], ['shirt|L', 1]])
  })

  it('does not change earlier state objects when adding', () => {
    const { addItem } = useCartStore.getState()
    addItem({ id: 'a', name: 'برجر', price: 10 }, 'store-1')
    const before = useCartStore.getState().items[0]
    addItem({ id: 'a', name: 'برجر', price: 10 }, 'store-1')
    assert.equal(before.quantity, 1)
  })

  it('forgets the store once the last item is removed', () => {
    const { addItem, updateQuantity } = useCartStore.getState()
    addItem({ id: 'a', name: 'برجر', price: 10 }, 'store-1')
    updateQuantity('a', 0)
    assert.equal(useCartStore.getState().restaurantId, null)
  })
})

describe('getDeliveryFeeForDistance', () => {
  const tiers = [{ min_km: 0, max_km: 5, fee: 50, is_active: true }]

  it('returns the matching tier fee', () => {
    assert.deepEqual(
      [getDeliveryFeeForDistance(3, tiers).available, getDeliveryFeeForDistance(3, tiers).fee],
      [true, 50]
    )
  })

  it('reports out of range past the last tier', () => {
    assert.equal(getDeliveryFeeForDistance(9, tiers).available, false)
  })

  it('marks a store without tiers as having no known fee', () => {
    assert.equal(getDeliveryFeeForDistance(3, [], 10).hasTiers, false)
  })
})
