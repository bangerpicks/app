import Image from 'next/image'
import { TeamInfo as TeamInfoType, FormResult } from '@/types/dashboard'

interface TeamInfoProps {
  team: TeamInfoType
}

function FormIndicator({ result }: { result: FormResult }) {
  const getColor = () => {
    switch (result) {
      case 'W':
        return 'bg-lime-yellow text-midnight-violet'
      case 'D':
        return 'bg-amber-glow text-midnight-violet'
      case 'L':
        return 'bg-cinnabar text-midnight-violet'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  return (
    <div
      className={`w-[18px] h-[18px] p-[1px] ${getColor()} rounded-sm flex items-center justify-center`}
    >
      <span className="text-sm font-black leading-5">{result}</span>
    </div>
  )
}

export function TeamInfo({ team }: TeamInfoProps) {
  return (
    <div className="flex flex-col gap-2.5 flex-1 items-center min-w-0">
      <div className="flex flex-col gap-2.5 items-center w-full">
        <div className="w-[35px] h-[35px] bg-[#d9d9d9] rounded flex items-center justify-center overflow-hidden flex-shrink-0">
          {team.logo ? (
            <Image
              src={team.logo}
              alt={team.name}
              width={35}
              height={35}
              className="object-contain"
            />
          ) : (
            <div className="w-full h-full bg-[#d9d9d9]" />
          )}
        </div>
        <h3 className="text-sm font-semibold text-white leading-4 text-center truncate w-full px-1">
          {team.name}
        </h3>
      </div>
      <div className="flex justify-between items-center gap-1 max-w-[120px] w-full mx-auto">
        {team.form.map((result, index) => (
          <FormIndicator key={index} result={result} />
        ))}
      </div>
    </div>
  )
}
