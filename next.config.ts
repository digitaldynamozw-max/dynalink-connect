import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    inlineCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 95],
    // Disable Next.js server-side image optimization to avoid native `sharp` dependency
    // on hosts where native binaries can't be installed (cPanel/shared hosts).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: https://maps.googleapis.com https://maps.gstatic.com; frame-src 'self' https://www.google.com https://maps.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        ],
      },
    ]
  },
};

export default nextConfig;
