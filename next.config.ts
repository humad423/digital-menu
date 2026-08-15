import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cache optimized images at Vercel CDN edge for 30 days
    // (images rarely change — this is the biggest lever for Fast Origin Transfer)
    minimumCacheTTL: 2592000, // 30 days in seconds

    // Serve modern formats first (AVIF ~50% smaller than WebP)
    formats: ['image/avif', 'image/webp'],

    // Allow Next.js Image optimizer to process images from these domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'zaxnwqyrdkbquvtkqvyd.supabase.co',
      },
    ],
  },
};

export default nextConfig;
