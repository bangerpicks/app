'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { PhoneSignInPanel } from './auth/PhoneSignInPanel'
import { EmailAuthPanel } from './auth/EmailAuthPanel'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
}

type SignInMethod = 'phone' | 'email'

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const t = useTranslations('auth')
  const [mounted, setMounted] = useState(false)
  const [method, setMethod] = useState<SignInMethod>('phone')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [referralMessage, setReferralMessage] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')
    if (ref) {
      const trimmedRef = ref.trim().toUpperCase()
      setReferralCode(trimmedRef)
      sessionStorage.setItem('referralCode', trimmedRef)
    } else {
      const storedRef = sessionStorage.getItem('referralCode')
      if (storedRef) setReferralCode(storedRef)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setSuccessMessage(null)
    setReferralMessage(null)
  }, [isOpen, method])

  useEffect(() => {
    if (!isOpen) return

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
  }, [isOpen])

  const handleClose = () => {
    setError(null)
    setSuccessMessage(null)
    setReferralMessage(null)
    onClose()
  }

  const handleDone = () => {
    handleClose()
  }

  const referralMessageClass = (msg: string) =>
    msg.includes('applied')
      ? 'bg-midnight-violet/10 text-midnight-violet border border-midnight-violet/30'
      : 'bg-amber-100 text-amber-900 border border-amber-300'

  if (!mounted) return null

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-lime-yellow overflow-y-auto overflow-x-hidden overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-title"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="flex flex-col flex-1 w-full max-w-lg mx-auto p-4 sm:p-6 min-h-full">
        <div className="relative mb-6 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-0 top-0 text-midnight-violet hover:text-opacity-70 text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center z-10"
            aria-label={t('close')}
          >
            ×
          </button>
          <div className="flex justify-center px-12 pt-1 pb-4">
            <Image
              src="/logo-dark.svg"
              alt="Banger Picks"
              width={195}
              height={50}
              priority
              className="object-contain w-[156px] h-[40px] sm:w-[195px] sm:h-[50px]"
            />
          </div>
          <h2
            id="sign-in-title"
            className="text-xl sm:text-2xl font-bold text-midnight-violet text-center"
          >
            {t('signInUp')}
          </h2>
        </div>

        <div className="flex gap-2 p-0.5 rounded-lg bg-midnight-violet/10 mb-4">
          <button
            type="button"
            onClick={() => setMethod('phone')}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide rounded-md ${
              method === 'phone' ? 'bg-midnight-violet text-lime-yellow' : 'text-midnight-violet/80'
            }`}
          >
            {t('methodPhone')}
          </button>
          <button
            type="button"
            onClick={() => setMethod('email')}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide rounded-md ${
              method === 'email' ? 'bg-midnight-violet text-lime-yellow' : 'text-midnight-violet/80'
            }`}
          >
            {t('methodEmail')}
          </button>
        </div>

        {error ? (
          <div className="mb-4 p-3 bg-cinnabar text-ivory rounded text-sm">{error}</div>
        ) : null}

        {successMessage ? (
          <div className="mb-4 p-3 bg-midnight-violet/10 text-midnight-violet border border-midnight-violet/30 rounded text-sm">
            {successMessage}
          </div>
        ) : null}

        {referralMessage ? (
          <div className={`mb-4 p-3 rounded text-sm ${referralMessageClass(referralMessage)}`}>
            {referralMessage}
          </div>
        ) : null}

        {method === 'phone' ? (
          <PhoneSignInPanel
            referralCode={referralCode}
            onDone={handleDone}
            onError={(msg) => setError(msg || null)}
            onReferralMessage={setReferralMessage}
          />
        ) : (
          <EmailAuthPanel
            referralCode={referralCode}
            onDone={handleDone}
            onError={(msg) => setError(msg || null)}
            onReferralMessage={setReferralMessage}
            onSuccessMessage={setSuccessMessage}
          />
        )}
      </div>
    </div>
  ) : null

  return <>{isOpen && createPortal(modalContent, document.body)}</>
}
