'use client'

import { useEffect, useState } from 'react'
import { UserAvatar } from './UserAvatar'
import { useAuth } from '@/lib/AuthProvider'
import { getUserHeaderPhotoURL, loadUserDocument } from '@/lib/users'
import dynamic from 'next/dynamic'

const SignInModal = dynamic(
  () => import('./SignInModal').then((m) => ({ default: m.SignInModal })),
  { ssr: false }
)

interface UserBadgeProps {
  username?: string
  userPhotoUrl?: string
}

export function UserBadge({ username, userPhotoUrl }: UserBadgeProps) {
  const { user, loading: authLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [resolvedUsername, setResolvedUsername] = useState<string | undefined>(username)
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | undefined>(
    userPhotoUrl
  )

  useEffect(() => {
    if (username) {
      setResolvedUsername(username)
      return
    }
    if (!user) {
      setResolvedUsername(undefined)
      return
    }

    const authName = user.displayName?.trim()
    if (authName && authName !== 'Player') {
      setResolvedUsername(authName)
    }

    let cancelled = false
    void loadUserDocument(user).then((profile) => {
      if (cancelled) return
      const name = profile?.displayName?.trim() || authName
      setResolvedUsername(name || undefined)
    })

    return () => {
      cancelled = true
    }
  }, [username, user])

  useEffect(() => {
    if (userPhotoUrl) {
      setResolvedPhotoUrl(userPhotoUrl)
      return
    }

    if (!user) {
      setResolvedPhotoUrl(undefined)
      return
    }

    let cancelled = false
    getUserHeaderPhotoURL(user).then((url) => {
      if (!cancelled) {
        setResolvedPhotoUrl(url ?? undefined)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, userPhotoUrl])

  const avatar = (
    <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-midnight-violet/25 bg-midnight-violet/10">
      <UserAvatar
        photoURL={resolvedPhotoUrl}
        displayName={resolvedUsername}
        showUserIcon
        iconClassName="h-3.5 w-3.5 text-midnight-violet/80"
      />
    </span>
  )

  if (authLoading) {
    return (
      <span
        className="flex h-[25px] min-w-[4.5rem] items-center justify-center rounded-[10px] bg-lime-yellow/40 px-2.5 text-midnight-violet/60"
        aria-busy="true"
        aria-label="Loading account"
      />
    )
  }

  if (resolvedUsername) {
    return (
      <a
        href="/profile/"
        className="relative z-[101] flex h-8 max-w-[9.5rem] items-center gap-1.5 rounded-[10px] bg-lime-yellow py-0.5 pl-1 pr-2.5 text-midnight-violet hover:opacity-90 touch-manipulation sm:max-w-[11rem]"
      >
        {avatar}
        <span className="truncate text-sm font-bold leading-normal tracking-[0.28px]">
          {resolvedUsername}
        </span>
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex h-[25px] items-center justify-center rounded-[10px] bg-lime-yellow px-2.5 text-midnight-violet hover:opacity-90"
      >
        <span className="text-sm font-bold leading-normal tracking-[0.28px]">
          Sign In
        </span>
      </button>
      <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}