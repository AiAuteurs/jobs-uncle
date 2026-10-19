import '../styles/globals.css'
import Script from 'next/script'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  const { pathname } = useRouter()
  // Never run third-party scripts or analytics on customer administration pages.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return <Component {...pageProps} />
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
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
