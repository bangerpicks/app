'use client'

import { useState, useEffect, useRef } from 'react'

export interface CountdownTime {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number // Total milliseconds remaining
  isExpired: boolean
}

/**
 * Custom hook for countdown timer
 * @param targetDate - The target date to count down to
 * @returns CountdownTime object with time breakdown and formatted string
 */
export function useCountdown(targetDate: Date | null | undefined): {
  time: CountdownTime
  formatted: string
} {
  const [time, setTime] = useState<CountdownTime>(() => {
    if (!targetDate) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
        isExpired: true,
      }
    }

    const now = new Date().getTime()
    const target = targetDate.getTime()
    const difference = target - now

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
        isExpired: true,
      }
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    return {
      days,
      hours,
      minutes,
      seconds,
      total: difference,
      isExpired: false,
    }
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!targetDate) {
      setTime({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
        isExpired: true,
      })
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const target = targetDate.getTime()
      const difference = target - now

      if (difference <= 0) {
        setTime({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
          isExpired: true,
        })
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTime({
        days,
        hours,
        minutes,
        seconds,
        total: difference,
        isExpired: false,
      })
    }

    // Update immediately
    updateCountdown()

    // Update every second
    intervalRef.current = setInterval(updateCountdown, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [targetDate])

  /**
   * Format time as compact string: "2d 5h 30m" or "5h 30m" or "30m"
   * Auto-adjusts to show only relevant units
   */
  const formatTime = (time: CountdownTime): string => {
    if (time.isExpired || time.total <= 0) {
      return '0m'
    }

    const parts: string[] = []

    if (time.days > 0) {
      parts.push(`${time.days}d`)
    }
    if (time.hours > 0) {
      parts.push(`${time.hours}h`)
    }
    if (time.minutes > 0 || parts.length === 0) {
      parts.push(`${time.minutes}m`)
    }

    return parts.join(' ')
  }

  return {
    time,
    formatted: formatTime(time),
  }
}
