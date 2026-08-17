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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [template, setTemplate] = useState<'stand' | 'clean'>('stand')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const brandColor = restaurant.primary_color || '#F97316'
  const qrColor = '#0f172a' // Classic black QR for best scanning
  const menuUrl = getMainDomainMenuUrl(restaurant.slug)
  const qrTargetUrl = `${menuUrl}${menuUrl.includes('?') ? '&' : '?'}source=qr`

  // Generate QR preview data URL once when modal opens
  useEffect(() => {
    if (!isOpen) return

    const generatePreview = async () => {
      try {
        const previewCanvas = document.createElement('canvas')
        const size = 320
        previewCanvas.width = size
        previewCanvas.height = size
        const ctx = previewCanvas.getContext('2d')
        if (!ctx) return

        await QRCode.toCanvas(previewCanvas, qrTargetUrl, {
          width: size,
          margin: 1,
          color: {
            dark: qrColor,
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        })

        // Overlay store logo if available
        if (restaurant.logo_url) {
          await new Promise<void>((resolve) => {
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
              resolve()
            }
            img.onerror = () => resolve()
            img.src = restaurant.logo_url!
          })
        }

        setQrDataUrl(previewCanvas.toDataURL('image/png'))
      } catch (err) {
        console.error('Error generating preview:', err)
      }
    }

    generatePreview()
  }, [isOpen, brandColor, restaurant.logo_url, qrTargetUrl])

  if (!isOpen) return null

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrTargetUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Render high-resolution export canvas (for download/print)
  const generateExportCanvas = async (scale = 2): Promise<HTMLCanvasElement> => {
    const exportCanvas = document.createElement('canvas')
    const ctx = exportCanvas.getContext('2d')!

    if (template === 'clean') {
      const baseSize = 900 * scale
      exportCanvas.width = baseSize
      exportCanvas.height = baseSize

      // White background with rounded frame
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, baseSize, baseSize)

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
      // Modern Squarish Table Stand Card (1200 x 1320 px)
      const width = 1200
      const height = 1320
      exportCanvas.width = width
      exportCanvas.height = height

      // White Card Background
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, 0, 0, width, height, 48)
      ctx.fill()

      // Card Border
      ctx.save()
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 6
      roundRect(ctx, 16, 16, width - 32, height - 32, 40)
      ctx.stroke()
      ctx.restore()

      // Header: Store Logo + Name
      let currentY = 70
      if (restaurant.logo_url) {
        await new Promise<void>((resolve) => {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'
          logoImg.onload = () => {
            const logoSize = 120
            const logoX = (width - logoSize) / 2
            const logoY = 70
            
            // White circular background for logo with shadow
            ctx.save()
            ctx.beginPath()
            ctx.arc(width / 2, logoY + (logoSize / 2), (logoSize / 2) + 6, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = 'rgba(0,0,0,0.12)'
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
            ctx.strokeStyle = brandColor
            ctx.lineWidth = 4
            ctx.stroke()

            resolve()
          }
          logoImg.onerror = () => resolve()
          logoImg.src = restaurant.logo_url!
        })
        currentY = 210
      } else {
        currentY = 100
      }

      // Store Name
      ctx.save()
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 44px Tajawal, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(restaurant.name, width / 2, currentY)
      ctx.restore()
      currentY += 58

      // Call to action pill badge
      ctx.save()
      ctx.fillStyle = `${brandColor}18`
      const badgeWidth = 540
      const badgeHeight = 56
      roundRect(ctx, (width - badgeWidth) / 2, currentY, badgeWidth, badgeHeight, 28)
      ctx.fill()

      ctx.strokeStyle = `${brandColor}40`
      ctx.lineWidth = 2
      roundRect(ctx, (width - badgeWidth) / 2, currentY, badgeWidth, badgeHeight, 28)
      ctx.stroke()

      ctx.fillStyle = brandColor
      ctx.font = 'bold 26px Tajawal, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('📷 وجّه كاميرا هاتفك لفتح المنيو والطلب', width / 2, currentY + (badgeHeight / 2))
      ctx.restore()
      currentY += badgeHeight + 30

      // QR Code Area (Large & Clear)
      const qrBoxSize = 680
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
      currentY += qrBoxSize + 30

      // Bottom Instruction & Domain
      ctx.save()
      ctx.fillStyle = '#64748b'
      ctx.font = '500 22px Tajawal, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('وجّه كاميرا هاتفك نحو الرمز لتصفح المنتجات والعروض مباشرة', width / 2, currentY)
      currentY += 38

      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 20px monospace'
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

      printWindow.document.open()
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>طباعة رمز الـ QR - ${restaurant.name}</title>
          <style>
            @page {
              size: portrait;
              margin: 1cm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              width: 100%;
              min-height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .print-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              page-break-inside: avoid;
            }
            .qr-card-img {
              width: 100%;
              max-width: 480px;
              height: auto;
              border-radius: 24px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 8px 30px rgba(0,0,0,0.06);
              display: block;
            }
            .cut-hint {
              margin-top: 14px;
              font-size: 11px;
              color: #94a3b8;
              text-align: center;
              font-weight: bold;
            }
            @media print {
              html, body {
                display: block;
              }
              .print-wrapper {
                padding: 0;
                margin: 0 auto;
              }
              .qr-card-img {
                max-width: 12.5cm;
                box-shadow: none;
                margin: 0 auto;
              }
              .cut-hint {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            <img src="${dataUrl}" alt="QR Stand" class="qr-card-img" />
            <div class="cut-hint">✂️ يمكنك قص البطاقة ووضعها على استاند الطاولة أو الواجهة</div>
          </div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            });
          </script>
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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
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
          
          {/* WYSIWYG Mini Preview Card (Matches the exact exported image) */}
          <div className="flex justify-center">
            <div className="w-full max-w-[270px] bg-white rounded-3xl shadow-md border border-slate-200 p-4 flex flex-col items-center text-center">
              
              {template === 'stand' ? (
                <>
                  {/* Top Logo */}
                  {restaurant.logo_url && (
                    <div 
                      className="w-11 h-11 rounded-full bg-white p-0.5 border-2 mx-auto mb-1.5 overflow-hidden shadow-2xs shrink-0"
                      style={{ borderColor: brandColor }}
                    >
                      <img src={restaurant.logo_url} alt="" className="w-full h-full object-contain rounded-full" />
                    </div>
                  )}

                  {/* Store Name */}
                  <h4 className="text-slate-900 text-xs font-black truncate max-w-[230px] mb-1">
                    {restaurant.name}
                  </h4>

                  {/* Pill Badge */}
                  <div 
                    className="text-[10px] font-black px-3 py-1 rounded-full mb-2.5 inline-flex items-center gap-1 shrink-0 border shadow-2xs"
                    style={{ background: `${brandColor}18`, color: brandColor, borderColor: `${brandColor}35` }}
                  >
                    <span>📷 وجّه كاميرا هاتفك لفتح المنيو والطلب</span>
                  </div>

                  {/* QR Code Image */}
                  <div className="bg-white p-1 rounded-xl flex items-center justify-center w-full aspect-square mb-2.5 overflow-hidden">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  {/* Helper Text */}
                  <p className="text-[8px] text-slate-500 font-medium leading-tight">
                    وجّه كاميرا هاتفك نحو الرمز لتصفح المنتجات
                  </p>
                  <p className="text-[8px] text-slate-400 font-mono mt-0.5 dir-ltr truncate max-w-full">
                    alfsouq.com/m/{restaurant.slug}
                  </p>
                </>
              ) : (
                <>
                  {/* Clean QR Only */}
                  <div className="bg-white p-2 rounded-xl flex items-center justify-center w-full aspect-square overflow-hidden">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 font-mono mt-2 dir-ltr truncate max-w-full">
                    alfsouq.com/m/{restaurant.slug}
                  </p>
                </>
              )}

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
