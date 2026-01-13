'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SignInModal } from './SignInModal'

interface UserBadgeProps {
  username?: string
}

export function UserBadge({ username }: UserBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // If user is signed in, link to profile page
  if (username) {
    return (
      <Link
        href="/profile"
        className="bg-lime-yellow text-midnight-violet rounded-[10px] px-2.5 h-[25px] flex items-center justify-center hover:opacity-90 cursor-pointer"
      >
        <span className="text-sm font-bold leading-normal tracking-[0.28px] text-right">
          {username}
        </span>
      </Link>
    )
  }

  // If not signed in, show sign in button
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-lime-yellow text-midnight-violet rounded-[10px] px-2.5 h-[25px] flex items-center justify-center hover:opacity-90 cursor-pointer"
      >
        <span className="text-sm font-bold leading-normal tracking-[0.28px] text-right">
          Sign In
        </span>
      </button>
      <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
