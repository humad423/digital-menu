'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { X, Share2, Download, Copy, Check, Dices } from 'lucide-react'
import { getMainDomainMenuUrl } from '@/utils/url'
import { supabase } from '@/lib/supabase'

interface OfferPosterModalProps {
  isOpen: boolean
  onClose: () => void
  offer: any
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
}

export type PosterShape = 
  | 'circle_orbit'       // قرص دائري مع حلقات مدارية
  | 'bottom_stage'       // النص بالأعلى والصورة كمنصة ثلاثية الأبعاد
  | 'hex_shield'         // درع سداسي تقني متوهج
  | 'polaroid_tilt'      // بطاقة بولارويد مائلة بأسلوب عصري
  | 'comic_burst'        // إطار بوب آرت مع حواف حادة وظلال صلبة
  | 'wave_curve'         // موجة انسيابية تفصل الصورة عن النص
  | 'rustic_slate'       // صينية تقديم حجرية ريفية
  | 'monolith_glass'     // كارت زجاجي عائم فائق الأناقة

export type PosterPattern = 
  | 'ember_sparks'      // إضاءة دافئة ناعمة
  | 'golden_bokeh'      // بوكيه ذهبي فاخر
  | 'smoke_atmosphere'  // سحاب استوديو ناعم
  | 'studio_spotlight'  // سبوتلايت استوديو مركز
  | 'cafe_warmth'       // إضاءة كافيه دافئة وعصرية
  | 'fresh_leaf_shadow' // ظلال أوراق طبيعية

export type PosterTheme = 
  | 'warm_cream'        // كريمي وفانيلا دافئة
  | 'golden_sunrise'    // ذهبي ملكي مشرق
  | 'emerald_mint'      // نعناع زمردي وطازج
  | 'peach_sorbet'      // خوخي ومشمشي مشرق
  | 'rose_berry'        // توت وردي فاتح
  | 'sky_breeze'        // أزرق سماوي ناصع
  | 'pure_marble'       // رخام أبيض نقي
  | 'store_brand'       // هوية ولون المتجر

export type PriceStyle = 'fire_tag' | 'dual_box' | 'huge_bold' | 'angled_ribbon'
export type MarketingBadgeStyle = 'neon_pill' | 'stamp_seal' | 'ribbon_banner' | 'flanked_lines'

const SHAPES: { id: PosterShape; name: string; icon: string }[] = [
  { id: 'circle_orbit', name: 'القرص الدائري', icon: '🪐' },
  { id: 'bottom_stage', name: 'النص بالأعلى والمنصة بالأسفل', icon: '🍽️' },
  { id: 'hex_shield', name: 'الدرع السداسي', icon: '🛡️' },
  { id: 'polaroid_tilt', name: 'بولارويد مائل', icon: '📷' },
  { id: 'comic_burst', name: 'انفجار البوب آرت', icon: '💥' },
  { id: 'wave_curve', name: 'الموجات الانسيابية', icon: '🌊' },
  { id: 'rustic_slate', name: 'لوح التقديم المودرن', icon: '🪵' },
  { id: 'monolith_glass', name: 'بطاقة النخبة البيضاء', icon: '✨' },
]

interface ThemeDef {
  id: PosterTheme
  name: string
  icon: string
  bg: [string, string, string] // Light & Bright background gradients
  accent: string
  accentSec: string
  defaultPattern: PosterPattern
}

const THEMES: ThemeDef[] = [
  { id: 'warm_cream', name: 'كريمي وفانيلا دافئة', icon: '🍦', bg: ['#faf6f0', '#ffffff', '#f4ebe1'], accent: '#ea580c', accentSec: '#fb923c', defaultPattern: 'cafe_warmth' },
  { id: 'golden_sunrise', name: 'ذهبي ملكي مشرق', icon: '👑', bg: ['#fef9ee', '#ffffff', '#fef0d4'], accent: '#d97706', accentSec: '#f59e0b', defaultPattern: 'golden_bokeh' },
  { id: 'emerald_mint', name: 'نعناع زمردي وطازج', icon: '🍃', bg: ['#f0fdf4', '#ffffff', '#dcfce7'], accent: '#059669', accentSec: '#10b981', defaultPattern: 'fresh_leaf_shadow' },
  { id: 'peach_sorbet', name: 'خوخي ومشمشي مشرق', icon: '🍑', bg: ['#fff7ed', '#ffffff', '#ffedd5'], accent: '#ea580c', accentSec: '#f97316', defaultPattern: 'cafe_warmth' },
  { id: 'rose_berry', name: 'توت وردي فاتح', icon: '🍰', bg: ['#fff1f2', '#ffffff', '#ffe4e6'], accent: '#e11d48', accentSec: '#f43f5e', defaultPattern: 'golden_bokeh' },
  { id: 'sky_breeze', name: 'أزرق سماوي ناصع', icon: '🌊', bg: ['#f0f9ff', '#ffffff', '#e0f2fe'], accent: '#0284c7', accentSec: '#0ea5e9', defaultPattern: 'studio_spotlight' },
  { id: 'pure_marble', name: 'رخام أبيض نقي', icon: '🏛️', bg: ['#f8fafc', '#ffffff', '#e2e8f0'], accent: '#ea580c', accentSec: '#f97316', defaultPattern: 'studio_spotlight' },
  { id: 'store_brand', name: 'هوية المتجر الحصرية', icon: '🎨', bg: ['#fafafa', '#ffffff', '#f4f4f5'], accent: '#f97316', accentSec: '#fb923c', defaultPattern: 'golden_bokeh' },
]

const PRICE_STYLES: { id: PriceStyle; name: string; icon: string }[] = [
  { id: 'fire_tag', name: '🔥 شارة نارية بارزة', icon: '🔥' },
  { id: 'dual_box', name: '📊 مقارنة السعرين (السابق والحالي)', icon: '📊' },
  { id: 'huge_bold', name: '💥 سعر عملاق ثلاثي الأبعاد', icon: '💥' },
  { id: 'angled_ribbon', name: '✨ شريط عروض مائل فخم', icon: '✨' },
]

const MARKETING_PHRASES = [
  '🔥 عرض خاص وحصري 🔥',
  '⚡ تخفيض حصري ⚡',
  '💥 لفترة محدودة جداً 💥',
  '🎯 سعر خارق لا يفوتك 🎯',
  '🚀 أقوى عروض الموسم 🚀',
  '👑 عرض ملكي استثنائي 👑',
  '✨ عرض اليوم المميز ✨',
  '💰 وفر أكثر اليوم 💰',
  '🔥 خصم جنوني واستثنائي 🔥',
]

const DELIVERY_PHRASES_ON = [
  '🛵 متاح التوصيل السريع لعنوانك',
  '🛵 يوجد توصيل لباب بيتك • اطلب الآن',
  '🚀 دليفري متوفر وسريع لجميع المناطق',
  '🛵 اطلب ويوصلك لعندك بأسرع وقت',
  '⚡ خدمة التوصيل متاحة وفورية',
]

const DELIVERY_PHRASES_OFF = [
  '🏪 متوفر للاستلام المباشر من الفرع',
  '📍 استلم طلبك طازجاً من المتجر',
  '🏬 متاح للطلب والاستلام الفوري',
]

// Fixed 4:5 Poster Dimension (Standard across Instagram, Facebook, and WhatsApp)
const POSTER_WIDTH = 1080
const POSTER_HEIGHT = 1350

export type CaptionStyle = 
  | 'punchy_short'     // سريع ومباشر مع الرابط
  | 'savings_focus'    // تركيز قوي على مبلغ التوفير
  | 'brand_story'      // مع اسم المتجر والترحيب
  | 'product_price'    // اسم الوجبة والسعر فقط بدون زوائد
  | 'urgency_flash'    // لفترة محدودة وسعر استثنائي
  | 'delivery_direct'  // تركيز على التوصيل السريع للمنزل
  | 'clean_minimal'    // مينيمال بسيط وأنيق

const CAPTION_STYLES: { id: CaptionStyle; name: string; emoji: string }[] = [
  { id: 'punchy_short', name: 'سريع ومباشر 🔥', emoji: '⚡' },
  { id: 'savings_focus', name: 'تركيز على التوفير 💰', emoji: '💵' },
  { id: 'brand_story', name: 'هوية المتجر 👑', emoji: '👑' },
  { id: 'product_price', name: 'المنتج والسعر فقط ✨', emoji: '🎯' },
  { id: 'urgency_flash', name: 'عرض عاجل ومحدود ⏳', emoji: '🔥' },
  { id: 'delivery_direct', name: 'توصيل لباب بيتك 🛵', emoji: '🛵' },
  { id: 'clean_minimal', name: 'مينيمال أنيق 💎', emoji: '💎' },
]

function getMarketingCaption(
  style: CaptionStyle,
  offer: any,
  restaurant: any,
  savings: number,
  menuUrl: string
): string {
  const title = offer?.title || 'عرض خاص'
  const price = offer?.offer_price || 0
  const origPrice = offer?.original_price
  const storeName = restaurant?.name || 'متجرنا'
  const hasDelivery = restaurant?.has_delivery !== false

  switch (style) {
    case 'punchy_short':
      return `🔥 ${title}
💥 السعر الآن: ${price} ₺ فقط!
${hasDelivery ? '🛵 التوصيل متاح وسريع لعنوانك!\n' : ''}📱 اطلب أونلاين:
${menuUrl}`

    case 'savings_focus':
      return `${savings > 0 ? `💰 وفر ${savings} ₺ اليوم مع أقوى العروض!\n` : '💥 أقوى عروض اليوم!\n'}✨ ${title}
🏷️ بسعر ${price} ₺ ${origPrice ? `(بدلاً من ${origPrice} ₺)` : ''}
${hasDelivery ? '🛵 دليفري لباب بيتك • اطلب الآن' : '🏪 متوفر للاستلام المباشر'}`

    case 'brand_story':
      return `👑 طعم وجودة لا تُقاوم من ${storeName}!
🍽️ ${title}
✨ السعر: ${price} ₺ ${origPrice ? `(السابق: ${origPrice} ₺)` : ''}
📲 تصفح المنيو واطلب مباشرة:
${menuUrl}`

    case 'product_price':
      return `✨ ${title}
💰 ${price} ₺ فقط!`

    case 'urgency_flash':
      return `⚡ عرض لفترة محدودة جداً!
🔥 ${title}
💵 السعر الاستثنائي: ${price} ₺ ${savings > 0 ? `• وفر ${savings} ₺!` : ''}
🚀 لا يفوتك العرض، اطلب الآن:
${menuUrl}`

    case 'delivery_direct':
      return `🛵 مشتهيها؟ واصلة لعندك سخنة وطازجة!
😋 ${title}
💰 السعر: ${price} ₺
${hasDelivery ? '📍 التوصيل متوفر لجميع المناطق' : '📍 متوفر في الفرع'}
📲 للطلب: ${menuUrl}`

    case 'clean_minimal':
    default:
      return `🔥 ${title} • ${price} ₺
${savings > 0 ? `✨ وفر ${savings} ₺!\n` : ''}🔗 ${menuUrl}`
  }
}

export default function OfferPosterModal({ isOpen, onClose, offer, restaurant }: OfferPosterModalProps) {
  const [posterShape, setPosterShape] = useState<PosterShape>('circle_orbit')
  const [theme, setTheme] = useState<PosterTheme>('warm_cream')
  const [priceStyle, setPriceStyle] = useState<PriceStyle>('fire_tag')
  const [marketingIndex, setMarketingIndex] = useState(0)
  const [badgeStyle, setBadgeStyle] = useState<MarketingBadgeStyle>('neon_pill')
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('punchy_short')
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
  const qrTargetUrl = `${menuUrl}${menuUrl.includes('?') ? '&' : '?'}src=poster&offer=${offer?.id || 'deal'}`

  const savings = offer?.original_price && Number(offer.original_price) > Number(offer.offer_price)
    ? Number(offer.original_price) - Number(offer.offer_price)
    : 0

  const discountPct = offer?.original_price && savings > 0
    ? Math.round((savings / Number(offer.original_price)) * 100)
    : 0

  const marketingCaption = getMarketingCaption(captionStyle, offer, restaurant, savings, menuUrl)

  // 🎲 Magic Shuffle: Combinatorial Randomizer
  const handleShuffle = () => {
    const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)].id
    const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)].id
    const randomPrice = PRICE_STYLES[Math.floor(Math.random() * PRICE_STYLES.length)].id
    const randomMIndex = Math.floor(Math.random() * MARKETING_PHRASES.length)
    const styles: MarketingBadgeStyle[] = ['neon_pill', 'stamp_seal', 'ribbon_banner', 'flanked_lines']
    const randomBadge = styles[Math.floor(Math.random() * styles.length)]
    const randomCaption = CAPTION_STYLES[Math.floor(Math.random() * CAPTION_STYLES.length)].id

    setPosterShape(randomShape)
    setTheme(randomTheme)
    setPriceStyle(randomPrice)
    setMarketingIndex(randomMIndex)
    setBadgeStyle(randomBadge)
    setCaptionStyle(randomCaption)
  }

  // Automatically randomize everything when opening for an offer
  useEffect(() => {
    if (isOpen) {
      handleShuffle()
    }
  }, [isOpen, offer?.id])

  useEffect(() => {
    if (!isOpen || !offer || !restaurant) return
    let isMounted = true

    const renderPoster = async () => {
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
        const accentSec = theme === 'store_brand' ? '#ea580c' : selectedTheme.accentSec

        // 1. Draw Procedural Pattern Background (Light & Bright)
        drawProceduralBackground(ctx, width, height, selectedTheme, accent, selectedTheme.defaultPattern)

        // 2. Multi-Product vs Single-Product Image Gathering
        const hasMultipleProducts = !!(
          offer.bonus_item_id ||
          offer.item3_id ||
          offer.item4_id ||
          offer.bonus_item ||
          offer.item3 ||
          offer.item4
        )

        let rawImageUrls: string[] = []

        if (!hasMultipleProducts) {
          // Single Product Offer: Strictly exactly 1 Image
          const singleImg = offer.image_url || offer.custom_image || offer.primary_item?.image_url
          if (singleImg && typeof singleImg === 'string' && singleImg.trim() !== '') {
            rawImageUrls = [singleImg.trim()]
          } else if (offer.primary_item_id) {
            try {
              const { data: fetchedItem } = await supabase
                .from('menu_items')
                .select('image_url')
                .eq('id', offer.primary_item_id)
                .single()
              if (fetchedItem?.image_url) rawImageUrls = [fetchedItem.image_url]
            } catch (e) {}
          }
        } else {
          // Multi-Product Combo Deal: Gather distinct images from each component product
          if (Array.isArray(offer.item_images) && offer.item_images.length > 0) {
            rawImageUrls = offer.item_images.filter((u: any) => typeof u === 'string' && u.trim() !== '')
          } else {
            const directList = [
              offer.primary_item?.image_url,
              offer.bonus_item?.image_url,
              offer.item3?.image_url,
              offer.item4?.image_url,
            ].filter((u): u is string => typeof u === 'string' && u.trim() !== '')
            rawImageUrls = directList
          }

          if (rawImageUrls.length === 0) {
            const itemIds = [offer.primary_item_id, offer.bonus_item_id, offer.item3_id, offer.item4_id].filter(Boolean)
            if (itemIds.length > 0) {
              try {
                const { data: fetchedItems } = await supabase
                  .from('menu_items')
                  .select('id, image_url')
                  .in('id', itemIds)
                if (fetchedItems) {
                  rawImageUrls = itemIds
                    .map(id => fetchedItems.find(i => i.id === id)?.image_url)
                    .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
                }
              } catch (e) {
                console.warn('Could not fetch offer item images:', e)
              }
            }
          }

          if (rawImageUrls.length === 0 && offer.image_url) {
            rawImageUrls = [offer.image_url]
          }
        }

        // Deduplicate URLs
        const uniqueUrls = Array.from(new Set(rawImageUrls))

        // Load all images in parallel
        const productImgs: HTMLImageElement[] = []
        if (uniqueUrls.length > 0) {
          const loaded = await Promise.allSettled(uniqueUrls.map(url => loadImage(url)))
          for (const res of loaded) {
            if (res.status === 'fulfilled' && res.value) {
              productImgs.push(res.value)
            }
          }
        }

        let logoImg: HTMLImageElement | null = null
        if (restaurant.logo_url) {
          try { logoImg = await loadImage(restaurant.logo_url) } catch (e) {}
        }

        const deliveryText = restaurant.has_delivery !== false
          ? DELIVERY_PHRASES_ON[Math.abs(SHAPES.findIndex(s => s.id === posterShape) + THEMES.findIndex(t => t.id === theme)) % DELIVERY_PHRASES_ON.length]
          : DELIVERY_PHRASES_OFF[Math.abs(SHAPES.findIndex(s => s.id === posterShape)) % DELIVERY_PHRASES_OFF.length]

        const marketingPhrase = MARKETING_PHRASES[marketingIndex % MARKETING_PHRASES.length]

        // 3. Render Selected Shape & Typography Composition
        const c: RenderContext = {
          ctx, width, height, accent, accentSec,
          theme: selectedTheme, offer, restaurant, savings, discountPct,
          priceStyle, productImgs, logoImg, deliveryText, qrTargetUrl,
          marketingPhrase, badgeStyle
        }

        await renderModularShape(posterShape, c)

        // 4. Render Stealth QR Code Footer
        await drawStealthQRFooter(c)

        if (isMounted) {
          setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.94))
          canvasRef.current = canvas
        }
      } catch (err) {
        console.error('Error rendering poster:', err)
      } finally {
        if (isMounted) setGenerating(false)
      }
    }

    renderPoster()
    return () => { isMounted = false }
  }, [isOpen, offer, restaurant, posterShape, theme, priceStyle, marketingIndex, badgeStyle])

  if (!isOpen || !offer) return null

  // ── Share & Download Handlers ──────────────────────────────────────────
  const handleShare = async () => {
    if (!canvasRef.current) return
    setSharing(true)
    setShareFeedback(null)

    try {
      const blob = await new Promise<Blob | null>(resolve => {
        canvasRef.current?.toBlob(b => resolve(b), 'image/jpeg', 0.94)
      })
      if (!blob) throw new Error('فشل معالجة الصورة')

      const fileName = `offer-${restaurant.slug}-${offer.id}.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `عرض ${offer.title} من ${restaurant.name}`,
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
          if (blob) downloadBlob(blob, `offer-${restaurant.slug}.jpg`)
        })
        navigator.clipboard.writeText(marketingCaption)
        setShareFeedback('📥 تم تنزيل الصورة ونسخ النص إلى الحافظة بنجاح.')
      }
    } finally {
      setSharing(false)
    }
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    canvasRef.current.toBlob(blob => {
      if (blob) downloadBlob(blob, `${restaurant.slug}-${offer.title.replace(/\s+/g, '-')}.jpg`)
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
          <button
            type="button"
            onClick={handleShuffle}
            disabled={generating}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:brightness-105 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-50"
            title="توليد قالب وشكل وتصميم مختلف"
          >
            <Dices size={15} />
            <span>🎲 تصميم وشكل آخر</span>
          </button>

          <div className="flex items-center gap-2">
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
                <span>جاري توليد البوستر المشرق...</span>
              </div>
            )}
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt={offer.title}
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
                📝 نص الرسالة المرفقة
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

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto">
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
// LIGHT & BRIGHT MODULAR PROCEDURAL ENGINE
// ════════════════════════════════════════════════════════════════════════════

interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  accent: string
  accentSec: string
  theme: ThemeDef
  offer: any
  restaurant: any
  savings: number
  discountPct: number
  priceStyle: PriceStyle
  productImgs: HTMLImageElement[]
  logoImg: HTMLImageElement | null
  deliveryText: string
  qrTargetUrl: string
  marketingPhrase: string
  badgeStyle: MarketingBadgeStyle
}

// ── 1. Gourmet Food Studio Light & Bright Backgrounds ───────────────────
function drawProceduralBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: ThemeDef,
  accent: string,
  pattern: PosterPattern
) {
  // Base Smooth Creamy / Pastel Gradient
  const bgGrad = ctx.createRadialGradient(w / 2, h * 0.4, 50, w / 2, h * 0.45, w * 0.9)
  bgGrad.addColorStop(0, t.bg[1])
  bgGrad.addColorStop(0.6, t.bg[0])
  bgGrad.addColorStop(1, t.bg[2])
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  if (pattern === 'ember_sparks' || pattern === 'cafe_warmth') {
    // Warm Ambient Sunlight Glow & Soft Sparkles
    ctx.save()
    const sparks = [
      { x: w * 0.15, y: h * 0.2, r: 6, a: 0.25 },
      { x: w * 0.88, y: h * 0.25, r: 8, a: 0.3 },
      { x: w * 0.1, y: h * 0.7, r: 7, a: 0.2 },
      { x: w * 0.9, y: h * 0.78, r: 9, a: 0.25 },
    ]
    for (const s of sparks) {
      const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r * 5)
      g.addColorStop(0, `${accent}55`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2)
      ctx.fill()
    }
    // Bottom warm tint
    const bottomGlow = ctx.createLinearGradient(0, h, 0, h * 0.6)
    bottomGlow.addColorStop(0, `${accent}18`)
    bottomGlow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = bottomGlow
    ctx.fillRect(0, h * 0.6, w, h * 0.4)
    ctx.restore()
  } else if (pattern === 'golden_bokeh') {
    // Soft Bright Golden Bokeh Bubbles
    ctx.save()
    const orbs = [
      { x: w * 0.12, y: h * 0.18, r: 150, a: 0.12 },
      { x: w * 0.88, y: h * 0.15, r: 180, a: 0.15 },
      { x: w * 0.08, y: h * 0.65, r: 170, a: 0.14 },
      { x: w * 0.92, y: h * 0.72, r: 200, a: 0.16 },
    ]
    for (const orb of orbs) {
      const grad = ctx.createRadialGradient(orb.x, orb.y, 10, orb.x, orb.y, orb.r)
      grad.addColorStop(0, `${accent}${Math.round(orb.a * 255).toString(16).padStart(2, '0')}`)
      grad.addColorStop(0.7, `${accent}05`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  } else if (pattern === 'fresh_leaf_shadow') {
    // Natural Organic Fresh Leaf Shadows
    ctx.save()
    ctx.fillStyle = 'rgba(5, 150, 105, 0.08)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(w * 0.28, h * 0.06, w * 0.32, h * 0.2, 0, h * 0.24)
    ctx.closePath(); ctx.fill()

    ctx.beginPath()
    ctx.moveTo(w, 0)
    ctx.bezierCurveTo(w * 0.72, h * 0.05, w * 0.68, h * 0.18, w, h * 0.22)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  // Overhead Studio Warm Light Cone
  ctx.save()
  const spotLight = ctx.createRadialGradient(w / 2, h * 0.25, 40, w / 2, h * 0.35, w * 0.65)
  spotLight.addColorStop(0, `${accent}18`)
  spotLight.addColorStop(0.6, `${accent}04`)
  spotLight.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spotLight
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3
    const px = x + r * Math.cos(angle)
    const py = y + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.stroke()
}

// ── 2. Master Modular Shape Renderer (Light Edition) ────────────────────
async function renderModularShape(shape: PosterShape, c: RenderContext) {
  const { ctx, width: w, accent, productImgs, discountPct } = c

  // Special Structure: Inverted Layout (Bottom Stage)
  if (shape === 'bottom_stage') {
    drawStoreHeader(c, 40)
    // Title TOP
    const titleY = 135
    const isLongTitle = (c.offer.title || '').length > 32
    const titleFontSize = isLongTitle ? 40 : 48
    const titleLineHeight = isLongTitle ? 50 : 58

    ctx.save()
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.font = `900 ${titleFontSize}px "Segoe UI", Tahoma, Arial, sans-serif`
    ctx.fillStyle = '#0f172a'; ctx.shadowColor = 'rgba(0,0,0,0.1)'; ctx.shadowBlur = 8
    const titleBottomY = wrapText(ctx, c.offer.title, w / 2, titleY, w - 160, titleLineHeight)
    ctx.restore()

    // Price TOP
    const priceY = titleBottomY + 18
    drawPriceBlock(c, priceY)

    // Image BOTTOM on 3D Stage
    const imgW = 900
    const imgH = 600
    const imgX = (w - imgW) / 2
    const imgY = 540

    ctx.save()
    const stageGrad = ctx.createRadialGradient(w / 2, imgY + imgH * 0.9, 50, w / 2, imgY + imgH * 0.9, imgW * 0.6)
    stageGrad.addColorStop(0, `${accent}40`)
    stageGrad.addColorStop(0.6, `${accent}10`)
    stageGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = stageGrad
    ctx.beginPath()
    ctx.ellipse(w / 2, imgY + imgH - 10, imgW * 0.5, 70, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    if (productImgs.length > 0) {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 35
      ctx.beginPath()
      roundRect(ctx, imgX, imgY, imgW, imgH, 44)
      ctx.clip()
      drawProductGrid(ctx, productImgs, imgX, imgY, imgW, imgH)
      ctx.restore()
    }

    if (discountPct > 0) {
      const styleIdx = Math.abs(c.theme.name.length + 2)
      drawDiscountBadge(ctx, imgX + 35, imgY + 35, discountPct, accent, styleIdx)
    }
    const delY = imgY + imgH - 55
    drawDeliveryBadge(ctx, w, delY, accent, c.deliveryText)
    return
  }

  // Standard Header for other layouts
  drawStoreHeader(c)

  // Determine Dimensions based on geometry (Optimized for 1080x1350)
  const cardW = 800
  const cardH = 500
  const cardX = (w - cardW) / 2
  const cardY = 155
  const cx = w / 2
  const cy = cardY + cardH / 2

  // Render Geometry Clipping & Frames
  ctx.save()
  if (shape === 'circle_orbit') {
    const circleR = 250
    // Orbit Rings
    ctx.shadowColor = accent; ctx.shadowBlur = 20
    ctx.strokeStyle = accent; ctx.lineWidth = 4.5
    ctx.beginPath(); ctx.arc(cx, cy, circleR + 12, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = `${accent}55`; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.arc(cx, cy, circleR + 24, 0, Math.PI * 2); ctx.stroke()
    // Image Circle
    if (productImgs.length > 0) {
      ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2)
      ctx.clip()
      drawProductGrid(ctx, productImgs, cx - circleR, cy - circleR, circleR * 2, circleR * 2)
    }
  } else if (shape === 'hex_shield') {
    // Hexagonal Shield
    const hexR = cardH / 1.85
    ctx.shadowColor = accent; ctx.shadowBlur = 20
    ctx.strokeStyle = accent; ctx.lineWidth = 4.5
    drawHexagon(ctx, cx, cy, hexR)
    ctx.stroke()
    if (productImgs.length > 0) {
      ctx.clip()
      drawProductGrid(ctx, productImgs, cardX, cardY, cardW, cardH)
    }
  } else if (shape === 'polaroid_tilt') {
    // Polaroid Tilt
    ctx.translate(cx, cy); ctx.rotate(-0.035); ctx.translate(-cx, -cy)
    ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 28
    ctx.beginPath(); roundRect(ctx, cardX, cardY, cardW, cardH, 28)
    ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.lineWidth = 3; ctx.strokeStyle = '#e2e8f0'; ctx.stroke()
    if (productImgs.length > 0) {
      ctx.beginPath(); roundRect(ctx, cardX + 16, cardY + 16, cardW - 32, cardH - 32, 20)
      ctx.clip()
      drawProductGrid(ctx, productImgs, cardX + 16, cardY + 16, cardW - 32, cardH - 32)
    }
  } else if (shape === 'comic_burst') {
    // Comic Box
    ctx.translate(cx, cy); ctx.rotate(-0.025); ctx.translate(-cx, -cy)
    ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 0
    ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 10
    ctx.beginPath(); roundRect(ctx, cardX, cardY, cardW, cardH, 28)
    ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.lineWidth = 5; ctx.strokeStyle = '#0f172a'; ctx.stroke()
    if (productImgs.length > 0) {
      ctx.clip()
      drawProductGrid(ctx, productImgs, cardX, cardY, cardW, cardH)
    }
  } else if (shape === 'wave_curve') {
    // Wave Curve
    ctx.beginPath()
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, cardY + cardH - 40)
    ctx.bezierCurveTo(w * 0.7, cardY + cardH + 45, w * 0.3, cardY + cardH - 60, 0, cardY + cardH)
    ctx.closePath()
    if (productImgs.length > 0) {
      ctx.clip()
      drawProductGrid(ctx, productImgs, 0, 0, w, cardY + cardH + 40)
    }
  } else {
    // Crisp White Card with Accent Border & Soft Glow
    ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = 30
    ctx.beginPath(); roundRect(ctx, cardX, cardY, cardW, cardH, 36)
    ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.lineWidth = 3.5; ctx.strokeStyle = accent; ctx.stroke()
    if (productImgs.length > 0) {
      ctx.clip()
      drawProductGrid(ctx, productImgs, cardX, cardY, cardW, cardH)
    }
  }
  ctx.restore()

  // Dynamic Discount Badge
  if (discountPct > 0) {
    const styleIdx = Math.abs(shape.length + c.theme.name.length)
    const badgeX = shape === 'circle_orbit' ? cx - 240 : cardX + 25
    const badgeY = shape === 'circle_orbit' ? cy - 230 : cardY + 25
    drawDiscountBadge(ctx, badgeX, badgeY, discountPct, accent, styleIdx)
  }

  // Draw Offer Details
  const contentY = cardY + cardH + 50
  drawOfferDetails(c, contentY)
}

// ── 3. Store Identity Header (Light Edition) ──────────────────────────────
function drawStoreHeader(c: RenderContext, customY?: number) {
  const { ctx, width: w, restaurant, logoImg, accent } = c
  const topY = customY ?? 55
  const logoSize = 80
  let logoOffset = 0

  if (logoImg) {
    const logoX = w - 80 - logoSize
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
  ctx.fillText(restaurant.name, w - 80 - logoOffset, topY + 4)

  const headerPhrases = ['عرض مميز وحصري 🔥', 'أقوى العروض الحالية ⚡', 'طعم وجودة لا تقاوم 👑', 'خصم حصري اليوم 🎯']
  const headerSubtitle = headerPhrases[Math.abs(restaurant.name.length) % headerPhrases.length]

  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif'
  ctx.fillStyle = accent
  ctx.fillText(headerSubtitle, w - 80 - logoOffset, topY + 48)
  ctx.restore()
}

// ── 4. Details, Titles & Massive Prices (Light Edition) ───────────────────
function drawOfferDetails(c: RenderContext, startY: number) {
  const { ctx, width: w, offer, accent, deliveryText, marketingPhrase, badgeStyle } = c

  ctx.save()
  let tagH = 44

  if (badgeStyle === 'stamp_seal') {
    ctx.save()
    ctx.translate(w / 2, startY + tagH / 2)
    ctx.rotate(-0.04)
    ctx.font = '900 22px "Segoe UI", Tahoma, Arial, sans-serif'
    const tm = ctx.measureText(marketingPhrase)
    const stampW = tm.width + 48
    
    ctx.beginPath()
    roundRect(ctx, -stampW / 2, -tagH / 2, stampW, tagH, 12)
    ctx.fillStyle = '#ef4444'
    ctx.shadowColor = 'rgba(239, 68, 68, 0.35)'
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(marketingPhrase, 0, 1)
    ctx.restore()
  } else if (badgeStyle === 'ribbon_banner') {
    const tm = ctx.measureText(marketingPhrase)
    const ribW = Math.min(w - 120, tm.width + 80)
    
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, (w - ribW) / 2, startY, ribW, tagH, 20)
    ctx.fillStyle = accent
    ctx.shadowColor = `${accent}44`
    ctx.shadowBlur = 14
    ctx.fill()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 22px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`✨ ${marketingPhrase.replace(/[🔥⚡💥👑🎯🚀✨💰]/gu, '').trim()} ✨`, w / 2, startY + tagH / 2 + 1)
    ctx.restore()
  } else if (badgeStyle === 'flanked_lines') {
    ctx.save()
    ctx.font = '900 26px "Segoe UI", Tahoma, Arial, sans-serif'
    const tm = ctx.measureText(marketingPhrase)
    const textW = tm.width
    const lineW = 70
    const gap = 20
    const cy = startY + tagH / 2

    ctx.strokeStyle = accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(w / 2 - textW / 2 - gap - lineW, cy)
    ctx.lineTo(w / 2 - textW / 2 - gap, cy)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(w / 2 + textW / 2 + gap, cy)
    ctx.lineTo(w / 2 + textW / 2 + gap + lineW, cy)
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = accent
    ctx.fillText(marketingPhrase, w / 2, cy)
    ctx.restore()
  } else {
    // Light Neon Capsule Pill
    ctx.save()
    ctx.font = '900 22px "Segoe UI", Tahoma, Arial, sans-serif'
    const tm = ctx.measureText(marketingPhrase)
    const tagW = tm.width + 46
    
    ctx.beginPath()
    roundRect(ctx, (w - tagW) / 2, startY, tagW, tagH, 18)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = accent
    ctx.shadowColor = 'rgba(0,0,0,0.08)'
    ctx.shadowBlur = 10
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = accent
    ctx.fillText(marketingPhrase, w / 2, startY + tagH / 2)
    ctx.restore()
  }
  ctx.restore()

  // Title in Dark Slate for Maximum Contrast
  const titleY = startY + tagH + 16
  const isLongTitle = (offer.title || '').length > 32
  const titleFontSize = isLongTitle ? 38 : 46
  const titleLineHeight = isLongTitle ? 50 : 58

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `900 ${titleFontSize}px "Segoe UI", Tahoma, Arial, sans-serif`
  ctx.fillStyle = '#0f172a'
  ctx.shadowColor = 'rgba(0,0,0,0.06)'
  ctx.shadowBlur = 8
  const titleBottomY = wrapText(ctx, offer.title, w / 2, titleY, w - 160, titleLineHeight)
  ctx.restore()

  // Dynamic Price Block
  const priceY = titleBottomY + 20
  const priceBottomY = drawPriceBlock(c, priceY)

  const delY = priceBottomY + 32
  drawDeliveryBadge(ctx, w, delY, accent, deliveryText)
}

function drawPriceBlock(c: RenderContext, priceY: number): number {
  const { ctx, width: w, offer, savings, priceStyle, accent } = c

  if (priceStyle === 'dual_box' && offer.original_price) {
    const boxW = 300
    const boxH = 110
    const gap = 18
    const totalW = boxW * 2 + gap
    const startX = (w - totalW) / 2

    // Old Price Box (Light Gray)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 14
    ctx.beginPath(); roundRect(ctx, startX, priceY, boxW, boxH, 22)
    ctx.fillStyle = '#f8fafc'; ctx.fill()
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#cbd5e1'; ctx.stroke()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#64748b'
    ctx.font = 'bold 22px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText('السعر السابق', startX + boxW / 2, priceY + boxH * 0.3)
    ctx.font = 'bold 36px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`${offer.original_price} ₺`, startX + boxW / 2, priceY + boxH * 0.72)
    ctx.restore()

    // New Price Box (Vibrant Accent)
    const newX = startX + boxW + gap
    ctx.save()
    ctx.shadowColor = `${accent}40`; ctx.shadowBlur = 24
    ctx.beginPath(); roundRect(ctx, newX, priceY, boxW, boxH, 22)
    ctx.fillStyle = accent; ctx.fill()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'
    ctx.font = '900 22px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText('سعر العرض 🔥', newX + boxW / 2, priceY + boxH * 0.3)
    ctx.font = '900 46px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`${offer.offer_price} ₺`, newX + boxW / 2, priceY + boxH * 0.72)
    ctx.restore()

    return priceY + boxH
  } else if (priceStyle === 'huge_bold') {
    ctx.save()
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillStyle = accent
    ctx.font = '900 96px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`${offer.offer_price} ₺`, w / 2, priceY)

    let finalBottom = priceY + 102

    if (offer.original_price && savings > 0) {
      const oldY = priceY + 106
      const oldText = `بدلاً من ${offer.original_price} ₺ • وفر ${savings} ₺!`
      ctx.font = 'bold 26px "Segoe UI", Tahoma, Arial, sans-serif'
      const metrics = ctx.measureText(oldText)
      const pillW = metrics.width + 44
      const pillH = 44

      ctx.beginPath(); roundRect(ctx, (w - pillW) / 2, oldY, pillW, pillH, 18)
      ctx.fillStyle = '#f1f5f9'; ctx.fill()
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.2; ctx.stroke()
      ctx.fillStyle = '#475569'; ctx.textBaseline = 'middle'
      ctx.fillText(oldText, w / 2, oldY + pillH / 2)
      finalBottom = oldY + pillH
    }
    ctx.restore()
    return finalBottom
  } else if (priceStyle === 'angled_ribbon') {
    const ribW = 720
    const ribH = 110
    const ribX = (w - ribW) / 2

    ctx.save()
    ctx.shadowColor = `${accent}40`; ctx.shadowBlur = 24
    ctx.beginPath(); roundRect(ctx, ribX, priceY, ribW, ribH, 26)
    ctx.fillStyle = accent; ctx.fill()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'
    ctx.font = '900 48px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`السعر الخارق: ${offer.offer_price} ₺ ✨`, w / 2, priceY + ribH / 2)
    ctx.restore()

    return priceY + ribH
  } else {
    // Default White Fire Tag Pill with Accent Border
    const boxW = 740
    const boxH = 112
    const boxX = (w - boxW) / 2

    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 20
    ctx.beginPath(); roundRect(ctx, boxX, priceY, boxW, boxH, 28)
    ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.lineWidth = 3; ctx.strokeStyle = accent; ctx.stroke()

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = accent
    ctx.font = '900 62px "Segoe UI", Tahoma, Arial, sans-serif'
    const priceText = `${offer.offer_price} ₺`
    ctx.fillText(priceText, w / 2 + (offer.original_price ? 120 : 0), priceY + boxH / 2)

    if (offer.original_price) {
      ctx.fillStyle = '#64748b'
      ctx.font = 'bold 34px "Segoe UI", Tahoma, Arial, sans-serif'
      const oldPriceText = `${offer.original_price} ₺`
      const oldX = w / 2 - 135
      const oldY = priceY + boxH / 2
      ctx.fillText(oldPriceText, oldX, oldY)

      const textMetrics = ctx.measureText(oldPriceText)
      ctx.lineWidth = 4.5; ctx.strokeStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(oldX - textMetrics.width / 2 - 6, oldY)
      ctx.lineTo(oldX + textMetrics.width / 2 + 6, oldY)
      ctx.stroke()
    }
    ctx.restore()
    return priceY + boxH
  }
}

function drawDeliveryBadge(ctx: CanvasRenderingContext2D, w: number, y: number, accent: string, text: string) {
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 23px "Segoe UI", Tahoma, Arial, sans-serif'
  const metrics = ctx.measureText(text)
  const pillW = metrics.width + 50
  const pillH = 48
  const pillX = (w - pillW) / 2

  ctx.beginPath(); roundRect(ctx, pillX, y - pillH / 2, pillW, pillH, 22)
  ctx.fillStyle = '#ecfdf5'; ctx.fill()
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#10b981'; ctx.stroke()
  ctx.fillStyle = '#059669'
  ctx.fillText(text, w / 2, y + 1)
  ctx.restore()
}

// ── 5. Dynamic Multi-Style Discount Badge Engine ────────────────────────
function drawDiscountBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pct: number,
  accent: string,
  styleIndex: number = 0
) {
  const styles = ['starburst', 'tilted_seal', 'neon_capsule', 'ticket_tag', 'corner_sash']
  const style = styles[styleIndex % styles.length]

  ctx.save()

  if (style === 'starburst') {
    const cx = x + 48
    const cy = y + 48
    const r = 46

    ctx.save()
    ctx.shadowColor = 'rgba(239, 68, 68, 0.4)'
    ctx.shadowBlur = 18
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    const starGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, r)
    starGrad.addColorStop(0, '#ef4444')
    starGrad.addColorStop(1, '#dc2626')
    ctx.fillStyle = starGrad
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 16px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText('خصم', cx, cy - 14)
    ctx.font = '900 28px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`%${pct}`, cx, cy + 12)
    ctx.restore()

  } else if (style === 'tilted_seal') {
    const cx = x + 50
    const cy = y + 45
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-0.12)

    ctx.shadowColor = 'rgba(0,0,0,0.18)'
    ctx.shadowBlur = 14
    ctx.beginPath()
    roundRect(ctx, -52, -38, 104, 76, 16)
    ctx.fillStyle = '#dc2626'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#fbbf24'
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fbbf24'
    ctx.font = '900 15px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText('وفر الآن', 0, -12)
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 28px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`-%${pct}`, 0, 14)
    ctx.restore()

  } else if (style === 'ticket_tag') {
    const w = 150
    const h = 64
    ctx.save()
    ctx.translate(x + 20, y + 10)
    ctx.rotate(-0.06)
    ctx.shadowColor = 'rgba(0,0,0,0.15)'
    ctx.shadowBlur = 14

    ctx.beginPath()
    roundRect(ctx, 0, 0, w, h, 14)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = accent
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(18, h / 2, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#cbd5e1'
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#0f172a'
    ctx.font = '900 26px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`خصم %${pct}`, w * 0.58, h / 2)
    ctx.restore()

  } else if (style === 'corner_sash') {
    const w = 165
    const h = 54
    ctx.save()
    ctx.translate(x + 10, y + 10)
    ctx.rotate(-0.08)

    ctx.shadowColor = 'rgba(239, 68, 68, 0.35)'
    ctx.shadowBlur = 14
    ctx.beginPath()
    roundRect(ctx, 0, 0, w, h, 28)
    const sashGrad = ctx.createLinearGradient(0, 0, w, 0)
    sashGrad.addColorStop(0, '#ef4444')
    sashGrad.addColorStop(1, '#f97316')
    ctx.fillStyle = sashGrad
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 24px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`🔥 خصم %${pct}`, w / 2, h / 2 + 1)
    ctx.restore()

  } else {
    // Glowing Bright Pill
    const w = 155
    const h = 52
    ctx.save()
    ctx.shadowColor = `${accent}33`
    ctx.shadowBlur = 14
    ctx.beginPath()
    roundRect(ctx, x, y, w, h, 26)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = accent
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = accent
    ctx.font = '900 24px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillText(`⚡ خصم %${pct}`, x + w / 2, y + h / 2 + 1)
    ctx.restore()
  }

  ctx.restore()
}

// ── 6. Stealth QR Footer (Light Edition) ──────────────────────────────────
async function drawStealthQRFooter(c: RenderContext) {
  const { ctx, width: w, height: h, accent, restaurant, qrTargetUrl } = c

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
    ctx.fillText('امسح الـ QR واطلب أونلاين 📱', textX, qrY + 4)
    ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillStyle = accent
    ctx.fillText(`alfsouq.com/m/${restaurant.slug}`, textX, qrY + 44)
    ctx.font = '500 16px "Segoe UI", Tahoma, Arial, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText('منصة ألف سوق • المنيو الإلكتروني الذكي', textX, qrY + 78)
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

function drawProductGrid(
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (images.length === 0) return

  if (images.length === 1) {
    drawImageCover(ctx, images[0], x, y, w, h)
    return
  }

  const gap = 4

  if (images.length === 2) {
    const halfW = (w - gap) / 2
    ctx.save()
    ctx.beginPath(); ctx.rect(x, y, halfW, h); ctx.clip()
    drawImageCover(ctx, images[0], x, y, halfW, h)
    ctx.restore()

    ctx.save()
    ctx.beginPath(); ctx.rect(x + halfW + gap, y, halfW, h); ctx.clip()
    drawImageCover(ctx, images[1], x + halfW + gap, y, halfW, h)
    ctx.restore()

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + halfW, y, gap, h)
    return
  }

  if (images.length === 3) {
    const halfW = (w - gap) / 2
    const halfH = (h - gap) / 2

    ctx.save()
    ctx.beginPath(); ctx.rect(x, y, halfW, h); ctx.clip()
    drawImageCover(ctx, images[0], x, y, halfW, h)
    ctx.restore()

    ctx.save()
    ctx.beginPath(); ctx.rect(x + halfW + gap, y, halfW, halfH); ctx.clip()
    drawImageCover(ctx, images[1], x + halfW + gap, y, halfW, halfH)
    ctx.restore()

    ctx.save()
    ctx.beginPath(); ctx.rect(x + halfW + gap, y + halfH + gap, halfW, halfH); ctx.clip()
    drawImageCover(ctx, images[2], x + halfW + gap, y + halfH + gap, halfW, halfH)
    ctx.restore()

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + halfW, y, gap, h)
    ctx.fillRect(x + halfW + gap, y + halfH, halfW, gap)
    return
  }

  const halfW = (w - gap) / 2
  const halfH = (h - gap) / 2
  const positions = [
    { x: x, y: y },
    { x: x + halfW + gap, y: y },
    { x: x, y: y + halfH + gap },
    { x: x + halfW + gap, y: y + halfH + gap },
  ]

  for (let i = 0; i < Math.min(4, images.length); i++) {
    const pos = positions[i]
    ctx.save()
    ctx.beginPath(); ctx.rect(pos.x, pos.y, halfW, halfH); ctx.clip()
    drawImageCover(ctx, images[i], pos.x, pos.y, halfW, halfH)
    ctx.restore()
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + halfW, y, gap, h)
  ctx.fillRect(x, y + halfH, w, gap)
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
  lineHeight: number
): number {
  const words = text.split(' ')
  let line = '', currentY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY)
      line = words[n] + ' '
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, currentY)
  return currentY + lineHeight
}
