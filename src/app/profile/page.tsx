'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { ProfileClient } from '@/components/dashboard/ProfileClient'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { useUserProfile } from '@/lib/UserProfileProvider'
import { UserDocument } from '@/lib/users'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const { ownProfile, profileStatus, refreshProfile } = useUserProfile()
  const t = useTranslations('profile')

  const userData: Partial<UserDocument> | null = useMemo(() => {
    if (!user) return null
    if (ownProfile) {
      return {
        displayName: ownProfile.displayName,
        photoURL: ownProfile.photoURL,
        points: ownProfile.points,
        totalPredictions: ownProfile.totalPredictions,
        correctPredictions: ownProfile.correctPredictions,
        accuracy: ownProfile.accuracy,
        favoriteTeam: ownProfile.favoriteTeam,
        favoritePlayer: ownProfile.favoritePlayer,
        weekWins1st: ownProfile.weekWins1st,
        weekWins2nd: ownProfile.weekWins2nd,
        weekWins3rd: ownProfile.weekWins3rd,
        seasonTitles: ownProfile.seasonTitles,
        seasonPodiums: ownProfile.seasonPodiums,
      }
    }
    return {
      displayName: user.displayName || 'Player',
      photoURL: user.photoURL || null,
      points: 0,
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      favoriteTeam: null,
      favoritePlayer: null,
    }
  }, [user, ownProfile])

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <NotSignedIn />
  }

  if (profileStatus === 'error' && !ownProfile) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-center text-ivory p-8">
          <p className="text-lg mb-4">{t('loadFailedBackground')}</p>
          <button
            type="button"
            onClick={() => void refreshProfile()}
            className="px-4 py-2 bg-lime-yellow text-midnight-violet rounded font-bold"
          >
            {t('retryNow')}
          </button>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  return <ProfileClient user={user} userData={userData} />
}