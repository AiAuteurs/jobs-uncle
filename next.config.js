/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/og-image.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/extension',
        destination: 'https://chromewebstore.google.com/detail/jobsuncle-tailor-resume/dpnicfabpajheepcgfmedfcepldfnpma',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
