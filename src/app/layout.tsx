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
