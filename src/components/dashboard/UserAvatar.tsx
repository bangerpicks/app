'use client'

import { useEffect, useState } from 'react'
import { User as UserIcon } from 'lucide-react'
import { normalizeProfilePhotoUrl } from '@/lib/profile-photo.mjs'

interface UserAvatarProps {
  photoURL?: string | null
  displayName?: string
  className?: string
  /** Classes on the initial fallback character */
  initialClassName?: string
  /** Lucide icon when no photo (profile header style) */
  showUserIcon?: boolean
  iconClassName?: string
}

export function UserAvatar({
  photoURL,
  displayName,
  className = 'w-full h-full object-cover',
  initialClassName = 'text-ivory/50 text-[10px] sm:text-xs font-bold',
  showUserIcon = false,
  iconClassName = 'h-3.5 w-3.5 text-midnight-violet/80',
}: UserAvatarProps) {
  const src = normalizeProfilePhotoUrl(photoURL)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
  }, [src])

  if (!src || loadFailed) {
    if (showUserIcon) {
      return (
        <span className="flex h-full w-full items-center justify-center">
          <UserIcon className={iconClassName} aria-hidden />
        </span>
      )
    }
    return (
      <span className={`flex h-full w-full items-center justify-center ${initialClassName}`}>
        {(displayName || '?').charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    // Native img: auth CDN URLs (Google, Firebase) are not limited to next/image remotePatterns.
    // no-referrer avoids hotlink blocks on Google profile photos.
    <img
      src={src}
      alt=""
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setLoadFailed(true)}
    />
  )
}