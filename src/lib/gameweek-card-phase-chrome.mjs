/**
 * Header + body border styling per gameweek display phase (keep in sync with gameweek-card-phase-chrome.ts).
 */

/**
 * @typedef {'UPCOMING' | 'OPEN' | 'CLOSING_SOON' | 'PICKS_LOCKED' | 'LIVE' | 'FINAL' | 'COMPLETED'} GameweekDisplayPhase
 * @typedef {'normal' | 'warning' | 'critical' | 'expired'} UrgencyLevel
 */

/**
 * @param {GameweekDisplayPhase} phase
 * @param {UrgencyLevel} urgencyLevel
 */
export function resolveGameweekCardPhaseChrome(phase, urgencyLevel = 'normal') {
  if (phase === 'CLOSING_SOON') {
    if (urgencyLevel === 'critical') return chromeCinnabar()
    if (urgencyLevel === 'warning') return chromeAmber()
    return chromeLime()
  }

  switch (phase) {
    case 'OPEN':
      return chromeLime()
    case 'UPCOMING':
      return chromeAmber()
    case 'PICKS_LOCKED':
      return chromeIvory()
    case 'LIVE':
      return chromeCinnabar()
    case 'FINAL':
      return chromeMuted()
    case 'COMPLETED':
      return chromeCompleted()
    default:
      return chromeMuted()
  }
}

function chromeLime() {
  return {
    headerShell: 'bg-lime-yellow text-midnight-violet',
    headerAnimation: 'gameweek-card-header-glow',
    bodyBorder:
      'border-2 border-lime-yellow shadow-[0_0_18px_rgba(218,255,0,0.22)] hover:shadow-[0_0_30px_rgba(218,255,0,0.38)]',
    usersIcon: 'text-lime-yellow',
    metaRow: 'rounded-xl bg-lime-yellow/10 border border-lime-yellow/40',
    playersCount: 'text-lime-yellow',
    playersLabel: 'text-ivory/70',
  }
}

function chromeAmber() {
  return {
    headerShell: 'bg-amber-glow text-midnight-violet',
    headerAnimation: 'gameweek-card-header-slot',
    bodyBorder:
      'border-2 border-amber-glow/60 shadow-[0_0_14px_rgba(255,155,0,0.28)] hover:shadow-[0_0_22px_rgba(255,155,0,0.4)]',
    usersIcon: 'text-amber-glow',
    metaRow: 'rounded-xl bg-amber-glow/10 border border-amber-glow/45',
    playersCount: 'text-amber-glow',
    playersLabel: 'text-ivory/70',
  }
}

function chromeCinnabar() {
  return {
    headerShell: 'bg-cinnabar text-ivory',
    headerAnimation: 'gameweek-card-header-slot',
    bodyBorder:
      'border-2 border-cinnabar/55 shadow-[0_0_14px_rgba(238,65,54,0.22)] hover:shadow-[0_0_22px_rgba(238,65,54,0.35)]',
    usersIcon: 'text-cinnabar',
    metaRow: 'rounded-xl bg-cinnabar/15 border border-cinnabar/45',
    playersCount: 'text-ivory',
    playersLabel: 'text-ivory/75',
  }
}

function chromeIvory() {
  return {
    headerShell: 'bg-ivory text-midnight-violet',
    headerAnimation: 'gameweek-card-header-slot',
    bodyBorder: 'border-2 border-ivory/40',
    usersIcon: 'text-ivory/80',
    metaRow: 'rounded-xl bg-ivory/10 border border-ivory/35',
    playersCount: 'text-ivory',
    playersLabel: 'text-ivory/65',
  }
}

function chromeMuted() {
  return {
    headerShell: 'bg-ivory/20 text-ivory',
    headerAnimation: 'gameweek-card-header-slot',
    bodyBorder: 'border border-ivory/30',
    usersIcon: 'text-ivory/60',
    metaRow: 'rounded-xl bg-ivory/5 border border-ivory/25',
    playersCount: 'text-ivory/90',
    playersLabel: 'text-ivory/55',
  }
}

function chromeCompleted() {
  /** Match StatusBadge COMPLETED pill: bg-gray-500/20 text-gray-400 border-gray-500/30 */
  return {
    headerShell: 'bg-gray-500/20 text-gray-400',
    headerAnimation: 'gameweek-card-header-slot',
    bodyBorder: 'border border-gray-500/30',
    usersIcon: 'text-gray-400',
    metaRow: 'rounded-xl bg-gray-500/20 border border-gray-500/30',
    playersCount: 'text-gray-300',
    playersLabel: 'text-gray-500',
  }
}