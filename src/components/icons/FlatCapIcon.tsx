'use client'

import { useId } from 'react'

/** Classic English flat-cap silhouette for the Gaffer mark. */
export function FlatCapIcon({
  className,
  title,
}: {
  className?: string
  title?: string
}) {
  const uid = useId().replace(/:/g, '')
  const maskId = `flat-cap-mask-${uid}`

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="white" />
        {/* Panel seams from crown button */}
        <path
          d="M11.8 5.4 C10.6 8.6 8.4 11.8 5.8 14"
          stroke="black"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M11.8 5.4 C11.6 9 11 12.6 10 15.6"
          stroke="black"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M11.8 5.4 C13.4 8.8 15.6 11.6 18.2 13.4"
          stroke="black"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M11.8 5.4 C14.6 7.2 17.4 8.4 19.6 9"
          stroke="black"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        {/* Crown / brim split */}
        <path
          d="M4.8 14.8 C8 16.2 12.4 16.6 17.6 15.4"
          stroke="black"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        {/* Brim edge highlight */}
        <path
          d="M6.2 17 C9.2 18.6 13 18.8 16.2 17.4"
          stroke="black"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </mask>
      {/* Soft crown + short peak — three-quarter flat cap */}
      <path
        fill="currentColor"
        mask={`url(#${maskId})`}
        d="M4.6 11.2
          C4.4 6.6 7.8 3.2 12 3.2
          C16.8 3.2 20.6 6.8 20.4 11.4
          C20.3 13.2 19.4 14.6 17.8 15.4
          C17.2 15.7 16.8 16.2 16.7 16.8
          C16.5 18.2 15.2 19.2 13.6 19.4
          C11.4 19.7 8.8 19.4 7 18.4
          C5.6 17.6 4.8 16.4 5 15.2
          C5.1 14.6 4.8 14 4.6 13.4
          C4.5 12.7 4.5 11.9 4.6 11.2
          Z"
      />
    </svg>
  )
}
