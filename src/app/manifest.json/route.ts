import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const referer = request.headers.get('referer') || ''

  const isPartner =
    hostname.startsWith('partner.') ||
    hostname.startsWith('partner-') ||
    hostname.startsWith('restaurant.') ||
    referer.includes('/restaurant-panel') ||
    referer.includes('/dashboard')

  if (isPartner) {
    return NextResponse.json({
      name: "لوحة الشريك | ألف سوق",
      short_name: "لوحة الشريك",
      id: "/dashboard",
      description: "لوحة تحكم إدارة المتجر والمطعم الشريك في منصة ألف سوق لتلقي الطلبات وإدارة المنيو والعروض",
      start_url: "/dashboard",
      scope: "/",
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      background_color: "#052e16",
      theme_color: "#16a34a",
      orientation: "portrait-primary",
      dir: "rtl",
      lang: "ar",
      categories: ["business", "shopping"],
      prefer_related_applications: false,
      icons: [
        {
          src: "/partner-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/partner-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
      }
    })
  }

  return NextResponse.json({
    name: "ألف سوق | Alfsouq",
    short_name: "ألف سوق",
    id: "/",
    description: "المنصة التجارية الشاملة لتصفح أحدث المتاجر والمطاعم والمنتجات والعروض التنافسية وتسهيل الطلب المباشر",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0F172A",
    theme_color: "#F97316",
    orientation: "portrait-primary",
    dir: "rtl",
    lang: "ar",
    categories: ["shopping", "food", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    shortcuts: [
      {
        name: "العروض والتخفيضات",
        short_name: "العروض",
        description: "تصفح أحدث العروض والتخفيضات المميزة",
        url: "/offers",
        icons: [
          {
            src: "/shortcut-192.png",
            sizes: "192x192",
            type: "image/png"
          }
        ]
      }
    ]
  }, {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Cache for 24h at CDN — manifest rarely changes
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400'
    }
  })
}
