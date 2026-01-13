import Image from 'next/image'
import Link from 'next/link'
import { UserBadge } from './UserBadge'

interface HeaderProps {
  logoUrl?: string
  username?: string
  userPhotoUrl?: string
}

export function Header({ logoUrl = '/logo.svg', username, userPhotoUrl }: HeaderProps) {
  return (
    <header 
      className="sticky top-0 z-10 h-20 bg-midnight-violet px-4 sm:px-5 py-2.5 flex items-center justify-between"
      style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top, 0px))' }}
    >
      <Link href="/dashboard" className="flex items-center flex-shrink-0">
        <Image
          src={logoUrl}
          alt="Banger Picks Logo"
          width={156}
          height={40}
          priority
          className="object-contain w-[120px] sm:w-[156px] h-auto"
        />
      </Link>
      <UserBadge username={username} />
    </header>
  )
}
