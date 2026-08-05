export function getMainDomainMenuUrl(slug: string): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    // If on partner.alfsouq.com or admin.alfsouq.com or any sub-domain of alfsouq.com
    if (host.includes('alfsouq.com')) {
      return `https://alfsouq.com/m/${slug}`
    }
  }
  return `/m/${slug}`
}
