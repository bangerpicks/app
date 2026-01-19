'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { SignInModal } from './SignInModal'
import { Lock } from 'lucide-react'

export function NotSignedIn() {
  const t = useTranslations('auth')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-5 pb-20 sm:pb-24 flex flex-col items-center justify-center overflow-x-hidden">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-ivory/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-lime-yellow" />
          </div>

          {/* Message */}
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-ivory">
              {t('signInRequired')}
            </h1>
            <p className="text-ivory/70 text-base sm:text-lg">
              {t('pleaseSignIn')}
            </p>
          </div>

          {/* Sign In Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full max-w-xs bg-lime-yellow text-midnight-violet py-3 px-6 rounded-lg font-semibold text-lg hover:bg-opacity-90 transition-colors active:bg-opacity-80"
          >
            {t('signIn')}
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Sign In Modal */}
      <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}