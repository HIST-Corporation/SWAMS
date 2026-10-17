/** Next.js static export (Section 5A: marketing only, SSG, en + ne). */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: ['@swams/ui', '@swams/design-tokens', '@swams/i18n'],
};

export default nextConfig;
