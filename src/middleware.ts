import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''

  // 1. لوحة السوبر أدمن (Super Admin)
  // يتعرف على admin.yourdomain.com أو admin-digital-menu.vercel.app
  if (hostname.startsWith('admin.') || hostname.startsWith('admin-')) {
    if (!url.pathname.startsWith('/admin')) {
      url.pathname = `/admin${url.pathname === '/' ? '' : url.pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // 2. لوحة صاحب المطعم (Restaurant Owner)
  // يتعرف على partner.yourdomain.com أو partner-digital-menu.vercel.app
  if (hostname.startsWith('partner.') || hostname.startsWith('partner-') || hostname.startsWith('restaurant.')) {
    if (!url.pathname.startsWith('/dashboard') && !url.pathname.startsWith('/restaurant-panel')) {
      url.pathname = `/dashboard${url.pathname === '/' ? '' : url.pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
