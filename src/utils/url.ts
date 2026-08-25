export function getMainDomainMenuUrl(slug: string): string {
  if (!slug) return 'https://alfsouq.com'

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const origin = window.location.origin
    // If on partner.alfsouq.com, admin.alfsouq.com or alfsouq.com
    if (host.includes('alfsouq.com')) {
      return `https://alfsouq.com/m/${slug}`
    }
    // If on local development, IP, or custom domain
    if (origin && !origin.startsWith('null')) {
      return `${origin}/m/${slug}`
    }
  }
  return `https://alfsouq.com/m/${slug}`
}
