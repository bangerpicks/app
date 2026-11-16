'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { getUserReferralCode } from '@/lib/users'
import { Share2, Minimize2, Maximize2 } from 'lucide-react'

interface ReferralPopupProps {
  className?: string
}

export function ReferralPopup({ className }: ReferralPopupProps) {
  const { user } = useAuth()
  const t = useTranslations('referral')
  const [isMinimized, setIsMinimized] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      loadReferralCode()
    }
  }, [user])

  const loadReferralCode = async () => {
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
  }

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

  return (
    <div
      className={`sticky z-50 transition-all duration-300 ${
        isMinimized ? 'h-12 overflow-hidden' : ''
      } ${className || ''}`}
      style={{ top: 'calc(5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div className="bg-lime-yellow border-b-2 border-midnight-violet shadow-lg">
        {isMinimized ? (
          <div className="px-4 py-2 flex items-center justify-between h-12">
            <p className="text-midnight-violet font-semibold text-sm truncate flex-1">
              {t('bannerMinimized')}
            </p>
            <button
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
                <button
                  onClick={handleShare}
                  className="bg-midnight-violet text-lime-yellow px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm hover:bg-midnight-violet/90 transition-colors flex items-center gap-1.5 sm:gap-2"
                  aria-label={t('shareAria')}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {copied ? t('copied') : t('share')}
                  </span>
                </button>
                <button
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