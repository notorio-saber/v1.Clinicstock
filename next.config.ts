import type { NextConfig } from 'next';

const config: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
      'https://*.cloudworkstations.dev',
      'https://*.firebase.studio',
    ],
  },
  webpack: (config, { isServer }) => {
    // Adicionado para resolver o erro "Module not found: Can't resolve 'firebase-admin'"
    if (!isServer) {
        config.externals.push('firebase-admin');
    }
    return config;
  }
};

export default config;
