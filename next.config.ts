import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // fără bulina „N" de dezvoltare peste bara fixă de jos (erorile apar în continuare)
  devIndicators: false,
  // native bindings — nu le bundle-ui în bundler
  serverExternalPackages: ['onnxruntime-node', 'sharp'],
};

export default nextConfig;
