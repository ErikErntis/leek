import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@leek/ui', '@leek/contracts'], poweredByHeader: false, experimental: { cpus: 2, turbopackFileSystemCacheForBuild: false } };
export default config;
