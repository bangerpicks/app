'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { getUserReferralCode } from '@/lib/users'
import { Share2, X, Minimize2, Maximize2 } from 'lucide-react'

interface ReferralPopupProps {
  className?: string
}

export function ReferralPopup({ className }: ReferralPopupProps) {
  const { user } = useAuth()
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

    const shareText = 'Join me on Banger Picks! ⚽️ Predict matches & earn points!'

    // Check if Web Share API is available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Banger Picks!',
          text: shareText,
          url: link,
        })
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error)
          // Fallback to copy
          copyToClipboard(link)
        }
      }
    } else {
      // Fallback to copy-to-clipboard for desktop
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
              Invite friends and earn 5 points for each signup!
            </p>
            <button
              onClick={() => setIsMinimized(false)}
              className="ml-2 p-1 text-midnight-violet hover:bg-midnight-violet/10 rounded transition-colors"
              aria-label="Expand referral popup"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-3 max-w-6xl mx-auto">
              <div className="flex-1 min-w-0">
                <p className="text-midnight-violet font-semibold text-sm sm:text-base mb-1">
                  Invite your friends and earn 5 points for each signup!
                </p>
                {referralCode && (
                  <p className="text-midnight-violet/80 text-xs sm:text-sm truncate">
                    Your referral code: <span className="font-mono font-bold">{referralCode}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleShare}
                  className="bg-midnight-violet text-lime-yellow px-4 py-2 rounded-lg font-semibold text-sm hover:bg-midnight-violet/90 transition-colors flex items-center gap-2"
                  aria-label="Share referral link"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {copied ? 'Copied!' : 'Share'}
                  </span>
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2 text-midnight-violet hover:bg-midnight-violet/10 rounded transition-colors"
                  aria-label="Minimize referral popup"
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
