/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/bank-accounts',
        permanent: false
      }
    ]
  }
}

module.exports = nextConfig
