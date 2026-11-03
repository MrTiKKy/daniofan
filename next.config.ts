import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // fără bulina „N" de dezvoltare peste bara fixă de jos (erorile apar în continuare)
  devIndicators: false,
  // native bindings — nu le bundle-ui în bundler
  serverExternalPackages: ['onnxruntime-node', 'sharp'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
