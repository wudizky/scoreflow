/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';

const nextConfig = {
  reactStrictMode: true,

  // Docker standalone output (self-contained production build)
  output: 'standalone',

  // API proxy rewrites (local dev; in Docker, Nginx handles this)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
