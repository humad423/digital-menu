'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { X, Download, Printer, Copy, Check, Sparkles, QrCode as QrIcon, Palette, Layout, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { getMainDomainMenuUrl } from '@/utils/url'

interface StoreQrModalProps {
  isOpen: boolean
  onClose: () => void
  restaurant: {
    id: string
    name: string
    slug: string
    logo_url?: string | null
    primary_color?: string | null
  }
}

const PRESET_COLORS = [
  { name: 'هوية المتجر', value: 'auto' },
  { name: 'أسود كلاسيكي', value: '#0f172a' },
  { name: 'ذهبي فاخر', value: '#b45309' },
  { name: 'زمردي ملكي', value: '#047857' },
  { name: 'أزرق محيطي', value: '#1d4ed8' },
  { name: 'عنابي داكن', value: '#9f1239' },
  { name: 'بنفسجي راقي', value: '#6d28d9' },
]

export default function StoreQrModal({ isOpen, onClose, restaurant }: StoreQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedColor, setSelectedColor] = useState('auto')
  const [customColor, setCustomColor] = useState(restaurant.primary_color || '#F97316')
  const [includeLogo, setIncludeLogo] = useState(true)
  const [template, setTemplate] = useState<'stand' | 'clean' | 'badge'>('stand')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const activeColor = selectedColor === 'auto' ? (restaurant.primary_color || '#F97316') : (selectedColor === 'custom' ? customColor : selectedColor)
  const menuUrl = getMainDomainMenuUrl(restaurant.slug)
  const qrTargetUrl = `${menuUrl}${menuUrl.includes('?') ? '&' : '?'}source=qr`

  // Draw QR on canvas whenever options change
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 320
    canvas.width = size
    canvas.height = size

    // Generate basic QR code data
    QRCode.toCanvas(
      canvas,
      qrTargetUrl,
      {
        width: size,
        margin: 2,
        color: {
          dark: activeColor,
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error('Error generating QR:', error)
          return
        }

        // Overlay store logo if enabled and available
        if (includeLogo && restaurant.logo_url) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const logoSize = size * 0.24
            const x = (size - logoSize) / 2
            const y = (size - logoSize) / 2

            // Draw white background circle for logo with subtle shadow
            ctx.save()
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, (logoSize / 2) + 4, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = 'rgba(0,0,0,0.15)'
            ctx.shadowBlur = 8
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 2
            ctx.fill()
            ctx.restore()

            // Draw border matching QR color
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, (logoSize / 2) + 2, 0, Math.PI * 2)
            ctx.strokeStyle = activeColor
            ctx.lineWidth = 2
            ctx.stroke()

            // Clip circular logo
            ctx.save()
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, x, y, logoSize, logoSize)
            ctx.restore()
          }
          img.src = restaurant.logo_url
        }
      }
    )
  }, [isOpen, activeColor, includeLogo, restaurant.logo_url, qrTargetUrl])

  if (!isOpen) return null

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrTargetUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Render high-resolution export canvas (for download/print)
  const generateExportCanvas = async (scale = 3): Promise<HTMLCanvasElement> => {
    const exportCanvas = document.createElement('canvas')
    const ctx = exportCanvas.getContext('2d')!

    if (template === 'clean') {
      const baseSize = 800 * scale
      exportCanvas.width = baseSize
      exportCanvas.height = baseSize

      await QRCode.toCanvas(exportCanvas, qrTargetUrl, {
        width: baseSize,
        margin: 3,
        color: { dark: activeColor, light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })

      if (includeLogo && restaurant.logo_url) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const logoSize = baseSize * 0.24
            const x = (baseSize - logoSize) / 2
            const y = (baseSize - logoSize) / 2

            ctx.save()
            ctx.beginPath()
            ctx.arc(baseSize / 2, baseSize / 2, (logoSize / 2) + (10 * scale), 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = 'rgba(0,0,0,0.2)'
            ctx.shadowBlur = 15 * scale
            ctx.fill()
            ctx.restore()

            ctx.beginPath()
            ctx.arc(baseSize / 2, baseSize / 2, (logoSize / 2) + (4 * scale), 0, Math.PI * 2)
            ctx.strokeStyle = activeColor
            ctx.lineWidth = 4 * scale
            ctx.stroke()

            ctx.save()
            ctx.beginPath()
            ctx.arc(baseSize / 2, baseSize / 2, logoSize / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, x, y, logoSize, logoSize)
            ctx.restore()
            resolve()
          }
          img.onerror = () => resolve()
          img.src = restaurant.logo_url!
        })
      }
    } else {
      // Table Stand Poster layout (1200 x 1600 px)
      const width = 1200
      const height = 1600
      exportCanvas.width = width
      exportCanvas.height = height

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height)
      bgGrad.addColorStop(0, '#0f172a')
      bgGrad.addColorStop(1, '#1e293b')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Top Decorative Banner with primary color
      ctx.fillStyle = activeColor
      ctx.fillRect(0, 0, width, 18)

      // Inner Card Frame
      const cardMargin = 60
      const cardWidth = width - (cardMargin * 2)
      const cardHeight = height - (cardMargin * 2)
      
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 40
      ctx.shadowOffsetY = 20
      roundRect(ctx, cardMargin, cardMargin, cardWidth, cardHeight, 40)
      ctx.fill()
      ctx.restore()

      // Inner Border
      ctx.save()
      ctx.strokeStyle = '#f1f5f9'
      ctx.lineWidth = 4
      roundRect(ctx, cardMargin + 20, cardMargin + 20, cardWidth - 40, cardHeight - 40, 30)
      ctx.stroke()
      ctx.restore()

      // Header: Store Logo + Name
      let currentY = 120
      if (restaurant.logo_url) {
        await new Promise<void>((resolve) => {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'
          logoImg.onload = () => {
            const logoSize = 130
            const logoX = (width - logoSize) / 2
            const logoY = 120
            
            // White circular background for logo with shadow
            ctx.save()
            ctx.beginPath()
            ctx.arc(width / 2, logoY + (logoSize / 2), (logoSize / 2) + 6, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = 'rgba(0,0,0,0.15)'
            ctx.shadowBlur = 12
            ctx.fill()
            ctx.restore()

            // Clipped circular logo
            ctx.save()
            ctx.beginPath()
            ctx.arc(width / 2, logoY + (logoSize / 2), logoSize / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
            ctx.restore()

            // Outer ring matching primary color
            ctx.beginPath()
            ctx.arc(width / 2, logoY + (logoSize / 2), (logoSize / 2) + 4, 0, Math.PI * 2)
            ctx.strokeStyle = activeColor
            ctx.lineWidth = 4
            ctx.stroke()

            resolve()
          }
          logoImg.onerror = () => resolve()
          logoImg.src = restaurant.logo_url!
        })
        currentY = 280
      } else {
        currentY = 160
      }

      // Store Name with explicit top baseline
      ctx.save()
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 46px Tajawal, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(restaurant.name, width / 2, currentY)
      ctx.restore()
      currentY += 65

      // Call to action badge
      ctx.save()
      ctx.fillStyle = `${activeColor}18`
      const badgeWidth = 460
      const badgeHeight = 52
      roundRect(ctx, (width - badgeWidth) / 2, currentY, badgeWidth, badgeHeight, 26)
      ctx.fill()
      ctx.fillStyle = activeColor
      ctx.font = 'bold 24px Tajawal, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('📱 امسح لعرض قائمة المنيو والطلب', width / 2, currentY + (badgeHeight / 2))
      ctx.restore()
      currentY += badgeHeight + 42

      // QR Code Area
      const qrBoxSize = 640
      const qrCanvas = document.createElement('canvas')
      await QRCode.toCanvas(qrCanvas, qrTargetUrl, {
        width: qrBoxSize,
        margin: 2,
        color: { dark: activeColor, light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })

      if (includeLogo && restaurant.logo_url) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const qrCtx = qrCanvas.getContext('2d')!
            const logoSize = qrBoxSize * 0.22
            const lx = (qrBoxSize - logoSize) / 2
            const ly = (qrBoxSize - logoSize) / 2

            qrCtx.save()
            qrCtx.beginPath()
            qrCtx.arc(qrBoxSize / 2, qrBoxSize / 2, (logoSize / 2) + 8, 0, Math.PI * 2)
            qrCtx.fillStyle = '#ffffff'
            qrCtx.shadowColor = 'rgba(0,0,0,0.15)'
            qrCtx.shadowBlur = 10
            qrCtx.fill()
            qrCtx.restore()

            qrCtx.beginPath()
            qrCtx.arc(qrBoxSize / 2, qrBoxSize / 2, (logoSize / 2) + 3, 0, Math.PI * 2)
            qrCtx.strokeStyle = activeColor
            qrCtx.lineWidth = 3
            qrCtx.stroke()

            qrCtx.save()
            qrCtx.beginPath()
            qrCtx.arc(qrBoxSize / 2, qrBoxSize / 2, logoSize / 2, 0, Math.PI * 2)
            qrCtx.clip()
            qrCtx.drawImage(img, lx, ly, logoSize, logoSize)
            qrCtx.restore()
            resolve()
          }
          img.onerror = () => resolve()
          img.src = restaurant.logo_url!
        })
      }

      const qrX = (width - qrBoxSize) / 2
      ctx.drawImage(qrCanvas, qrX, currentY)
      currentY += qrBoxSize + 45

      // Instruction & Domain
      ctx.save()
      ctx.fillStyle = '#64748b'
      ctx.font = '500 24px Tajawal, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('وجّه كاميرا هاتفك نحو الرمز لتصفح المنتجات والعروض مباشرة', width / 2, currentY)
      currentY += 45

      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 22px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(menuUrl.replace(/^https?:\/\//, ''), width / 2, currentY)
      ctx.restore()
    }

    return exportCanvas
  }

  // Helper to draw rounded rectangle on canvas
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  const handleDownloadPng = async () => {
    try {
      setDownloading(true)
      const exportCanvas = await generateExportCanvas(2)
      const dataUrl = exportCanvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `QR_${restaurant.slug}_${template}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = async () => {
    try {
      const exportCanvas = await generateExportCanvas(2)
      const dataUrl = exportCanvas.toDataURL('image/png')
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <title>طباعة رمز الـ QR - ${restaurant.name}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: system-ui, -apple-system, sans-serif;
              background: #fff;
            }
            img {
              max-width: 100%;
              max-height: 90vh;
              object-fit: contain;
              border-radius: 12px;
            }
            @media print {
              body { padding: 0; }
              img { max-height: 100vh; width: auto; }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="QR Stand" onload="window.print(); window.close();" />
        </body>
        </html>
      `)
      printWindow.document.close()
    } catch (err) {
      console.error('Print failed:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs" style={{ background: activeColor }}>
              <QrIcon size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>رمز الـ QR المخصص للمتجر</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">احترافي ⚡</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">جاهز للطباعة على الطاولات والملصقات مع تتبع الزيارات</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Live Preview Column */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="w-full bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col items-center text-center relative overflow-hidden border border-slate-800">
                {/* Decorative glow */}
                <div 
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-40 pointer-events-none"
                  style={{ background: activeColor }}
                />

                {template === 'stand' && (
                  <div className="mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 p-0.5 border border-white/20 mx-auto mb-1.5 overflow-hidden flex items-center justify-center">
                      {restaurant.logo_url ? (
                        <img src={restaurant.logo_url} alt="" className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <span className="font-black text-xs text-white">{restaurant.name.charAt(0)}</span>
                      )}
                    </div>
                    <h4 className="text-white text-xs font-black truncate max-w-[170px]">{restaurant.name}</h4>
                    <p className="text-[10px] text-amber-400 font-bold mt-0.5">📱 امسح لعرض المنيو</p>
                  </div>
                )}

                {/* QR Canvas Preview */}
                <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100 flex items-center justify-center">
                  <canvas ref={canvasRef} className="w-48 h-48 sm:w-52 sm:h-52 object-contain" />
                </div>

                <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-400 font-bold dir-ltr">
                  <span>alfsouq.com/m/{restaurant.slug}</span>
                </div>
              </div>
            </div>

            {/* Customization Options Column */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Template Style Selector */}
              <div>
                <label className="text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                  <Layout size={14} className="text-orange-500" />
                  <span>نمط وتصميم العرض</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplate('stand')}
                    className={`p-2.5 rounded-2xl text-xs font-black border text-right transition cursor-pointer flex flex-col gap-1 ${
                      template === 'stand'
                        ? 'border-orange-500 bg-orange-50/60 text-orange-950 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span>🏷️ ستاند طاولة فاخر</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">بطاقة جاهزة مع اسم المتجر وشعاره</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplate('clean')}
                    className={`p-2.5 rounded-2xl text-xs font-black border text-right transition cursor-pointer flex flex-col gap-1 ${
                      template === 'clean'
                        ? 'border-orange-500 bg-orange-50/60 text-orange-950 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span>⚡ رمز كلاسيكي فقط</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">رمز الـ QR بدقة عالية بدون إطارات</span>
                  </button>
                </div>
              </div>

              {/* Color Customizer */}
              <div>
                <label className="text-xs font-black text-slate-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette size={14} className="text-orange-500" />
                    <span>لون الرمز (هوية المتجر)</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-400" dir="ltr">{activeColor}</span>
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => {
                    const isSelected = selectedColor === c.value
                    const sampleColor = c.value === 'auto' ? (restaurant.primary_color || '#F97316') : c.value

                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ background: sampleColor }} />
                        <span>{c.name}</span>
                      </button>
                    )
                  })}

                  {/* Custom color picker */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value)
                        setSelectedColor('custom')
                      }}
                      className="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      title="اختر لوناً مخصصاً"
                    />
                    <span className="text-[11px] font-bold text-slate-600 px-1">مخصص</span>
                  </div>
                </div>
              </div>

              {/* Logo Overlay Toggle */}
              {restaurant.logo_url && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-slate-500" />
                    <div>
                      <h5 className="text-xs font-black text-slate-800">تضمين شعار المتجر في المنتصف</h5>
                      <p className="text-[10px] text-slate-400 font-medium">يضيف لمسة احترافية مع المحافظة على سرعة المسح</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                </div>
              )}

              {/* Direct QR Link Copy Box */}
              <div className="p-3 bg-orange-50/70 border border-orange-100 rounded-2xl flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-orange-800 mb-0.5">رابط الـ QR المزود بكود التتبع:</p>
                  <p className="text-xs font-bold text-orange-950 truncate dir-ltr text-right">{qrTargetUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Sparkles size={14} className="text-amber-500" />
            <span>يتم تسجيل مسحات الزوار وإحصائياتها تلقائياً</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Printer size={15} />
              <span>طباعة فورية 🖨️</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md disabled:opacity-60"
            >
              <Download size={15} />
              <span>{downloading ? 'جاري التحميل...' : 'تحميل صورة عالية الدقة (PNG)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
