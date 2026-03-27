/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  serverExternalPackages: ['typeorm', 'pg'],
};

export default nextConfig;
