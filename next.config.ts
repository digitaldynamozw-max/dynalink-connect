import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig & {
  cpus: number
  workerThreads: boolean
  webpackBuildWorker: boolean
} = {
  output: "standalone",
  cpus: 1,
  workerThreads: false,
  webpackBuildWorker: false,
  experimental: {
    // Shared cPanel hosts often have very low process/thread limits.
    // Force Next to use the smallest possible build fan-out so shared-host
    // thread/process caps do not abort the production build.
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1000,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    qualities: [75, 95],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
