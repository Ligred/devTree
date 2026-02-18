import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for Docker standalone deployment
  output: 'standalone',
  // Allow images from any HTTPS source (for the ImageBlock)
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
