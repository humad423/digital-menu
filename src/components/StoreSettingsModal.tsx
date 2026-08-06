'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import { Settings, X, Clock, Calendar, Phone, Image, Store, Save, AlertCircle } from 'lucide-react'
import { DAYS_OF_WEEK } from '@/utils/storeStatus'

interface StoreSettingsModalProps {
  restaurant: any
  isOpen: boolean
  onClose: () => void
  onSaveSuccess: () => void
}

export default function StoreSettingsModal({
  restaurant,
  isOpen,
  onClose,
  onSaveSuccess
}: StoreSettingsModalProps) {
  if (!isOpen || !restaurant) return null

  const [name, setName] = useState(restaurant.name || '')
  const [phone, setPhone] = useState(restaurant.phone || restaurant.whatsapp_number || '')
  const [whatsappNumber, setWhatsappNumber] = useState(restaurant.whatsapp_number || '')
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url || '')
  const [coverUrl, setCoverUrl] = useState(restaurant.cover_url || '')
  const [openingTime, setOpeningTime] = useState(restaurant.opening_time || '09:00')
  const [closingTime, setClosingTime] = useState(restaurant.closing_time || '23:00')
  const [daysOff, setDaysOff] = useState<string[]>(
    Array.isArray(restaurant.days_off) ? restaurant.days_off : []
  )
  const [isOnHoliday, setIsOnHoliday] = useState<boolean>(!!restaurant.is_on_holiday)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const toggleDayOff = (dayName: string) => {
    if (daysOff.includes(dayName)) {
      setDaysOff(daysOff.filter(d => d !== dayName))
    } else {
      setDaysOff([...daysOff, dayName])
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      return setErrorMsg('اسم المتجر مطلوب')
    }

    setSaving(true)
    setErrorMsg('')

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      whatsapp_number: whatsappNumber.trim() || phone.trim() || null,
      logo_url: logoUrl || null,
      cover_url: coverUrl || null,
      opening_time: openingTime || '09:00',
      closing_time: closingTime || '23:00',
      days_off: daysOff,
      is_on_holiday: isOnHoliday
    }

    const { error } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', restaurant.id)

    setSaving(false)

    if (error) {
      setErrorMsg('خطأ في حفظ الإعدادات: ' + error.message)
    } else {
      onSaveSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ⚙️
            </div>
            <div>
              <h3 className="font-black text-sm text-white">إعدادات المتجر وساعات الدوام</h3>
              <p className="text-[11px] text-slate-400 font-medium">{restaurant.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 hide-scrollbar">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 🌴 Temporary Holiday Toggle */}
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="font-black text-xs text-amber-900 flex items-center gap-1.5 cursor-pointer">
                <span>🌴</span> إغلاق مؤقت / في عطلة
              </label>
              <p className="text-[10px] text-amber-700 font-medium">
                تفعيل هذا الخيار سيظهر المتجر بحالة "في عطلة 🌴" للزبائن على المنصة فوراً.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isOnHoliday}
              onChange={e => setIsOnHoliday(e.target.checked)}
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          {/* Store Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="f-label flex items-center gap-1">
                <Store size={13} className="text-orange-500" />
                <span>اسم المتجر *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="f-input"
              />
            </div>
            <div>
              <label className="f-label flex items-center gap-1">
                <Phone size={13} className="text-orange-500" />
                <span>رقم التواصل / الواتساب</span>
              </label>
              <input
                type="text"
                placeholder="053XXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="f-input"
                dir="ltr"
              />
            </div>
          </div>

          {/* Working Hours */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
            <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
              <Clock size={14} className="text-orange-500" />
              <span>ساعات الدوام اليومية</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">وقت الفتح ⏰</label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={e => setOpeningTime(e.target.value)}
                  className="f-input text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">وقت الإغلاق 🌙</label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={e => setClosingTime(e.target.value)}
                  className="f-input text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Days Off */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
              <Calendar size={14} className="text-orange-500" />
              <span>أيام العطلة الأسبوعية</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">حدد الأيام التي يكون فيها المحل مغلقاً رسمياً:</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DAYS_OF_WEEK.map(day => {
                const isSelected = daysOff.includes(day.key)
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDayOff(day.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 border ${
                      isSelected
                        ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}{day.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Logo & Cover Images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="f-label flex items-center gap-1 mb-1">
                <Image size={13} className="text-orange-500" />
                <span>شعار المتجر (Logo)</span>
              </label>
              <ImageUpload value={logoUrl} onChange={url => setLogoUrl(url)} />
            </div>
            <div>
              <label className="f-label flex items-center gap-1 mb-1">
                <Image size={13} className="text-orange-500" />
                <span>غلاف المتجر (Cover)</span>
              </label>
              <ImageUpload value={coverUrl} onChange={url => setCoverUrl(url)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
            >
              <Save size={14} />
              <span>{saving ? 'حفظ...' : 'حفظ الإعدادات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
