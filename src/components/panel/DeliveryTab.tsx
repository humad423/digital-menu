'use client'

import { useState } from 'react'
import { CheckRow, type PanelStore } from '@/components/panel/shared'
import { supabase } from '@/lib/supabase'
import { notifyError, reportWriteResult } from '@/utils/notify'
import { triggerRevalidate } from '@/utils/revalidate'
import { CURRENCY_SYMBOL } from '@/config/site'

export default function DeliveryTab({ store }: { store: PanelStore }) {
  const { restaurantId, restaurant, refresh, canEdit } = store
  const [minKm, setMinKm] = useState('')
  const [maxKm, setMaxKm] = useState('')
  const [fee, setFee] = useState('')

  const tiers: any[] = Array.isArray(restaurant?.delivery_tiers) ? restaurant.delivery_tiers : []

  const updateStore = async (changes: Record<string, unknown>) => {
    if (!canEdit()) return false
    if (!reportWriteResult(await supabase.from('restaurants').update(changes).eq('id', restaurantId))) return false
    triggerRevalidate(restaurant?.slug, 'home', restaurantId)
    await refresh()
    return true
  }

  const addTier = async (event: React.FormEvent) => {
    event.preventDefault()
    const tier = { min_km: parseFloat(minKm), max_km: parseFloat(maxKm), fee: parseFloat(fee), is_active: true }
    if (!(tier.min_km >= 0) || !(tier.max_km > tier.min_km) || !(tier.fee >= 0)) {
      notifyError('تأكد من المسافات والسعر. المسافة «إلى» يجب أن تكون أكبر من «من».')
      return
    }
    const saved = await updateStore({ delivery_tiers: [...tiers, tier].sort((a, b) => a.min_km - b.min_km) })
    if (saved) {
      setMinKm('')
      setMaxKm('')
      setFee('')
    }
  }

  const removeTier = (index: number) => {
    if (confirm('حذف هذا السعر؟')) updateStore({ delivery_tiers: tiers.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <CheckRow
          label="أستقبل الطلبات على واتساب"
          checked={restaurant?.enable_whatsapp_orders !== false}
          onChange={checked => updateStore({ enable_whatsapp_orders: checked })}
        />
        <CheckRow
          label="أوفر خدمة التوصيل"
          checked={restaurant?.has_delivery !== false}
          onChange={checked => updateStore({ has_delivery: checked })}
        />
      </div>

      {restaurant?.has_delivery !== false && (
        <section className="space-y-3">
          <h3 className="section-title">سعر التوصيل حسب المسافة</h3>
          <p className="text-muted font-medium">
            إذا لم تضف أسعاراً، يرى الزبون «يوجد توصيل» ويتفق معك على السعر.
          </p>

          {tiers.map((tier, index) => (
            <article key={`${tier.min_km}-${tier.max_km}`} className="card p-3 flex items-center justify-between gap-3">
              <p className="font-bold">
                من {tier.min_km} إلى {tier.max_km} كم: {tier.fee === 0 ? 'مجاني' : `${tier.fee} ${CURRENCY_SYMBOL}`}
              </p>
              <button onClick={() => removeTier(index)} className="btn btn-danger btn-sm shrink-0">حذف</button>
            </article>
          ))}

          <form onSubmit={addTier} className="card p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="tier-min" className="field-label">من (كم)</label>
                <input id="tier-min" required type="number" inputMode="decimal" min="0" step="any" value={minKm} onChange={e => setMinKm(e.target.value)} className="field" />
              </div>
              <div>
                <label htmlFor="tier-max" className="field-label">إلى (كم)</label>
                <input id="tier-max" required type="number" inputMode="decimal" min="0" step="any" value={maxKm} onChange={e => setMaxKm(e.target.value)} className="field" />
              </div>
              <div>
                <label htmlFor="tier-fee" className="field-label">السعر</label>
                <input id="tier-fee" required type="number" inputMode="decimal" min="0" step="any" value={fee} onChange={e => setFee(e.target.value)} className="field" />
              </div>
            </div>
            <button type="submit" className="btn btn-secondary btn-block">إضافة سعر</button>
          </form>
        </section>
      )}
    </div>
  )
}
