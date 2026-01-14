'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { User } from 'firebase/auth'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { UserDocument } from '@/lib/users'
import { User as UserIcon, Trophy, Target, Coins, LogOut, Settings } from 'lucide-react'

interface ProfileClientProps {
  user: User
  userData: Partial<UserDocument>
}

export function ProfileClient({ user, userData }: ProfileClientProps) {
  const router = useRouter()
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut(auth)
      // Redirect will happen automatically via auth state change
    } catch (error) {
      console.error('Error signing out:', error)
      setIsSigningOut(false)
    }
  }

  const handleSettingsClick = () => {
    router.push('/settings')
  }

  const displayName = userData.displayName || user.displayName || 'Player'
  const photoURL = userData.photoURL || user.photoURL
  const points = userData.points || 0
  const totalPredictions = userData.totalPredictions || 0
  const correctPredictions = userData.correctPredictions || 0
  const accuracy = userData.accuracy || (totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0)

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      {/* Header */}
      <Header username={displayName} userPhotoUrl={photoURL || undefined} />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-5 pb-20 sm:pb-24 py-4 sm:py-5 overflow-x-hidden">
        {/* Profile Header Section */}
        <div className="w-full flex flex-col items-center gap-4 mb-6">
          {/* Profile Picture */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-lime-yellow/20 border-2 border-lime-yellow flex items-center justify-center overflow-hidden">
            {photoURL ? (
              <Image
                src={photoURL}
                alt={displayName}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-lime-yellow" />
            )}
          </div>

          {/* Display Name */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-ivory mb-1">
              {displayName}
            </h1>
            {user.email && (
              <p className="text-ivory/60 text-sm">{user.email}</p>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="w-full max-w-2xl mx-auto grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          {/* Points Card */}
          <div className="bg-lime-yellow rounded-lg px-4 py-3 flex flex-col items-center gap-1">
            <Coins className="w-6 h-6 text-midnight-violet mb-1" />
            <span className="text-midnight-violet text-xs sm:text-sm font-semibold">{t('points')}</span>
            <span className="text-midnight-violet font-bold text-xl sm:text-2xl">
              {points.toLocaleString()}
            </span>
          </div>

          {/* Accuracy Card */}
          <div className="bg-lime-yellow rounded-lg px-4 py-3 flex flex-col items-center gap-1">
            <Target className="w-6 h-6 text-midnight-violet mb-1" />
            <span className="text-midnight-violet text-xs sm:text-sm font-semibold">{t('accuracy')}</span>
            <span className="text-midnight-violet font-bold text-xl sm:text-2xl">
              {accuracy}%
            </span>
          </div>

          {/* Total Predictions Card */}
          <div className="bg-ivory/10 border border-ivory/20 rounded-lg px-4 py-3 flex flex-col items-center gap-1">
            <Trophy className="w-6 h-6 text-lime-yellow mb-1" />
            <span className="text-ivory/70 text-xs sm:text-sm font-semibold">{t('totalPredictions')}</span>
            <span className="text-ivory font-bold text-xl sm:text-2xl">
              {totalPredictions}
            </span>
          </div>

          {/* Correct Predictions Card */}
          <div className="bg-ivory/10 border border-ivory/20 rounded-lg px-4 py-3 flex flex-col items-center gap-1">
            <Trophy className="w-6 h-6 text-lime-yellow mb-1" />
            <span className="text-ivory/70 text-xs sm:text-sm font-semibold">{t('correct')}</span>
            <span className="text-ivory font-bold text-xl sm:text-2xl">
              {correctPredictions}
            </span>
          </div>
        </div>

        {/* Favorite Team Section */}
        {userData.favoriteTeam && (
          <div className="w-full max-w-2xl mx-auto mb-6 bg-ivory/5 border border-ivory/10 rounded-lg px-4 py-3">
            <h3 className="text-ivory font-semibold text-sm mb-2">{t('favoriteTeam')}</h3>
            <div className="flex items-center gap-3">
              {userData.favoriteTeam.logo && (
                <Image
                  src={userData.favoriteTeam.logo}
                  alt={userData.favoriteTeam.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
              )}
              <span className="text-ivory font-medium">{userData.favoriteTeam.name}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
          {/* Settings Button */}
          <button
            onClick={handleSettingsClick}
            className="w-full bg-ivory/10 border border-ivory/20 rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-ivory hover:bg-ivory/15 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="font-semibold">{tCommon('settings')}</span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full bg-cinnabar/20 border border-cinnabar/40 rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-cinnabar hover:bg-cinnabar/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">{isSigningOut ? tCommon('signingOut') : tCommon('signOut')}</span>
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
