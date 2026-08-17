'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { X, Download, Printer, Copy, Check, QrCode as QrIcon, Layout } from 'lucide-react'
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

export default function StoreQrModal({ isOpen, onClose, restaurant }: StoreQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [template, setTemplate] = useState<'stand' | 'clean'>('stand')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const brandColor = restaurant.primary_color || '#F97316'
  const qrColor = '#0f172a' // Classic black QR for best scanning
  const menuUrl = getMainDomainMenuUrl(restaurant.slug)
  const qrTargetUrl = `${menuUrl}${menuUrl.includes('?') ? '&' : '?'}source=qr`

  // Draw preview on modal canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 260
    canvas.width = size
    canvas.height = size

    QRCode.toCanvas(
      canvas,
      qrTargetUrl,
      {
        width: size,
        margin: 2,
        color: {
          dark: qrColor,
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error('Error generating QR:', error)
          return
        }

        // Overlay store logo if available
        if (restaurant.logo_url) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const logoSize = size * 0.24
            const x = (size - logoSize) / 2
            const y = (size - logoSize) / 2

            // White background circle with shadow
            ctx.save()
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, (logoSize / 2) + 4, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = 'rgba(0,0,0,0.15)'
            ctx.shadowBlur = 6
            ctx.fill()
            ctx.restore()

            // Outer border with store primary color
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, (logoSize / 2) + 2, 0, Math.PI * 2)
            ctx.strokeStyle = brandColor
            ctx.lineWidth = 2.5
            ctx.stroke()

            // Clip logo
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
  }, [isOpen, brandColor, restaurant.logo_url, qrTargetUrl])

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
        color: { dark: qrColor, light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })

      if (restaurant.logo_url) {
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
            ctx.shadowColor = 'rgba(0,0,0,0.18)'
            ctx.shadowBlur = 15 * scale
            ctx.fill()
            ctx.restore()

            ctx.beginPath()
            ctx.arc(baseSize / 2, baseSize / 2, (logoSize / 2) + (4 * scale), 0, Math.PI * 2)
            ctx.strokeStyle = brandColor
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

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height)
      bgGrad.addColorStop(0, '#0f172a')
      bgGrad.addColorStop(1, '#1e293b')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Top Decorative Banner with primary color
      ctx.fillStyle = brandColor
      ctx.fillRect(0, 0, width, 16)

      // Inner Card Frame
      const cardMargin = 60
      const cardWidth = width - (cardMargin * 2)
      const cardHeight = height - (cardMargin * 2)
      
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur = 35
      ctx.shadowOffsetY = 15
      roundRect(ctx, cardMargin, cardMargin, cardWidth, cardHeight, 36)
      ctx.fill()
      ctx.restore()

      // Inner Border
      ctx.save()
      ctx.strokeStyle = '#f1f5f9'
      ctx.lineWidth = 3
      roundRect(ctx, cardMargin + 18, cardMargin + 18, cardWidth - 36, cardHeight - 36, 28)
      ctx.stroke()
      ctx.restore()

      // Header: Store Logo + Name
      let currentY = 125
      if (restaurant.logo_url) {
        await new Promise<void>((resolve) => {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'
          logoImg.onload = () => {
            const logoSize = 130
            const logoX = (width - logoSize) / 2
            const logoY = 125
            
            ctx.save()
            ctx.beginPath()
            ctx.arc(width / 2, logoY + (logoSize / 2), (logoSize / 2) + 6, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = 'rgba(0,0,0,0.12)'
            ctx.shadowBlur = 12
            ctx.fill()
            ctx.restore()

            ctx.save()
            ctx.beginPath()
            ctx.arc(width / 2, logoY + (logoSize / 2), logoSize / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
            ctx.restore()

            // Outer ring with brand color
            ctx.beginPath()
            ctx.arc(width / 2, logoY + (logoSize / 2), (logoSize / 2) + 4, 0, Math.PI * 2)
            ctx.strokeStyle = brandColor
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

      // Store Name
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
      ctx.fillStyle = `${brandColor}18`
      const badgeWidth = 460
      const badgeHeight = 52
      roundRect(ctx, (width - badgeWidth) / 2, currentY, badgeWidth, badgeHeight, 26)
      ctx.fill()
      ctx.fillStyle = brandColor
      ctx.font = 'bold 24px Tajawal, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('📱 امسح لعرض قائمة المنيو والطلب', width / 2, currentY + (badgeHeight / 2))
      ctx.restore()
      currentY += badgeHeight + 42

      // QR Code Area (Classic crisp black)
      const qrBoxSize = 640
      const qrCanvas = document.createElement('canvas')
      await QRCode.toCanvas(qrCanvas, qrTargetUrl, {
        width: qrBoxSize,
        margin: 2,
        color: { dark: qrColor, light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })

      if (restaurant.logo_url) {
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
            qrCtx.strokeStyle = brandColor
            qrCtx.lineWidth = 3.5
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs" style={{ background: brandColor }}>
              <QrIcon size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">رمز الـ QR للمتجر</h2>
              <p className="text-[11px] text-slate-400 font-medium">{restaurant.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Compact Mini Preview Card */}
          <div className="flex justify-center">
            <div className="w-full max-w-[240px] bg-slate-900 p-3.5 rounded-2xl shadow-lg border border-slate-800 flex flex-col items-center text-center">
              
              {template === 'stand' && (
                <div className="mb-2 w-full flex flex-col items-center">
                  {restaurant.logo_url ? (
                    <div className="w-9 h-9 rounded-full bg-white p-0.5 border-2 mx-auto mb-1 overflow-hidden shadow-xs" style={{ borderColor: brandColor }}>
                      <img src={restaurant.logo_url} alt="" className="w-full h-full object-contain rounded-full" />
                    </div>
                  ) : null}
                  <h4 className="text-white text-xs font-black truncate max-w-[190px]">{restaurant.name}</h4>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: `${brandColor}25`, color: '#fdba74' }}>
                    📱 امسح لعرض المنيو
                  </span>
                </div>
              )}

              {/* QR Canvas */}
              <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-100 flex items-center justify-center w-full aspect-square">
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
              </div>

              <div className="mt-2 text-[10px] text-slate-400 font-mono dir-ltr truncate max-w-full">
                alfsouq.com/m/{restaurant.slug}
              </div>
            </div>
          </div>

          {/* Template Style Selector */}
          <div>
            <label className="text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1">
              <Layout size={13} className="text-orange-500" />
              <span>نمط العرض</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('stand')}
                className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer text-center ${
                  template === 'stand'
                    ? 'border-orange-500 bg-orange-50/70 text-orange-950 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                🏷️ ستاند طاولة مخصص
              </button>

              <button
                type="button"
                onClick={() => setTemplate('clean')}
                className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer text-center ${
                  template === 'clean'
                    ? 'border-orange-500 bg-orange-50/70 text-orange-950 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                ⚡ رمز QR فقط
              </button>
            </div>
          </div>

          {/* Direct Link Copy Box */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-bold mb-0.5">رابط المنيو المباشر:</p>
              <p className="text-xs font-bold text-slate-800 truncate dir-ltr text-right">{qrTargetUrl}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
            </button>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Printer size={14} />
            <span>طباعة 🖨️</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={downloading}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-60"
          >
            <Download size={14} />
            <span>{downloading ? 'جاري التحميل...' : 'تحميل صورة (PNG)'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
