/**
 * Utility function to automatically optimize images (Cloudinary on-the-fly WebP conversion and compression)
 */
export function getOptimizedImageUrl(url: string | null | undefined, width = 800): string {
  if (!url) return ''

  // Base64 data URLs don't need Cloudinary transformation
  if (url.startsWith('data:')) return url

  // Transform Cloudinary URLs to automatically serve compressed WebP/AVIF format
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('/f_auto')) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`)
    }
  }

  return url
}
