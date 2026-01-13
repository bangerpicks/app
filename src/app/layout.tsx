import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ViewportTracker } from '@/components/ViewportTracker'
import { AuthProvider } from '@/lib/AuthProvider'

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
    <html lang="en">
      <body>
        <AuthProvider>
          <ViewportTracker />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
