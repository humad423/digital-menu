import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // Bypass static files, PWA files, icons, images, service worker, manifest
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname === '/icon-192.png' ||
    pathname === '/icon-512.png' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/shortcut-192.png' ||
    pathname === '/screenshot-mobile.png' ||
    pathname === '/screenshot-desktop.png' ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|json|woff|woff2|ttf|otf)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // 1. لوحة السوبر أدمن (Super Admin)
  // يتعرف على admin.yourdomain.com أو admin-digital-menu.vercel.app
  if (hostname.startsWith('admin.') || hostname.startsWith('admin-')) {
    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // 2. لوحة صاحب المطعم (Restaurant Owner)
  // يتعرف على partner.yourdomain.com أو partner-digital-menu.vercel.app
  if (hostname.startsWith('partner.') || hostname.startsWith('partner-') || hostname.startsWith('restaurant.')) {
    if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/restaurant-panel')) {
      url.pathname = `/dashboard${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png|apple-touch-icon.png).*)',
  ],
}
