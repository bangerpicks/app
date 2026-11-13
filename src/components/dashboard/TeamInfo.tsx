'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { TeamInfo as TeamInfoType, FormResult } from '@/types/dashboard'

interface TeamInfoProps {
  team: TeamInfoType
}

const FORM_RESULT_MESSAGE_KEY: Record<FormResult, string> = {
  W: 'formResultWin',
  D: 'formResultDraw',
  L: 'formResultLoss',
}

const FORM_RESULT_ARIA_KEY: Record<FormResult, string> = {
  W: 'formResultWinLabel',
  D: 'formResultDrawLabel',
  L: 'formResultLossLabel',
}

function FormIndicator({ result }: { result: FormResult }) {
  const t = useTranslations('dashboard')

  const getColor = () => {
    switch (result) {
      case 'W':
        return 'bg-lime-yellow text-midnight-violet'
      case 'D':
        return 'bg-[#e68900] text-midnight-violet border border-amber-glow'
      case 'L':
        return 'bg-cinnabar text-midnight-violet'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  return (
    <div
      className={`w-[18px] h-[18px] p-[1px] ${getColor()} rounded-sm flex items-center justify-center`}
      aria-label={t(FORM_RESULT_ARIA_KEY[result])}
      title={t(FORM_RESULT_ARIA_KEY[result])}
    >
      <span className="text-sm font-black leading-5">
        {t(FORM_RESULT_MESSAGE_KEY[result])}
      </span>
    </div>
  )
}

export function TeamInfo({ team }: TeamInfoProps) {
  const t = useTranslations('dashboard')
  const hasForm = team.form.length > 0

  return (
    <div className="flex flex-col gap-2.5 flex-1 items-center min-w-0">
      <div className="flex flex-col gap-2.5 items-center w-full">
        <div className="w-[35px] h-[35px] rounded flex items-center justify-center overflow-hidden flex-shrink-0">
          {team.logo ? (
            <Image
              src={team.logo}
              alt={team.name}
              width={35}
              height={35}
              className="object-contain w-full h-full"
            />
          ) : (
            <div className="w-full h-full" />
          )}
        </div>
        <h3 className="text-sm font-semibold text-white leading-4 text-center truncate w-full px-1">
          {team.name}
        </h3>
      </div>

      {hasForm ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-white/60 uppercase tracking-wider">
            {t('lastFive')}
          </span>
          <div className="flex justify-between items-center gap-1 max-w-[120px] w-full mx-auto">
            {team.form.map((result, index) => (
              <FormIndicator key={index} result={result} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
