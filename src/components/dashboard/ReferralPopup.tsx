'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { getUserReferralCode } from '@/lib/users'
import { Share2, Minimize2, Maximize2 } from 'lucide-react'

interface ReferralPopupProps {
  className?: string
  /** banner = sticky under header; card = inline panel for profile/shop */
  variant?: 'banner' | 'card'
}

export function ReferralPopup({ className, variant = 'banner' }: ReferralPopupProps) {
  const { user } = useAuth()
  const t = useTranslations('referral')
  const [isMinimized, setIsMinimized] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadReferralCode = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const code = await getUserReferralCode(user)
      setReferralCode(code)
    } catch (error) {
      console.error('Error loading referral code:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) void loadReferralCode()
  }, [user, loadReferralCode])

  const getReferralLink = () => {
    if (!referralCode) return ''
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}?ref=${referralCode}`
  }

  const handleShare = async () => {
    const link = getReferralLink()
    if (!link) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('shareTitle'),
          text: t('shareText'),
          url: link,
        })
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error)
          copyToClipboard(link)
        }
      }
    } else {
      copyToClipboard(link)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  if (!user || isLoading) {
    return null
  }

  const shareButton = (
    <button
      type="button"
      onClick={handleShare}
      className="bg-midnight-violet text-lime-yellow px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm hover:bg-midnight-violet/90 transition-colors flex items-center gap-1.5 sm:gap-2 shrink-0"
      aria-label={t('shareAria')}
    >
      <Share2 className="w-4 h-4" />
      <span>{copied ? t('copied') : t('share')}</span>
    </button>
  )

  if (variant === 'card') {
    return (
      <div
        className={`w-full max-w-2xl mx-auto rounded-2xl border-2 border-lime-yellow/40 bg-lime-yellow/10 p-4 ${className ?? ''}`}
      >
        <p className="text-sm font-semibold text-ivory mb-1">{t('banner')}</p>
        {referralCode ? (
          <p className="text-xs text-ivory/75 mb-3">
            {t('yourCodeLabel')}{' '}
            <span className="font-mono font-bold text-lime-yellow">{referralCode}</span>
          </p>
        ) : null}
        {shareButton}
      </div>
    )
  }

  return (
    <div
      className={`sticky z-50 transition-all duration-300 ${
        isMinimized ? 'h-12 overflow-hidden' : ''
      } ${className || ''}`}
      style={{
        top: 'calc(var(--header-height) + env(safe-area-inset-top, 0px))',
      }}
    >
      <div className="bg-lime-yellow border-b-2 border-midnight-violet shadow-lg">
        {isMinimized ? (
          <div className="px-4 py-2 flex items-center justify-between h-12">
            <p className="text-midnight-violet font-semibold text-sm truncate flex-1">
              {t('bannerMinimized')}
            </p>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="ml-2 p-1 text-midnight-violet hover:bg-midnight-violet/10 rounded transition-colors"
              aria-label={t('expandAria')}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="px-3 py-2 sm:px-5 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-6xl mx-auto">
              <div className="flex-1 min-w-0">
                <p className="text-midnight-violet font-semibold text-xs leading-snug sm:text-base sm:mb-1">
                  {t('banner')}
                </p>
                {referralCode && (
                  <p className="hidden sm:block text-midnight-violet/80 text-sm truncate">
                    {t('yourCodeLabel')}{' '}
                    <span className="font-mono font-bold">{referralCode}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {shareButton}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-2 text-midnight-violet hover:bg-midnight-violet/10 rounded transition-colors"
                  aria-label={t('minimizeAria')}
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}