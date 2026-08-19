'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import { Settings, X, Clock, Calendar, Phone, Image, Store, Save, AlertCircle, Bike, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { DAYS_OF_WEEK } from '@/utils/storeStatus'
import { triggerRevalidate } from '@/utils/revalidate'

interface StoreSettingsModalProps {
  restaurant: any
  isOpen: boolean
  onClose: () => void
  onSaveSuccess: () => void
  restaurantSlug?: string
}

export default function StoreSettingsModal({
  restaurant,
  isOpen,
  onClose,
  onSaveSuccess,
  restaurantSlug,
}: StoreSettingsModalProps) {

  const [name, setName] = useState(restaurant?.name || '')
  const [phone, setPhone] = useState(restaurant?.phone || restaurant?.whatsapp_number || '')
  const [whatsappNumber, setWhatsappNumber] = useState(restaurant?.whatsapp_number || '')
  const [logoUrl, setLogoUrl] = useState(restaurant?.logo_url || '')
  const [coverUrl, setCoverUrl] = useState(restaurant?.cover_url || '')
  const [openingTime, setOpeningTime] = useState(restaurant?.opening_time || '09:00')
  const [closingTime, setClosingTime] = useState(restaurant?.closing_time || '23:00')
  const [daysOff, setDaysOff] = useState<string[]>(
    Array.isArray(restaurant?.days_off) ? restaurant.days_off : []
  )
  const [isOnHoliday, setIsOnHoliday] = useState<boolean>(!!restaurant?.is_on_holiday)
  const [holidayMessage, setHolidayMessage] = useState(restaurant?.holiday_message || '')
  const [menuNote, setMenuNote] = useState(restaurant?.menu_note || '')
  const [enableWhatsappOrders, setEnableWhatsappOrders] = useState<boolean>(restaurant?.enable_whatsapp_orders !== false)
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number>(Number(restaurant?.delivery_radius_km) || 15)
  const [deliveryTiers, setDeliveryTiers] = useState<any[]>(
    Array.isArray(restaurant?.delivery_tiers) ? restaurant.delivery_tiers : []
  )
  const [newTier, setNewTier] = useState({ min_km: '', max_km: '', fee: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Re-sync state every time the modal opens with fresh restaurant data
  useEffect(() => {
    if (isOpen && restaurant) {
      setName(restaurant.name || '')
      setPhone(restaurant.phone || restaurant.whatsapp_number || '')
      setWhatsappNumber(restaurant.whatsapp_number || '')
      setLogoUrl(restaurant.logo_url || '')
      setCoverUrl(restaurant.cover_url || '')
      setOpeningTime(restaurant.opening_time || '09:00')
      setClosingTime(restaurant.closing_time || '23:00')
      setDaysOff(Array.isArray(restaurant.days_off) ? restaurant.days_off : [])
      setIsOnHoliday(!!restaurant.is_on_holiday)
      setHolidayMessage(restaurant.holiday_message || '')
      setMenuNote(restaurant.menu_note || '')
      setEnableWhatsappOrders(restaurant.enable_whatsapp_orders !== false)
      setDeliveryRadiusKm(Number(restaurant.delivery_radius_km) || 15)
      setDeliveryTiers(Array.isArray(restaurant.delivery_tiers) ? restaurant.delivery_tiers : [])
      setErrorMsg('')
    }
  }, [isOpen, restaurant?.id])

  if (!isOpen || !restaurant) return null

  const toggleDayOff = (dayName: string) => {
    if (daysOff.includes(dayName)) {
      setDaysOff(daysOff.filter(d => d !== dayName))
    } else {
      setDaysOff([...daysOff, dayName])
    }
  }

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTier.min_km || !newTier.max_km || !newTier.fee) {
      setErrorMsg('يرجى ملء كافة حقول الشريحة (من كم - إلى كم - الأجرة)')
      return
    }
    const updated = [
      ...deliveryTiers,
      {
        min_km: parseFloat(newTier.min_km),
        max_km: parseFloat(newTier.max_km),
        fee: parseFloat(newTier.fee),
        is_active: newTier.is_active
      }
    ].sort((a, b) => a.min_km - b.min_km)

    setDeliveryTiers(updated)
    setNewTier({ min_km: '', max_km: '', fee: '', is_active: true })
    setErrorMsg('')
  }

  const toggleTierActive = (index: number) => {
    const updated = [...deliveryTiers]
    updated[index].is_active = !updated[index].is_active
    setDeliveryTiers(updated)
  }

  const deleteTier = (index: number) => {
    const updated = deliveryTiers.filter((_, i) => i !== index)
    setDeliveryTiers(updated)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      return setErrorMsg('اسم المتجر مطلوب')
    }

    if (restaurant?.is_subscription_active === false) {
      return setErrorMsg('⚠️ عذراً، اشتراك المتجر معلق حالياً. يرجى تجديد الاشتراك لتتمكن من تعديل الإعدادات.')
    }

    setSaving(true)
    setErrorMsg('')

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      whatsapp_number: whatsappNumber.trim() || phone.trim() || null,
      logo_url: logoUrl || null,
      cover_url: coverUrl || null,
      opening_time: openingTime,
      closing_time: closingTime,
      days_off: daysOff,
      is_on_holiday: isOnHoliday,
      holiday_message: holidayMessage.trim() || null,
      menu_note: menuNote.trim() || null,
      enable_whatsapp_orders: enableWhatsappOrders,
      delivery_radius_km: deliveryRadiusKm,
      delivery_tiers: deliveryTiers
    }

    try {
      const { error } = await supabase
        .from('restaurants')
        .update(payload)
        .eq('id', restaurant.id)

      if (error) {
        setErrorMsg('حدث خطأ أثناء حفظ الإعدادات: ' + error.message)
      } else {
        // Invalidate the public ISR cache so visitors see updated settings immediately
        triggerRevalidate(restaurantSlug ?? restaurant?.slug, 'menu')
        onSaveSuccess()
        onClose()
      }
    } catch (err: any) {
      setErrorMsg('حدث خطأ غير متوقع: ' + err?.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              ⚙️
            </div>
            <div>
              <h3 className="font-black text-sm text-white">إعدادات المتجر ونطاقات التوصيل</h3>
              <p className="text-[11px] text-slate-400 font-medium">الاسم، الهاتف، ساعات الدوام، العطلات، وشرايح التوصيل</p>
            </div>
          </div>

          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {restaurant?.is_subscription_active === false && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2 text-xs font-black text-amber-800">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>اشتراك المتجر معلق حالياً — لا يمكنك حفظ التعديلات حتى يتم تجديد الاشتراك.</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs font-black text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="f-label flex items-center gap-1 mb-1">
                <Store size={13} className="text-orange-500" />
                <span>اسم المتجر / المطعم *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="f-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="f-label flex items-center gap-1 mb-1">
                  <Phone size={13} className="text-orange-500" />
                  <span>رقم الهاتف للتواصل</span>
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
              <div>
                <label className="f-label flex items-center gap-1 mb-1">
                  <Phone size={13} className="text-orange-500" />
                  <span>رقم الواتساب للطلبات</span>
                </label>
                <input
                  type="text"
                  placeholder="053XXXXXX"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  className="f-input"
                  dir="ltr"
                />
              </div>
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

          {/* Delivery Radius & Tiers Section */}
          <div className="p-4 bg-orange-50/60 border border-orange-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                <Bike size={16} className="text-orange-500" />
                <span>إدارة شرائح التوصيل والتغطية 🛵</span>
              </h4>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">أقصى نطاق:</span>
                <input
                  type="number"
                  value={deliveryRadiusKm}
                  onChange={e => setDeliveryRadiusKm(Number(e.target.value))}
                  className="w-16 p-1 text-center bg-white border border-slate-300 rounded-lg text-xs font-black text-orange-600 outline-none"
                />
                <span className="text-xs font-bold text-slate-600">كم</span>
              </div>
            </div>

            {/* Add Tier Form */}
            <div className="p-3 bg-white border border-orange-200 rounded-xl space-y-2">
              <span className="text-[11px] font-black text-orange-700 block">إضافة شريحة جديدة:</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">من (كم)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={newTier.min_km}
                    onChange={e => setNewTier({ ...newTier, min_km: e.target.value })}
                    className="f-input text-center text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">إلى (كم)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="10"
                    value={newTier.max_km}
                    onChange={e => setNewTier({ ...newTier, max_km: e.target.value })}
                    className="f-input text-center text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">الأجرة TL</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="25"
                    value={newTier.fee}
                    onChange={e => setNewTier({ ...newTier, fee: e.target.value })}
                    className="f-input text-center text-xs font-bold text-emerald-600"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddTier}
                className="w-full mt-2 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1 active:scale-98"
              >
                <Plus size={14} />
                <span>إضافة شريحة</span>
              </button>
            </div>

            {/* Current Tiers List */}
            {deliveryTiers.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-black text-slate-700">الشرائح الحالية ({deliveryTiers.length}):</p>
                {deliveryTiers.map((tier, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTierActive(idx)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition ${
                          tier.is_active !== false
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}
                      >
                        {tier.is_active !== false ? 'مفعلة ✓' : 'معطلة ✕'}
                      </button>
                      <span className="text-xs font-black text-slate-800">
                        من <b className="text-orange-600">{tier.min_km}</b> كم إلى <b className="text-orange-600">{tier.max_km}</b> كم
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {tier.fee} ₺
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteTier(idx)}
                        className="text-slate-400 hover:text-red-500 transition p-1"
                        title="حذف الشريحة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 font-bold py-2">لا توجد شرائح توصيل مضافة بعد</p>
            )}
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

          {/* ── Bottom Controls: WhatsApp, Holiday, Note ── */}

          {/* WhatsApp Order Toggle */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                💬
              </div>
              <div>
                <h4 className="font-black text-xs text-slate-900">تفعيل زر الطلب عبر الواتساب</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  عند إيقاف هذا الخيار، سيظهر المنيو للزوار للعرض والتصفح فقط ولن يظهر زر إرسال الطلب.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableWhatsappOrders}
              onChange={e => setEnableWhatsappOrders(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
            />
          </div>

          {/* Holiday Emergency Toggle */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌴</span>
                <div>
                  <h4 className="font-black text-xs text-amber-900">وضع العطلة المؤقتة (إغلاق طارئ)</h4>
                  <p className="text-[10px] text-amber-700 font-medium">عند التفعيل سيظهر للمستخدمين أن المحل في عطلة ويمنع إرسال الطلبات</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isOnHoliday}
                onChange={e => setIsOnHoliday(e.target.checked)}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
              />
            </div>
            {isOnHoliday && (
              <input
                type="text"
                placeholder="رسالة العطلة (مثال: مغلق بمناسبة العيد السعيد)..."
                value={holidayMessage}
                onChange={e => setHolidayMessage(e.target.value)}
                className="f-input text-xs font-bold bg-white"
              />
            )}
          </div>

          {/* Menu Announcement / Note Strip */}
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📢</span>
                <div>
                  <h4 className="font-black text-xs text-slate-900">شريط ملاحظة / إعلان المنيو</h4>
                  <p className="text-[10px] text-slate-500 font-medium">يظهر كشريط رفيع وأنيق أعلى المنيو للزبائن</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${menuNote.length >= 100 ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-600 border border-slate-200'}`}>
                {menuNote.length} / 100 حرف
              </span>
            </div>
            <input
              type="text"
              maxLength={100}
              placeholder="مثال: يرجى كتابة ملاحظات الحساسية عند الطلب / عروض خاصة يومياً..."
              value={menuNote}
              onChange={e => setMenuNote(e.target.value.slice(0, 100))}
              className="f-input text-xs font-bold bg-white"
            />
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
