'use client'

import { useEffect, useState } from 'react'
import { getStoreStatus, type StoreStatus } from '@/utils/storeStatus'

/** Computed in the browser because the page itself can be cached for hours. */
export default function StoreStatusLine({ restaurant }: { restaurant: any }) {
  const [status, setStatus] = useState<StoreStatus | null>(null)

  useEffect(() => {
    setStatus(getStoreStatus(restaurant))
  }, [restaurant])

  if (!status) return null

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${status.dotClass}`} />
      <span className="font-bold text-slate-700">{status.statusText}</span>
      {status.subText && <span className="text-[10px] text-slate-400 font-bold">({status.subText})</span>}
    </div>
  )
}
