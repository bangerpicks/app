'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { User } from 'firebase/auth'
import { DisplayNameCapturePanel } from './DisplayNameCapturePanel'
import { dispatchProfileDisplayNameSaved } from '@/lib/user-profile-events'

interface UsernameRequiredGateProps {
  user: User
}

export function UsernameRequiredGate({ user }: UsernameRequiredGateProps) {
  const t = useTranslations('usernameGate')
  const tOnboarding = useTranslations('onboarding')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const scrollbarWidth = window.innerWidth - html.clientWidth
    const prevBodyPaddingRight = body.style.paddingRight

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.paddingRight = prevBodyPaddingRight
    }
  }, [])

  const handleSuccess = () => {
    dispatchProfileDisplayNameSaved()
  }

  if (!mounted) {
    return null
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-midnight-violet overflow-y-auto overflow-x-hidden overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-gate-title"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="flex flex-col flex-1 w-full max-w-lg mx-auto p-4 sm:p-6 min-h-full">
        <div className="mb-6 shrink-0">
          <div className="flex justify-center pt-1 pb-4">
            <Image
              src="/logo.svg"
              alt="Banger Picks"
              width={195}
              height={50}
              priority
              className="object-contain w-[156px] h-[40px] sm:w-[195px] sm:h-[50px]"
            />
          </div>
          <h2 id="username-gate-title" className="text-xl sm:text-2xl font-bold text-lime-yellow text-center">
            {tOnboarding('chooseDisplayName')}
          </h2>
          <p className="text-ivory/70 text-sm text-center mt-2">{t('subtitle')}</p>
        </div>
        <DisplayNameCapturePanel
          authDisplayName={user.displayName}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}