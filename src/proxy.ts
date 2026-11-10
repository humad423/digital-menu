import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

function isAdminHost(hostname: string) {
  return hostname.startsWith('admin.') || hostname.startsWith('admin-')
}

function isPartnerHost(hostname: string) {
  return hostname.startsWith('partner.') || hostname.startsWith('partner-') || hostname.startsWith('restaurant.')
}

function isSignedInArea(hostname: string, pathname: string) {
  return (
    isAdminHost(hostname) ||
    isPartnerHost(hostname) ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/restaurant-panel')
  )
}

function route(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // Sign-out lives at the same path on every host, so it must not be rewritten
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next({ request })
  }

  // 1. لوحة السوبر أدمن (Super Admin Domain: admin.alfsouq.com)
  if (isAdminHost(hostname)) {
    // The admin opens store panels on this host, where their session cookie lives
    if (pathname.startsWith('/restaurant-panel')) {
      return NextResponse.next({ request })
    }

    // If admin domain tries to access partner dashboard, redirect to partner domain
    if (pathname.startsWith('/dashboard')) {
      if (hostname.includes('alfsouq.com')) {
        return NextResponse.redirect(`https://partner.alfsouq.com${pathname}${url.search}`)
      }
      return NextResponse.next({ request })
    }

    if (pathname === '/admin/login' || pathname === '/login') {
      url.pathname = '/admin/login'
      return NextResponse.rewrite(url, { request })
    }

    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url, { request })
    }
    return NextResponse.next({ request })
  }

  // 2. لوحة صاحب المطعم (Restaurant Owner Domain: partner.alfsouq.com)
  if (isPartnerHost(hostname)) {
    if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/restaurant-panel')) {
      url.pathname = `/dashboard${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url, { request })
    }
    return NextResponse.next({ request })
  }

  return NextResponse.next({ request })
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const refreshedCookies: { name: string; value: string; options: CookieOptions }[] = []

  // Server Components can't write cookies, so expired sessions are refreshed here.
  // Public pages skip this and stay free of auth round-trips.
  if (isSignedInArea(hostname, request.nextUrl.pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              refreshedCookies.push({ name, value, options })
            })
          },
        },
      }
    )
    await supabase.auth.getUser()
  }

  const response = route(request)
  refreshedCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}

// Only where it does something: the signed-in areas, and every page on the admin and partner addresses,
// which it rewrites. Customers' pages skip it, so a visit served from the CDN costs no server work at all.
export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/restaurant-panel/:path*',
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|partner-manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|woff|woff2|ttf|otf)).*)',
      has: [{ type: 'header', key: 'host', value: '(admin|partner|restaurant)[.-].*' }],
    },
  ],
}
