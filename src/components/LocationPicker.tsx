import { MapPin } from 'lucide-react'

/** The two ways to say where you are: GPS, or tapping a named area. */
export default function LocationPicker({
  zones,
  locating,
  onUseGps,
  onSelectZone,
}: {
  zones: any[]
  locating: boolean
  onUseGps: () => void
  onSelectZone: (zone: any) => void
}) {
  return (
    <div className="space-y-3">
      <button onClick={onUseGps} disabled={locating} className="btn btn-primary btn-block btn-lg">
        <MapPin size={20} />
        <span>{locating ? 'جاري تحديد موقعك...' : 'استخدم موقعي الحالي'}</span>
      </button>

      {zones.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold">أو اختر منطقتك:</p>
          {zones.map(zone => (
            <button key={zone.id} onClick={() => onSelectZone(zone)} className="btn btn-secondary btn-block">
              {zone.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
