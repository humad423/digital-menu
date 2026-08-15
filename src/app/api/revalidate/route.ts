import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { clearMemoryCache } from '@/utils/menuCache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, type = 'menu' } = body as {
      slug?: string
      type?: 'menu' | 'offers' | 'home' | 'all'
    }

    // Instantly clear memoryCache for instant data updates without Supabase egress spam
    clearMemoryCache(slug)

    if (type === 'menu' && slug) {
      revalidatePath(`/m/${slug}`, 'layout')
      revalidatePath(`/m/${slug}`, 'page')
    }

    if (type === 'offers' || type === 'all') {
      // Revalidate offers page and home (offers appear on both)
      revalidatePath('/offers', 'page')
      revalidatePath('/', 'page')
    }

    if (type === 'home' || type === 'all') {
      revalidatePath('/', 'page')
    }

    if (type === 'all') {
      // Nuclear option: revalidate everything (used by admin for restaurant CRUD)
      revalidatePath('/m/[slug]', 'layout')
      revalidatePath('/m/[slug]', 'page')
      revalidatePath('/offers', 'page')
      revalidatePath('/', 'page')
    }

    return NextResponse.json({
      revalidated: true,
      type,
      slug: slug ?? null,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { revalidated: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
