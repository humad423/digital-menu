'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

/** Loads the saved cart after mount, keeping the first client render equal to the server's. */
export default function CartHydrator() {
  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, [])
  return null
}
