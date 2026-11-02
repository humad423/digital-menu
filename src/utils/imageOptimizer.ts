/**
 * Asks Cloudinary for the smallest acceptable version of an image: the modern format
 * the browser supports, at the lowest quality that still looks fine, at the display width.
 */
export function getOptimizedImageUrl(url: string | null | undefined, width = 640): string {
  if (!url) return ''

  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/f_auto')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto:eco,w_${width},c_limit/`)
  }

  return url
}
