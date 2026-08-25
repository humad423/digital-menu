'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { X, Share2, Download, Copy, Check, Dices } from 'lucide-react'
import { getMainDomainMenuUrl } from '@/utils/url'

interface MultiOfferPosterModalProps {
  isOpen: boolean
  onClose: () => void
  offers: any[]
  restaurant: {
    id: string
    name: string
    slug: string
    logo_url?: string | null
    primary_color?: string | null
    store_type?: string | null
    has_delivery?: boolean
    whatsapp_number?: string | null
  }
  menuItems?: any[]
}

export type MultiPosterTheme = 
  | 'warm_cream'        // كريمي وفانيلا دافئة
  | 'golden_sunrise'    // ذهبي ملكي مشرق
  | 'emerald_mint'      // نعناع زمردي وطازج
  | 'peach_sorbet'      // خوخي ومشمشي مشرق
  | 'rose_berry'        // توت وردي فاتح
  | 'sky_breeze'        // أزرق سماوي ناصع
  | 'pure_marble'       // رخام أبيض نقي
  | 'store_brand'       // هوية ولون المتجر

export type PosterPattern = 
  | 'ember_sparks'
  | 'golden_bokeh'
  | 'smoke_atmosphere'
  | 'cafe_warmth'
  | 'fresh_leaf_shadow'
  | 'studio_spotlight'

interface ThemeDef {
  id: MultiPosterTheme
  name: string
  icon: string
  bg: [string, string, string]
  accent: string
  accentSec: string
  pattern: PosterPattern
}

const THEMES: ThemeDef[] = [
  { id: 'warm_cream', name: 'كريمي وفانيلا دافئة', icon: '🍦', bg: ['#faf6f0', '#ffffff', '#f4ebe1'], accent: '#ea580c', accentSec: '#fb923c', pattern: 'cafe_warmth' },
  { id: 'golden_sunrise', name: 'ذهبي ملكي مشرق', icon: '👑', bg: ['#fef9ee', '#ffffff', '#fef0d4'], accent: '#d97706', accentSec: '#f59e0b', pattern: 'golden_bokeh' },
  { id: 'emerald_mint', name: 'نعناع زمردي وطازج', icon: '🍃', bg: ['#f0fdf4', '#ffffff', '#dcfce7'], accent: '#059669', accentSec: '#10b981', pattern: 'fresh_leaf_shadow' },
  { id: 'peach_sorbet', name: 'خوخي ومشمشي مشرق', icon: '🍑', bg: ['#fff7ed', '#ffffff', '#ffedd5'], accent: '#ea580c', accentSec: '#f97316', pattern: 'cafe_warmth' },
  { id: 'rose_berry', name: 'توت وردي فاتح', icon: '🍰', bg: ['#fff1f2', '#ffffff', '#ffe4e6'], accent: '#e11d48', accentSec: '#f43f5e', pattern: 'golden_bokeh' },
  { id: 'sky_breeze', name: 'أزرق سماوي ناصع', icon: '🌊', bg: ['#f0f9ff', '#ffffff', '#e0f2fe'], accent: '#0284c7', accentSec: '#0ea5e9', pattern: 'studio_spotlight' },
  { id: 'pure_marble', name: 'رخام أبيض نقي', icon: '🏛️', bg: ['#f8fafc', '#ffffff', '#e2e8f0'], accent: '#ea580c', accentSec: '#f97316', pattern: 'studio_spotlight' },
  { id: 'store_brand', name: 'هوية المتجر الحصرية', icon: '🎨', bg: ['#fafafa', '#ffffff', '#f4f4f5'], accent: '#f97316', accentSec: '#fb923c', pattern: 'golden_bokeh' },
]

const BANNER_PHRASES = [
  '🔥 نشرة أقوى العروض والتخفيضات 🔥',
  '⚡ باقة عروض حصرية لفترة محدودة ⚡',
  '👑 أفضل عروض الموسم الاستثنائية 👑',
  '💥 توفير مضاعف على أشهى الأصناف 💥',
  '🎯 تشكيلة العروض الخاصة اليوم 🎯',
]

export type MultiCaptionStyle = 
  | 'punchy_deals'     // سريع ومباشر مع الأسعار والروابط
  | 'savings_focus'    // تركيز قوي على مبالغ التوفير
  | 'brand_story'      // هوية المتجر والتشكيلة
  | 'product_price'    // أسماء المنتجات والأسعار فقط
  | 'urgency_flash'    // عروض اليوم لفترة محدودة جداً
  | 'delivery_direct'  // دليفري واصل للبيت
  | 'clean_minimal'    // مينيمال بسيط

const MULTI_CAPTION_STYLES: { id: MultiCaptionStyle; name: string; emoji: string }[] = [
  { id: 'punchy_deals', name: 'سريع ومباشر 🔥', emoji: '⚡' },
  { id: 'savings_focus', name: 'تركيز على التوفير 💰', emoji: '💵' },
  { id: 'brand_story', name: 'هوية المتجر 👑', emoji: '👑' },
  { id: 'product_price', name: 'المنتجات والأسعار فقط ✨', emoji: '🎯' },
  { id: 'urgency_flash', name: 'عروض محدودة ⏳', emoji: '🔥' },
  { id: 'delivery_direct', name: 'توصيل لباب بيتك 🛵', emoji: '🛵' },
  { id: 'clean_minimal', name: 'مينيمال أنيق 💎', emoji: '💎' },
]

function getMultiMarketingCaption(
  style: MultiCaptionStyle,
  selectedOffers: any[],
  restaurant: any,
  menuUrl: string
): string {
  const storeName = restaurant?.name || 'متجرنا'
  const hasDelivery = restaurant?.has_delivery !== false
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']

  const offerLines = selectedOffers.map((o, idx) => {
    const sav = o.original_price && Number(o.original_price) > Number(o.offer_price)
      ? Number(o.original_price) - Number(o.offer_price)
      : 0
    return {
      num: emojis[idx] || '✨',
      title: o.title,
      price: o.offer_price,
      orig: o.original_price,
      savings: sav
    }
  })

  switch (style) {
    case 'savings_focus':
      return `💰 باقة التوفير الكبرى من ${storeName}!

${offerLines.map(l => `🏷️ ${l.title}\n💵 السعر الآن: ${l.price} ₺ ${l.orig ? `(بدلاً من ${l.orig} ₺)` : ''}${l.savings > 0 ? ` • وفر ${l.savings} ₺!` : ''}`).join('\n\n')}

${hasDelivery ? '🛵 التوصيل متاح وسريع لباب بيتك!\n' : ''}📲 اطلب العروض واستفد من الخصومات:
${menuUrl}`

    case 'brand_story':
      return `👑 تشكيلة عروض اليوم المميزة من ${storeName}!

${offerLines.map(l => `${l.num} ${l.title} ➔ ${l.price} ₺`).join('\n')}

${hasDelivery ? '🛵 متاح التوصيل لجميع المناطق\n' : ''}📱 تصفح المنيو واطلب مباشرة:
${menuUrl}`

    case 'product_price':
      return `✨ عروض ${storeName}:

${offerLines.map(l => `• ${l.title}: ${l.price} ₺`).join('\n')}`

    case 'urgency_flash':
      return `⚡ عروض حصرية لفترة محدودة جداً من ${storeName}!

${offerLines.map(l => `💥 ${l.title} بسعر ${l.price} ₺ فقط!`).join('\n')}

🚀 لا يفوتك العرض، اطلب الآن:
${menuUrl}`

    case 'delivery_direct':
      return `🛵 مشتهي أكل طيب؟ عروضنا واصلة لعندك سخنة وطازجة!

${offerLines.map(l => `😋 ${l.title} ➔ ${l.price} ₺`).join('\n')}

📍 للطلب والتوصيل السريع:
${menuUrl}`

    case 'clean_minimal':
      return `🔥 نشرة عروض اليوم (${storeName}):

${offerLines.map(l => `${l.num} ${l.title} • ${l.price} ₺`).join('\n')}

🔗 ${menuUrl}`

    case 'punchy_deals':
    default:
      return `🔥 أقوى عروض اليوم من ${storeName}!

${offerLines.map(l => `${l.num} ${l.title}\n💰 السعر: ${l.price} ₺ ${l.orig ? `(بدلاً من ${l.orig} ₺)` : ''}${l.savings > 0 ? ` • وفر ${l.savings} ₺!` : ''}`).join('\n\n')}

${hasDelivery ? '🛵 متاح التوصيل السريع لعنوانك!\n' : ''}📱 تصفح المنيو واطلب جميع العروض أونلاين:
${menuUrl}`
  }
}

// Fixed 4:5 Portrait Dimension (1080x1350)
const POSTER_WIDTH = 1080
const POSTER_HEIGHT = 1350

export default function MultiOfferPosterModal({
  isOpen,
  onClose,
  offers = [],
  restaurant,
  menuItems = []
}: MultiOfferPosterModalProps) {
  const [selectedOffers, setSelectedOffers] = useState<any[]>([])
  const [theme, setTheme] = useState<MultiPosterTheme>('warm_cream')
  const [captionStyle, setCaptionStyle] = useState<MultiCaptionStyle>('punchy_deals')
  const [bannerIndex, setBannerIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const brandColor = restaurant?.primary_color || '#ea580c'
  const rawMenuUrl = getMainDomainMenuUrl(restaurant?.slug || '')
  const menuUrl = rawMenuUrl.startsWith('http')
    ? rawMenuUrl
    : `https://alfsouq.com/m/${restaurant?.slug || ''}`
  const qrTargetUrl = `${menuUrl}${menuUrl.includes('?') ? '&' : '?'}src=multi_poster`

  // 🎲 Randomize Selected Offers, Theme & Marketing Caption
  const handleShuffle = (forcedCount?: number) => {
    if (!offers || offers.length === 0) return

    let targetCount = forcedCount
    if (!targetCount) {
      if (offers.length >= 4) {
        const counts = [4, 4, 3, 3, 2]
        targetCount = counts[Math.floor(Math.random() * counts.length)]
      } else if (offers.length === 3) {
        const counts = [3, 3, 2]
        targetCount = counts[Math.floor(Math.random() * counts.length)]
      } else {
        targetCount = offers.length
      }
    }

    const shuffled = [...offers].sort(() => 0.5 - Math.random())
    const picked = shuffled.slice(0, Math.min(offers.length, targetCount))

    const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)].id
    const randomBanner = Math.floor(Math.random() * BANNER_PHRASES.length)
    const randomCaption = MULTI_CAPTION_STYLES[Math.floor(Math.random() * MULTI_CAPTION_STYLES.length)].id

    setSelectedOffers(picked)
    setTheme(randomTheme)
    setBannerIndex(randomBanner)
    setCaptionStyle(randomCaption)
  }

  // Auto shuffle on open
  useEffect(() => {
    if (isOpen && offers && offers.length > 0) {
      handleShuffle()
    }
  }, [isOpen, offers?.length])

  // Build Dynamic Multi-Offer Marketing Caption
  const marketingCaption = getMultiMarketingCaption(captionStyle, selectedOffers, restaurant, menuUrl)

  // Render Master Multi-Offer Canvas
  useEffect(() => {
    if (!isOpen || selectedOffers.length === 0 || !restaurant) return
    let isMounted = true

    const renderMultiPoster = async () => {
      setGenerating(true)
      try {
        const width = POSTER_WIDTH
        const height = POSTER_HEIGHT
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const selectedTheme = THEMES.find(t => t.id === theme) || THEMES[0]
        const accent = theme === 'store_brand' ? brandColor : selectedTheme.accent

        // 1. Draw Procedural Atmospheric Light & Bright Background
        drawProceduralBackground(ctx, width, height, selectedTheme, accent, selectedTheme.pattern)

        // 2. Pre-load Images for each offer
        const loadedOfferCards = await Promise.all(
          selectedOffers.map(async (offer) => {
            const primaryItem = menuItems.find(i => i.id === offer.primary_item_id)
            const bonusItem = menuItems.find(i => i.id === offer.bonus_item_id)
            const imgUrl = offer.image_url || primaryItem?.image_url || bonusItem?.image_url || offer.primary_item?.image_url

            let loadedImg: HTMLImageElement | null = null
            if (imgUrl) {
              try {
                loadedImg = await loadImage(imgUrl)
              } catch (e) {
                console.warn('Could not load image for offer:', offer.id)
              }
            }

            const sav = offer.original_price && Number(offer.original_price) > Number(offer.offer_price)
              ? Number(offer.original_price) - Number(offer.offer_price)
              : 0

            const discPct = offer.original_price && sav > 0
              ? Math.round((sav / Number(offer.original_price)) * 100)
              : 0

            return {
              offer,
              image: loadedImg,
              savings: sav,
              discountPct: discPct,
            }
          })
        )

        let logoImg: HTMLImageElement | null = null
        if (restaurant.logo_url) {
          try {
            logoImg = await loadImage(restaurant.logo_url)
          } catch (e) {}
        }

        const bannerText = BANNER_PHRASES[bannerIndex % BANNER_PHRASES.length]

        // 3. Render Header
        drawFlyerHeader(ctx, width, restaurant, logoImg, accent, bannerText)

        // 4. Render Deal Cards based on count (2, 3, or 4)
        const contentStartY = 200
        const contentMaxH = 910 // Available height between header and QR footer
        await renderFlyerCards(ctx, width, contentStartY, contentMaxH, loadedOfferCards, accent)

        // 5. Render Stealth QR Footer
        await drawFlyerQRFooter(ctx, width, height, restaurant, accent, qrTargetUrl)

        if (isMounted) {
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.94))
          canvasRef.current = canvas
        }
      } catch (err) {
        console.error('Error rendering multi offer poster:', err)
      } finally {
        if (isMounted) setGenerating(false)
      }
    }

    renderMultiPoster()
    return () => { isMounted = false }
  }, [isOpen, selectedOffers, theme, bannerIndex, restaurant, menuItems])

  if (!isOpen || !offers || offers.length === 0) return null

  // Share & Download Handlers
  const handleShare = async () => {
    if (!canvasRef.current) return
    setSharing(true)
    setShareFeedback(null)

    try {
      const blob = await new Promise<Blob | null>(resolve => {
        canvasRef.current?.toBlob(b => resolve(b), 'image/jpeg', 0.94)
      })
      if (!blob) throw new Error('فشل معالجة الصورة')

      const fileName = `offers-${restaurant.slug}.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `نشرة عروض ${restaurant.name}`,
          text: marketingCaption,
          files: [file],
        })
        setShareFeedback('✅ تم فتح نافذة المشاركة!')
      } else {
        downloadBlob(blob, fileName)
        await navigator.clipboard.writeText(marketingCaption)
        setShareFeedback('✅ تم تنزيل الصورة ونسخ النص التسويقي!')
        setTimeout(() => window.open('https://web.whatsapp.com', '_blank'), 1200)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        canvasRef.current?.toBlob(blob => {
          if (blob) downloadBlob(blob, `offers-${restaurant.slug}.jpg`)
        })
        navigator.clipboard.writeText(marketingCaption)
        setShareFeedback('📥 تم تنزيل الصورة ونسخ النص إلى الحافظة.')
      }
    } finally {
      setSharing(false)
    }
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    canvasRef.current.toBlob(blob => {
      if (blob) downloadBlob(blob, `${restaurant.slug}-offers-flyer.jpg`)
    }, 'image/jpeg', 0.94)
  }

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(marketingCaption)
    setCopiedCaption(true)
    setTimeout(() => setCopiedCaption(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in dir-rtl">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl w-full max-w-md max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleShuffle()}
              disabled={generating}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:brightness-105 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-50"
              title="توليد تشكيلة عروض وتصميم آخر"
            >
              <Dices size={15} />
              <span>🎲 تصميم وتشكيلة أخرى</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Count Switcher */}
            {offers.length >= 3 && (
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => handleShuffle(2)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                    selectedOffers.length === 2 ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="عرضان فقط"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleShuffle(3)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                    selectedOffers.length === 3 ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="3 عروض"
                >
                  3
                </button>
                {offers.length >= 4 && (
                  <button
                    type="button"
                    onClick={() => handleShuffle(4)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                      selectedOffers.length === 4 ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="4 عروض"
                  >
                    4
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 items-center bg-slate-50/50">
          
          {/* 1. Live Poster Preview Card */}
          <div className="relative w-full max-w-[270px] sm:max-w-[300px] rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
            {generating && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 text-xs font-bold text-orange-600">
                <div className="w-7 h-7 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span>جاري توليد بوستر العروض...</span>
              </div>
            )}
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="نشرة العروض المجمعة"
                className="w-full h-auto object-contain block max-h-[460px]"
              />
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-400 text-xs font-bold">
                جاري التجهيز...
              </div>
            )}
          </div>

          {/* 2. Marketing Caption Card */}
          <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                📝 نص الرسالة المرفقة ({selectedOffers.length} عروض)
              </span>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="text-[11px] font-black text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                {copiedCaption ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span className={copiedCaption ? 'text-emerald-600' : ''}>{copiedCaption ? 'تم النسخ!' : 'نسخ النص'}</span>
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-line leading-relaxed max-h-28 overflow-y-auto">
              {marketingCaption}
            </div>
          </div>

          {shareFeedback && (
            <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center justify-center gap-2 animate-fade-in text-center">
              <span>{shareFeedback}</span>
            </div>
          )}

          {/* 3. Action Buttons */}
          <div className="w-full flex flex-col gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleShare}
              disabled={generating || sharing}
              className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:brightness-105 text-white font-black py-3 rounded-2xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50 cursor-pointer text-sm"
            >
              <Share2 size={17} />
              <span>{sharing ? 'جاري المعالجة...' : '📲 مشاركة في واتساب / ستوري'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={generating}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 active:scale-98 transition disabled:opacity-50 cursor-pointer text-xs"
              title="تحميل الصورة بجودة عالية"
            >
              <Download size={14} />
              <span>تحميل الصورة HD</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LIGHT & BRIGHT MULTI-OFFER FLYER ENGINE
// ════════════════════════════════════════════════════════════════════════════

function drawProceduralBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: ThemeDef,
  accent: string,
  pattern: PosterPattern
) {
  // Smooth Pastel Gradient
  const bgGrad = ctx.createRadialGradient(w / 2, h * 0.4, 60, w / 2, h * 0.45, w * 0.9)
  bgGrad.addColorStop(0, t.bg[1])
  bgGrad.addColorStop(0.65, t.bg[0])
  bgGrad.addColorStop(1, t.bg[2])
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  // Floating Lighting
  ctx.save()
  const orbs = [
    { x: w * 0.12, y: h * 0.15, r: 140, a: 0.12 },
    { x: w * 0.88, y: h * 0.22, r: 170, a: 0.14 },
    { x: w * 0.1, y: h * 0.72, r: 150, a: 0.1 },
    { x: w * 0.9, y: h * 0.8, r: 180, a: 0.12 },
  ]
  for (const orb of orbs) {
    const grad = ctx.createRadialGradient(orb.x, orb.y, 10, orb.x, orb.y, orb.r)
    grad.addColorStop(0, `${accent}30`)
    grad.addColorStop(0.7, `${accent}05`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawFlyerHeader(
  ctx: CanvasRenderingContext2D,
  w: number,
  restaurant: any,
  logoImg: HTMLImageElement | null,
  accent: string,
  bannerText: string
) {
  const topY = 42
  const logoSize = 78
  let logoOffset = 0

  if (logoImg) {
    const logoX = w - 75 - logoSize
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(logoX + logoSize / 2, topY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.lineWidth = 3.5; ctx.strokeStyle = accent; ctx.stroke()
    ctx.clip()
    ctx.drawImage(logoImg, logoX, topY, logoSize, logoSize)
    ctx.restore()
    logoOffset = logoSize + 22
  }

  ctx.save()
  ctx.textAlign = 'right'; ctx.textBaseline = 'top'
  ctx.font = 'bold 38px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillStyle = '#0f172a'; ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 6
  ctx.fillText(restaurant.name, w - 75 - logoOffset, topY + 4)

  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillStyle = accent
  ctx.fillText('منيو العروض والوجبات الحصرية 👑', w - 75 - logoOffset, topY + 46)
  ctx.restore()

  // Top Banner Phrase Ribbon (Light White with Accent Border)
  const ribbonY = topY + 92
  const ribbonW = w - 140
  const ribbonH = 46
  const ribbonX = (w - ribbonW) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 14
  ctx.beginPath()
  roundRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 16)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = accent
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 22px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillStyle = accent
  ctx.fillText(bannerText, w / 2, ribbonY + ribbonH / 2 + 1)
  ctx.restore()
}

async function renderFlyerCards(
  ctx: CanvasRenderingContext2D,
  w: number,
  startY: number,
  maxH: number,
  cards: Array<{ offer: any; image: HTMLImageElement | null; savings: number; discountPct: number }>,
  accent: string
) {
  const marginX = 50
  const availableW = w - marginX * 2

  if (cards.length === 2) {
    const cardH = (maxH - 26) / 2
    for (let i = 0; i < 2; i++) {
      const cardY = startY + i * (cardH + 26)
      drawHorizontalDealCard(ctx, marginX, cardY, availableW, cardH, cards[i], accent)
    }
  } else if (cards.length === 3) {
    const heroH = maxH * 0.47
    const bottomH = maxH - heroH - 22
    const bottomW = (availableW - 20) / 2

    // Top Hero Card
    drawHorizontalDealCard(ctx, marginX, startY, availableW, heroH, cards[0], accent)

    // Bottom 2 Grid Cards
    const bottomY = startY + heroH + 22
    drawVerticalDealCard(ctx, marginX, bottomY, bottomW, bottomH, cards[1], accent)
    drawVerticalDealCard(ctx, marginX + bottomW + 20, bottomY, bottomW, bottomH, cards[2], accent)
  } else {
    // 4 Offers: 2x2 Grid Cards
    const gridW = (availableW - 20) / 2
    const gridH = (maxH - 22) / 2

    const coords = [
      { x: marginX, y: startY },
      { x: marginX + gridW + 20, y: startY },
      { x: marginX, y: startY + gridH + 22 },
      { x: marginX + gridW + 20, y: startY + gridH + 22 },
    ]

    for (let i = 0; i < Math.min(4, cards.length); i++) {
      drawVerticalDealCard(ctx, coords[i].x, coords[i].y, gridW, gridH, cards[i], accent)
    }
  }
}

// ── Horizontal Deal Card (Pure White with Soft Shadow) ────────────────────
function drawHorizontalDealCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  item: { offer: any; image: HTMLImageElement | null; savings: number; discountPct: number },
  accent: string
) {
  const { offer, image, discountPct, savings } = item

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 24
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, 28)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = `${accent}55`
  ctx.stroke()
  ctx.restore()

  // Product Image (Right 45% width)
  const imgW = w * 0.44
  const imgH = h - 20
  const imgX = x + w - imgW - 10
  const imgY = y + 10

  if (image) {
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, imgX, imgY, imgW, imgH, 20)
    ctx.clip()
    drawImageCover(ctx, image, imgX, imgY, imgW, imgH)
    ctx.restore()
  } else {
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, imgX, imgY, imgW, imgH, 20)
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '50px sans-serif'
    ctx.fillText('🏷️', imgX + imgW / 2, imgY + imgH / 2)
    ctx.restore()
  }

  // Discount Badge
  if (discountPct > 0) {
    drawMiniDiscountBadge(ctx, imgX + 16, imgY + 16, discountPct, accent)
  }

  // Details Area (Left 53%)
  const textX = imgX - 25
  const textMaxW = w * 0.49

  ctx.save()
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'

  // Title in Dark Slate
  ctx.font = '900 34px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillStyle = '#0f172a'
  const nextY = wrapText(ctx, offer.title, textX, y + 26, textMaxW, 42, 2)

  // Price Block
  const priceY = Math.max(nextY + 14, y + h * 0.52)

  // Huge Offer Price
  ctx.font = '900 54px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillStyle = accent
  const priceText = `${offer.offer_price} ₺`
  ctx.fillText(priceText, textX, priceY)

  // Original price
  if (offer.original_price && savings > 0) {
    const oldPriceText = `${offer.original_price} ₺`
    ctx.font = 'bold 28px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillStyle = '#64748b'
    const oldY = priceY + 62
    ctx.fillText(oldPriceText, textX, oldY)

    const metrics = ctx.measureText(oldPriceText)
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(textX, oldY + 14)
    ctx.lineTo(textX - metrics.width, oldY + 14)
    ctx.stroke()
  }

  ctx.restore()
}

// ── Vertical Deal Card (Pure White with Soft Shadow) ──────────────────────
function drawVerticalDealCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  item: { offer: any; image: HTMLImageElement | null; savings: number; discountPct: number },
  accent: string
) {
  const { offer, image, discountPct } = item

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 24
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, 26)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = `${accent}55`
  ctx.stroke()
  ctx.restore()

  // Product Image (Top 54% height)
  const imgW = w - 20
  const imgH = h * 0.53
  const imgX = x + 10
  const imgY = y + 10

  if (image) {
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, imgX, imgY, imgW, imgH, 18)
    ctx.clip()
    drawImageCover(ctx, image, imgX, imgY, imgW, imgH)
    ctx.restore()
  } else {
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, imgX, imgY, imgW, imgH, 18)
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '40px sans-serif'
    ctx.fillText('🏷️', imgX + imgW / 2, imgY + imgH / 2)
    ctx.restore()
  }

  // Discount Badge
  if (discountPct > 0) {
    drawMiniDiscountBadge(ctx, imgX + 14, imgY + 14, discountPct, accent)
  }

  // Content Area
  const detailsY = imgY + imgH + 12
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Title
  ctx.font = '900 26px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillStyle = '#0f172a'
  wrapText(ctx, offer.title, x + w / 2, detailsY, w - 24, 32, 2)

  // Price Pill
  const pillY = y + h - 66
  const pillH = 52
  const pillW = w - 30
  const pillX = x + 15

  ctx.beginPath()
  roundRect(ctx, pillX, pillY, pillW, pillH, 18)
  ctx.fillStyle = `${accent}18`
  ctx.fill()
  ctx.lineWidth = 1.8
  ctx.strokeStyle = accent
  ctx.stroke()

  ctx.textBaseline = 'middle'
  ctx.font = '900 34px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillStyle = accent
  ctx.fillText(`${offer.offer_price} ₺`, x + w / 2, pillY + pillH / 2)

  ctx.restore()
}

function drawMiniDiscountBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pct: number,
  accent: string
) {
  const w = 98
  const h = 40
  ctx.save()
  ctx.shadowColor = 'rgba(239, 68, 68, 0.35)'
  ctx.shadowBlur = 14
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, 14)
  ctx.fillStyle = '#ef4444'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 20px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillText(`-%${pct}`, x + w / 2, y + h / 2 + 1)
  ctx.restore()
}

// ── Stealth QR Footer (Light Edition) ─────────────────────────────────────
async function drawFlyerQRFooter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  restaurant: any,
  accent: string,
  qrTargetUrl: string
) {
  const footerH = 165
  const footerY = h - footerH - 30
  const footerW = w - 100
  const footerX = (w - footerW) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 20
  ctx.beginPath(); roundRect(ctx, footerX, footerY, footerW, footerH, 28)
  ctx.fillStyle = '#ffffff'; ctx.fill()
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.stroke()
  ctx.restore()

  try {
    const qrSize = 115
    const qrX = footerX + 30
    const qrY = footerY + (footerH - qrSize) / 2
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, qrTargetUrl, {
      width: qrSize, margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })

    ctx.save()
    ctx.beginPath(); roundRect(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 16)
    ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)
    ctx.restore()

    ctx.save()
    const textX = qrX + qrSize + 25
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.font = 'bold 26px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillStyle = '#0f172a'
    ctx.fillText('امسح الـ QR واطلب العروض أونلاين 📱', textX, qrY + 4)
    ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillStyle = accent
    ctx.fillText(`alfsouq.com/m/${restaurant.slug}`, textX, qrY + 44)
    ctx.font = '500 16px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText('منصة ألف سوق • اطلب العروض واستفد من التخفيضات', textX, qrY + 78)
    ctx.restore()
  } catch (e) {
    console.warn('QR error:', e)
  }
}

// ── Generic Canvas Helpers ────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = e => reject(e)
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2
  if (h < 2 * r) r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.width / img.height
  const targetRatio = w / h
  let srcW = img.width, srcH = img.height, srcX = 0, srcY = 0

  if (imgRatio > targetRatio) {
    srcW = img.height * targetRatio
    srcX = (img.width - srcW) / 2
  } else {
    srcH = img.width / targetRatio
    srcY = (img.height - srcH) / 2
  }
  ctx.drawImage(img, srcX, srcY, srcW, srcH, x, y, w, h)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 2
): number {
  const words = text.split(' ')
  let line = '', currentY = y
  let lineCount = 0

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY)
      line = words[n] + ' '
      currentY += lineHeight
      lineCount++
      if (lineCount >= maxLines - 1) {
        break
      }
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, currentY)
  return currentY + lineHeight
}
