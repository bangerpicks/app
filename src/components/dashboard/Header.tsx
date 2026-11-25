import Image from 'next/image'
import Link from 'next/link'
import { COMPETITIONS_HOME_PATH } from '@/lib/app-routes'
import { HeaderActions } from './HeaderActions'
import { DesktopHeaderNav } from './DesktopHeaderNav'

interface HeaderProps {
  logoUrl?: string
  username?: string
  userPhotoUrl?: string
}

export function Header({ logoUrl = '/logo.svg', username, userPhotoUrl }: HeaderProps) {
  return (
    <header 
      className="sticky top-0 z-[120] min-h-16 bg-midnight-violet px-4 sm:px-5 py-2 flex items-center gap-3 pointer-events-auto"
      style={{
        minHeight: 'calc(var(--header-height) + env(safe-area-inset-top, 0px))',
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <Link href={COMPETITIONS_HOME_PATH} className="flex items-center flex-shrink-0 touch-manipulation">
        <Image
          src="/app-logo.svg"
          alt="Banger Picks"
          width={32}
          height={32}
          priority
          className="object-contain w-8 h-8 sm:hidden"
        />
        <Image
          src={logoUrl}
          alt="Banger Picks Logo"
          width={156}
          height={40}
          priority
          className="hidden object-contain w-[140px] h-9 sm:block"
        />
      </Link>
      <DesktopHeaderNav />
      <HeaderActions username={username} userPhotoUrl={userPhotoUrl} />
    </header>
  )
}
