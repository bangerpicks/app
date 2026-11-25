import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DynamicLang } from '@/components/DynamicLang'
import { AuthProvider } from '@/lib/AuthProvider'
import { UserProfileProvider } from '@/lib/UserProfileProvider'
import { LanguageProvider } from '@/lib/LanguageProvider'
import { IntlProvider } from '@/lib/IntlProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { QueryProvider } from '@/lib/QueryProvider'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { RouteChromeReset } from '@/components/dashboard/RouteChromeReset'
import { LegacyHostingRedirect } from '@/components/LegacyHostingRedirect'
import { getSiteOrigin } from '@/lib/site-url'

const siteOrigin = getSiteOrigin()

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'Banger Picks - Football Predictions',
  description: 'Predict football matches and compete for the top spot',
  openGraph: {
    title: 'Banger Picks - Football Predictions',
    description: 'Predict football matches and compete for the top spot',
    url: '/my-games/',
    siteName: 'Banger Picks',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/app-logo.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: [{ url: '/app-logo.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Banger Picks',
  },
}

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#240830',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          <UserProfileProvider>
          <ErrorBoundary>
            <LanguageProvider>
              <DynamicLang />
              <QueryProvider>
                <IntlProvider>
                  <RouteChromeReset />
                  <LegacyHostingRedirect />
                  <ServiceWorkerRegistration />
                  {children}
                </IntlProvider>
              </QueryProvider>
            </LanguageProvider>
          </ErrorBoundary>
          </UserProfileProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
