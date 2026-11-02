'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { matchesSearch } from '@/utils/text'
import { zonesForCustomer } from '@/utils/zones'

// With this many areas a plain list gets long, so a search box appears
const SEARCH_ABOVE = 6

/** The two ways to say where you are: GPS, or tapping a named area near you. */
export default function LocationPicker({
  zones,
  gpsPosition,
  locating,
  onUseGps,
  onSelectZone,
}: {
  zones: any[]
  gpsPosition: { lat: number; lng: number } | null
  locating: boolean
  onUseGps: () => void
  onSelectZone: (zone: any) => void
}) {
  const [query, setQuery] = useState('')
  const available = zonesForCustomer(zones, gpsPosition)
  const shown = available.filter(zone => matchesSearch(query, zone.name))

  return (
    <div className="space-y-3">
      {/* Always available, so someone who has moved is never stuck on an old position */}
      <button
        onClick={onUseGps}
        disabled={locating}
        className={gpsPosition ? 'btn btn-secondary btn-block' : 'btn btn-primary btn-block btn-lg'}
      >
        <MapPin size={20} />
        <span>{locating ? 'جاري تحديد موقعك...' : gpsPosition ? 'تحديث موقعي' : 'استخدم موقعي الحالي'}</span>
      </button>

      {available.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold">{gpsPosition ? 'المناطق القريبة منك:' : 'أو اختر منطقتك:'}</p>

          {available.length > SEARCH_ABOVE && (
            <div>
              <label htmlFor="zone-search" className="sr-only">ابحث عن منطقتك</label>
              <input
                id="zone-search"
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="اكتب اسم منطقتك"
                className="field"
              />
            </div>
          )}

          {shown.map(zone => (
            <button key={zone.id} onClick={() => onSelectZone(zone)} className="btn btn-secondary btn-block">
              {zone.name}
            </button>
          ))}

          {shown.length === 0 && <p className="notice notice-info">لا توجد منطقة بهذا الاسم.</p>}
        </div>
      )}
    </div>
  )
}
