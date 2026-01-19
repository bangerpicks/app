import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import { ViewportTracker } from '@/components/ViewportTracker'
import { DynamicLang } from '@/components/DynamicLang'
import { AuthProvider } from '@/lib/AuthProvider'
import { LanguageProvider } from '@/lib/LanguageProvider'
import { IntlProvider } from '@/lib/IntlProvider'

export const metadata: Metadata = {
  title: 'Banger Picks - Football Predictions',
  description: 'Predict football matches and compete for the top spot',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/app-logo.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning>
      <body>
        <Script
          type="module"
          src="https://widgets.api-sports.io/3.1.0/widgets.js"
          strategy="lazyOnload"
        />
        <AuthProvider>
          <LanguageProvider>
            <DynamicLang />
            <IntlProvider>
              <ViewportTracker />
              {children}
            </IntlProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
