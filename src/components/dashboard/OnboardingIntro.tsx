'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { Target, Calendar, Trophy, ShoppingBag, ArrowRight, X } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { markOnboardingIntroSeen } from '@/lib/users'

interface OnboardingIntroProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingIntro({ isOpen, onClose }: OnboardingIntroProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleComplete = async (skip: boolean = false) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (user) {
        await markOnboardingIntroSeen(user)
      }
      onClose()
      // Navigate to dashboard only if we're not already there
      if (pathname !== '/dashboard') {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error marking onboarding as seen:', error)
      // Still close even if there's an error
      onClose()
      // Navigate to dashboard only if we're not already there
      if (pathname !== '/dashboard') {
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    handleComplete(true)
  }

  const handleStart = () => {
    handleComplete(false)
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto overflow-x-hidden"
      onClick={handleSkip}
      style={{ paddingTop: 'env(safe-area-inset-top, 1rem)', paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}
    >
      <div 
        className="bg-midnight-violet rounded-lg p-6 sm:p-8 w-full max-w-md my-auto shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-lime-yellow pr-2">
            Welcome to Banger Picks!
          </h2>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="text-ivory hover:text-lime-yellow text-2xl sm:text-3xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
            aria-label="Skip"
          >
            <X size={24} />
          </button>
        </div>

        {/* Intro Text */}
        <p className="text-ivory/80 text-base sm:text-lg mb-8 leading-relaxed">
          Here's how it works in 30 seconds:
        </p>

        {/* Features List */}
        <div className="space-y-6 mb-8">
          {/* What Banger Picks is */}
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-yellow/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-lime-yellow" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-ivory mb-1">
                Predict Match Results
              </h3>
              <p className="text-ivory/70 text-sm sm:text-base">
                Choose Home, Draw, or Away for each match. Get it right and earn points!
              </p>
            </div>
          </div>

          {/* Gameweeks */}
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-yellow/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-lime-yellow" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-ivory mb-1">
                Weekly Gameweeks
              </h3>
              <p className="text-ivory/70 text-sm sm:text-base">
                Each week features 10 carefully selected matches. Make your predictions before the deadline!
              </p>
            </div>
          </div>

          {/* Points & Rankings */}
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-yellow/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-lime-yellow" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-ivory mb-1">
                Points & Rankings
              </h3>
              <p className="text-ivory/70 text-sm sm:text-base">
                Climb the weekly and all-time leaderboards. The more accurate you are, the higher you rank!
              </p>
            </div>
          </div>

          {/* Shop & Rewards */}
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-yellow/20 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-lime-yellow" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-ivory mb-1">
                Shop & Rewards
              </h3>
              <p className="text-ivory/70 text-sm sm:text-base">
                Redeem your points for digital badges, themes, and physical merchandise in the shop!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-lime-yellow text-midnight-violet py-3 px-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-opacity-80 flex items-center justify-center gap-2 transition-colors"
          >
            Let's start predicting
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full text-ivory/70 hover:text-ivory text-sm sm:text-base py-2 min-h-[44px] flex items-center justify-center transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
