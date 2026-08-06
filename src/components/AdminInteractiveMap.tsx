'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Store, MapPin, Flame, Eye, Filter, Layers, Navigation, Maximize2, Minimize2, X, CircleDot, RotateCcw } from 'lucide-react'
import { getStoreStatus } from '@/utils/storeStatus'

declare global {
  interface Window {
    toggleMapItemCircle?: (key: string) => void
  }
}

interface AdminInteractiveMapProps {
  restaurants: any[]
  serviceZones: any[]
  platformAds: any[]
}

export default function AdminInteractiveMap({
  restaurants = [],
  serviceZones = [],
  platformAds = []
}: AdminInteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)

  const [mounted, setMounted] = useState(false)
  const [showStores, setShowStores] = useState(true)
  const [showZones, setShowZones] = useState(true)
  const [showAds, setShowAds] = useState(true)
  const [showAllRadiusCircles, setShowAllRadiusCircles] = useState(false)
  const [enabledCircleKeys, setEnabledCircleKeys] = useState<string[]>([])
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Filter items with valid coordinates
  const validStores = restaurants.filter(r => r.latitude && r.longitude && !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude)))
  const validZones = serviceZones.filter(z => z.latitude && z.longitude && !isNaN(Number(z.latitude)) && !isNaN(Number(z.longitude)))
  const validAds = platformAds.filter(a => a.latitude && a.longitude && !isNaN(Number(a.latitude)) && !isNaN(Number(a.longitude)))

  // Calculate center
  const defaultLat = validStores[0]?.latitude || validZones[0]?.latitude || 41.0082
  const defaultLng = validStores[0]?.longitude || validZones[0]?.longitude || 28.9784

  useEffect(() => {
    setMounted(true)
    window.toggleMapItemCircle = (key: string) => {
      setEnabledCircleKeys(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      )
    }
    return () => {
      delete window.toggleMapItemCircle
    }
  }, [])

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFullScreen])

  // Listen to Esc key for closing fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen])

  // Invalidate Map Size on Fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize()
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [isFullScreen])

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize Leaflet Map if not already initialized
    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 12,
        zoomControl: false
      })

      L.control.zoom({ position: 'topright' }).addTo(map)

      // OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)

      const layerGroup = L.layerGroup().addTo(map)
      layerGroupRef.current = layerGroup
      leafletMapRef.current = map
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [isFullScreen])

  // Render Map Layers when filters or data change
  useEffect(() => {
    const map = leafletMapRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()
    const bounds: L.LatLngExpression[] = []

    // 1. Render Service Zones
    if (showZones) {
      validZones.forEach(zone => {
        const lat = Number(zone.latitude)
        const lng = Number(zone.longitude)
        const radiusKm = Number(zone.radius_km) || 15
        const radiusMeters = radiusKm * 1000
        const zoneKey = `zone-${zone.id}`
        const isCircleEnabled = showAllRadiusCircles || enabledCircleKeys.includes(zoneKey)
        bounds.push([lat, lng])

        // Zone Circle (if enabled for this zone or all)
        if (isCircleEnabled) {
          L.circle([lat, lng], {
            radius: radiusMeters,
            color: '#2563EB',
            fillColor: '#3B82F6',
            fillOpacity: 0.22,
            weight: 2.5,
            dashArray: '6, 6'
          }).addTo(layerGroup)
        }

        // Zone Marker Icon
        const zoneIcon = L.divIcon({
          className: 'custom-leaflet-zone-icon',
          html: `
            <div style="
              background: ${isCircleEnabled ? '#1D4ED8' : '#2563EB'};
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 900;
              border: 2px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              white-space: nowrap;
              cursor: pointer;
            ">
              📍 ${zone.name} ${isCircleEnabled ? '⭕' : ''}
            </div>
          `,
          iconSize: [110, 28],
          iconAnchor: [55, 14]
        })

        const zoneMarker = L.marker([lat, lng], { icon: zoneIcon }).addTo(layerGroup)

        zoneMarker.bindPopup(`
          <div style="direction: rtl; font-family: inherit; text-align: right; min-width: 190px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 900; color: #1E3A8A; font-size: 13px;">
              📍 <span>منطقة: ${zone.name}</span>
            </div>
            <p style="margin-top: 4px; font-size: 11px; color: #4B5563; font-weight: 700;">
              نطاق التغطية الجغرافية: <b>${radiusKm} كم (${radiusMeters.toLocaleString()} متر)</b>
            </p>
            <div style="margin-top: 4px; margin-bottom: 8px;">
              <span style="background: ${zone.is_active ? '#DCFCE7' : '#FEE2E2'}; color: ${zone.is_active ? '#15803D' : '#B91C1C'}; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 12px;">
                ${zone.is_active ? 'نشطة' : 'معطلة'}
              </span>
            </div>
            <button
              onclick="window.toggleMapItemCircle('${zoneKey}')"
              style="
                width: 100%;
                padding: 6px 10px;
                border-radius: 8px;
                font-weight: 900;
                font-size: 11px;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.2s;
                background: ${isCircleEnabled ? '#FEF2F2' : '#EFF6FF'};
                color: ${isCircleEnabled ? '#DC2626' : '#2563EB'};
                border: 1.5px solid ${isCircleEnabled ? '#FECACA' : '#BFDBFE'};
              "
            >
              ${isCircleEnabled ? 'إلغاء/إخفاء دائرة النطاق ✕' : 'رسم/إظهار دائرة النطاق ⭕ (' + radiusKm + ' كم)'}
            </button>
          </div>
        `)
      })
    }

    // 2. Render Stores
    if (showStores) {
      validStores.forEach(store => {
        const lat = Number(store.latitude)
        const lng = Number(store.longitude)
        const radiusKm = Number(store.delivery_radius_km) || 5
        const radiusMeters = radiusKm * 1000
        const storeKey = `store-${store.id}`
        const isCircleEnabled = store.has_delivery !== false && (showAllRadiusCircles || enabledCircleKeys.includes(storeKey))
        bounds.push([lat, lng])

        const status = getStoreStatus(store)

        // Store Delivery Circle (if enabled for this store or all)
        if (isCircleEnabled) {
          L.circle([lat, lng], {
            radius: radiusMeters,
            color: '#F97316',
            fillColor: '#F97316',
            fillOpacity: 0.16,
            weight: 2
          }).addTo(layerGroup)
        }

        // Custom HTML Marker for Store
        const storeIconEmoji = store.store_type === 'supermarket' ? '🛒' : store.store_type === 'clothing' ? '👗' : store.store_type === 'other' ? '🎁' : '🍔'
        const customIcon = L.divIcon({
          className: 'custom-leaflet-store-icon',
          html: `
            <div style="
              width: 38px; height: 38px;
              border-radius: 14px;
              background: #0F172A;
              border: 2.5px solid ${isCircleEnabled ? '#F97316' : 'white'};
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center;
              font-size: 18px;
              cursor: pointer;
              position: relative;
            ">
              ${store.logo_url ? `<img src="${store.logo_url}" style="width:100%; height:100%; object-fit:cover; border-radius:11px;" />` : storeIconEmoji}
              ${isCircleEnabled ? '<span style="position:absolute; top:-4px; right:-4px; background:#F97316; color:white; width:14px; height:14px; border-radius:50%; font-size:9px; display:flex; align-items:center; justify-content:center; border:1px solid white;">⭕</span>' : ''}
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        })

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layerGroup)

        marker.bindPopup(`
          <div style="direction: rtl; font-family: inherit; min-width: 190px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              ${store.logo_url ? `<img src="${store.logo_url}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;" />` : `<div style="font-size: 20px;">${storeIconEmoji}</div>`}
              <div>
                <h4 style="margin: 0; font-weight: 900; font-size: 13px; color: #0F172A;">${store.name}</h4>
                <span style="font-size: 10px; color: #64748B; font-weight: 700;">/m/${store.slug}</span>
              </div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;">
              <span style="background: #F1F5F9; color: #334155; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 8px;">
                ${storeIconEmoji} ${store.store_type === 'supermarket' ? 'سوبر ماركت' : store.store_type === 'clothing' ? 'ألبسة' : store.store_type === 'other' ? 'متجر' : 'مطعم'}
              </span>
              <span style="background: ${status.isOpen ? '#DCFCE7' : '#FEE2E2'}; color: ${status.isOpen ? '#15803D' : '#B91C1C'}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 8px;">
                ${status.statusText}
              </span>
            </div>
            <p style="margin: 4px 0; font-size: 11px; color: #475569; font-weight: 700;">
              🛵 نطاق التوصيل: <b>${radiusKm} كم (${radiusMeters.toLocaleString()} متر)</b>
            </p>
            ${store.has_delivery !== false ? `
              <button
                onclick="window.toggleMapItemCircle('${storeKey}')"
                style="
                  width: 100%;
                  margin-top: 4px;
                  padding: 6px 10px;
                  border-radius: 8px;
                  font-weight: 900;
                  font-size: 11px;
                  cursor: pointer;
                  font-family: inherit;
                  transition: all 0.2s;
                  background: ${isCircleEnabled ? '#FEF2F2' : '#FFF7ED'};
                  color: ${isCircleEnabled ? '#DC2626' : '#C2410C'};
                  border: 1.5px solid ${isCircleEnabled ? '#FECACA' : '#FFEDD5'};
                "
              >
                ${isCircleEnabled ? 'إلغاء/إخفاء دائرة التوصيل ✕' : 'رسم/إظهار دائرة التوصيل ⭕ (' + radiusKm + ' كم)'}
              </button>
            ` : ''}
            <a href="/admin/restaurant/${store.id}" style="display: block; text-align: center; background: #0F172A; color: white; text-decoration: none; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; margin-top: 6px;">
              إدارة المنيو والعروض ⟵
            </a>
          </div>
        `)
      })
    }

    // 3. Render Platform Slider Ads
    if (showAds) {
      validAds.forEach(ad => {
        const lat = Number(ad.latitude)
        const lng = Number(ad.longitude)
        const radiusKm = Number(ad.radius_km) || 10
        const radiusMeters = radiusKm * 1000
        const adKey = `ad-${ad.id}`
        const isCircleEnabled = showAllRadiusCircles || enabledCircleKeys.includes(adKey)
        bounds.push([lat, lng])

        // Ad Target Circle (if enabled for this ad or all)
        if (isCircleEnabled) {
          L.circle([lat, lng], {
            radius: radiusMeters,
            color: '#F59E0B',
            fillColor: '#F59E0B',
            fillOpacity: 0.2,
            weight: 2,
            dashArray: '3, 3'
          }).addTo(layerGroup)
        }

        // Custom HTML Marker for Ad
        const adIcon = L.divIcon({
          className: 'custom-leaflet-ad-icon',
          html: `
            <div style="
              width: 34px; height: 34px;
              border-radius: 50%;
              background: #F59E0B;
              border: 2.5px solid ${isCircleEnabled ? '#F59E0B' : 'white'};
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center;
              font-size: 16px;
              color: white;
              cursor: pointer;
            ">
              📣
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        })

        const marker = L.marker([lat, lng], { icon: adIcon }).addTo(layerGroup)

        marker.bindPopup(`
          <div style="direction: rtl; font-family: inherit; max-width: 200px; padding: 4px;">
            <div style="font-weight: 900; color: #D97706; font-size: 12px; margin-bottom: 4px;">
              📣 إعلان سلايدر موجه
            </div>
            ${ad.image_url ? `<img src="${ad.image_url}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />` : ''}
            <p style="margin: 2px 0; font-size: 11px; color: #374151; font-weight: 700;">
              المنطقة المستهدفة: <b>${ad.target_region || 'محددة بالخريطة'}</b>
            </p>
            <p style="margin: 2px 0; font-size: 11px; color: #374151; font-weight: 700; margin-bottom: 6px;">
              نطاق البث: <b>${radiusKm} كم (${radiusMeters.toLocaleString()} متر)</b>
            </p>
            <button
              onclick="window.toggleMapItemCircle('${adKey}')"
              style="
                width: 100%;
                padding: 6px 10px;
                border-radius: 8px;
                font-weight: 900;
                font-size: 11px;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.2s;
                background: ${isCircleEnabled ? '#FEF2F2' : '#FFFBEB'};
                color: ${isCircleEnabled ? '#DC2626' : '#D97706'};
                border: 1.5px solid ${isCircleEnabled ? '#FECACA' : '#FDE68A'};
              "
            >
              ${isCircleEnabled ? 'إلغاء/إخفاء دائرة النطاق ✕' : 'رسم/إظهار دائرة النطاق ⭕ (' + radiusKm + ' كم)'}
            </button>
          </div>
        `)
      })
    }

    // Auto-fit map bounds if there are items
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 })
    }
  }, [showStores, showZones, showAds, showAllRadiusCircles, enabledCircleKeys, restaurants, serviceZones, platformAds, isFullScreen])

  const mapContent = (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-[99999] bg-slate-900 flex flex-col w-screen h-screen overflow-hidden'
          : 'c-card overflow-hidden shadow-xl border border-slate-200'
      }
      dir="rtl"
    >
      {/* Map Control Bar Header */}
      <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
            🗺️
          </div>
          <div>
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <span>الخريطة التفاعلية الفاخرة للمنصة</span>
              {isFullScreen && (
                <span className="bg-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                  وضع ملء الشاشة الكامل ⛶
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              انقر على أي محل أو منطقة لتفعيل دائرة نطاقها المخصصة ⭕
            </p>
          </div>
        </div>

        {/* Enabled Circles Active Reset Counter */}
        {enabledCircleKeys.length > 0 && !showAllRadiusCircles && (
          <div className="bg-slate-800 text-orange-400 border border-orange-500/40 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm animate-fade-in">
            <span>⭕ الدوائر المفعلة حالياً: ({enabledCircleKeys.length})</span>
            <button
              type="button"
              onClick={() => setEnabledCircleKeys([])}
              className="text-red-400 hover:text-red-300 font-black text-xs flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20"
              title="إلغاء تفعيل جميع الدوائر"
            >
              <RotateCcw size={11} />
              <span>مسح الدوائر</span>
            </button>
          </div>
        )}

        {/* Layer Filters & Fullscreen Toggle */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setShowStores(!showStores)}
            className={`px-3 py-1.5 rounded-xl font-black transition border flex items-center gap-1.5 cursor-pointer ${
              showStores
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>🏪 المتاجر ({validStores.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowZones(!showZones)}
            className={`px-3 py-1.5 rounded-xl font-black transition border flex items-center gap-1.5 cursor-pointer ${
              showZones
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>📍 المناطق الجغرافية ({validZones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAds(!showAds)}
            className={`px-3 py-1.5 rounded-xl font-black transition border flex items-center gap-1.5 cursor-pointer ${
              showAds
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>📣 إعلانات السلايدر ({validAds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAllRadiusCircles(!showAllRadiusCircles)}
            className={`px-3 py-1.5 rounded-xl font-black transition border flex items-center gap-1.5 cursor-pointer ${
              showAllRadiusCircles
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>{showAllRadiusCircles ? '⭕ إخفاء كافة الدوائر' : '⭕ إظهار كافة الدوائر معا'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs flex items-center gap-1.5 transition shadow-sm ml-1 active:scale-95 cursor-pointer"
            title={isFullScreen ? 'إلغاء ملء الشاشة (Esc)' : 'تكبير الشاشة بالكامل'}
          >
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullScreen ? 'إغلاق ملء الشاشة ✕' : 'كامل الشاشة ⛶'}</span>
          </button>
        </div>
      </div>

      {/* Leaflet Map Element */}
      <div className={`relative w-full bg-slate-100 ${isFullScreen ? 'flex-1 h-full min-h-0' : 'h-[550px]'}`}>
        <div ref={mapRef} className="w-full h-full z-10" />

        {/* Floating Legend Overlay at bottom left */}
        <div className="absolute bottom-6 left-6 z-20 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-white/10 shadow-2xl text-[11px] font-bold space-y-1.5 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 border border-white" />
            <span>🏪 انقر على المتجر واستخدم زر رسم الدائرة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
            <span>📍 انقر على المنطقة واستخدم زر رسم الدائرة</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white" />
            <span>📣 انقر على الإعلان واستخدم زر رسم الدائرة</span>
          </div>
        </div>
      </div>
    </div>
  )

  if (isFullScreen && mounted) {
    return createPortal(mapContent, document.body)
  }

  return mapContent
}
