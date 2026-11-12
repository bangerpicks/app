import Image from 'next/image'
import Link from 'next/link'
import { UserBadge } from './UserBadge'
import { DesktopHeaderNav } from './DesktopHeaderNav'

interface HeaderProps {
  logoUrl?: string
  username?: string
  userPhotoUrl?: string
}

export function Header({ logoUrl = '/logo.svg', username, userPhotoUrl }: HeaderProps) {
  return (
    <header 
      className="sticky top-0 z-[100] min-h-16 bg-midnight-violet px-4 sm:px-5 py-2 flex items-center gap-3"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <Link href="/dashboard/" className="flex items-center flex-shrink-0">
        <Image
          src={logoUrl}
          alt="Banger Picks Logo"
          width={156}
          height={40}
          priority
          className="object-contain w-[108px] h-[27.7px] sm:w-[140px] sm:h-[36px]"
        />
      </Link>
      <DesktopHeaderNav />
      <div className="flex-shrink-0 ml-auto">
        <UserBadge username={username} />
      </div>
    </header>
  )
}
