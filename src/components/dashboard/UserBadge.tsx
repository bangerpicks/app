'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User as UserIcon } from 'lucide-react'
import { useAuth } from '@/lib/AuthProvider'
import { getUserHeaderPhotoURL } from '@/lib/users'
import { SignInModal } from './SignInModal'

interface UserBadgeProps {
  username?: string
  userPhotoUrl?: string
}

export function UserBadge({ username, userPhotoUrl }: UserBadgeProps) {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | undefined>(
    userPhotoUrl
  )

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
      {resolvedPhotoUrl ? (
        <Image
          src={resolvedPhotoUrl}
          alt=""
          width={24}
          height={24}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <UserIcon className="h-3.5 w-3.5 text-midnight-violet/80" aria-hidden />
        </span>
      )}
    </span>
  )

  if (username) {
    return (
      <Link
        href="/profile/"
        className="flex h-8 max-w-[9.5rem] items-center gap-1.5 rounded-[10px] bg-lime-yellow py-0.5 pl-1 pr-2.5 text-midnight-violet hover:opacity-90 sm:max-w-[11rem]"
      >
        {avatar}
        <span className="truncate text-sm font-bold leading-normal tracking-[0.28px]">
          {username}
        </span>
      </Link>
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