import '../styles/globals.css'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Script
        src="https://cdn.promotekit.com/promotekit.js"
        data-promotekit="dec051b1-31b9-48f9-b6e9-dec5a86c96f9"
        strategy="afterInteractive"
      />
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
