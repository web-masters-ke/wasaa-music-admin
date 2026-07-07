/** @type {import('next').NextConfig} */

// Backend origin for the proxy rewrites (default prod; override via env).
const UPSTREAM = process.env.NEXT_PUBLIC_UPSTREAM_ORIGIN || 'https://dr.wasaachat.com';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.wasaachat.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      // Same-origin proxy for backend calls — kills the Kong CORS strip. The
      // browser sees `/api-proxy/*` on localhost:4003, Next dev forwards it to
      // the real upstream. `NEXT_PUBLIC_API_URL` in .env.local points at
      // `/api-proxy/api/v1` for the same effect.
      { source: '/api-proxy/:path*', destination: `${UPSTREAM}/:path*` },
    ];
  },
};

module.exports = nextConfig;
