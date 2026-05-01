/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  env: {
    NEXT_PUBLIC_ENABLE_DEVNET_TX: 'false',
  }
}

module.exports = nextConfig
