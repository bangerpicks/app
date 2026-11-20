'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface ScrollMetrics {
  scrollWidth: number
  clientWidth: number
  scrollLeft: number
}

interface RankingsTableScrollAreaProps {
  children: ReactNode
  scrollerId?: string
  scrollerTestId?: string
  /** When true, scroller fills remaining viewport height (weekly rankings). */
  fillViewport?: boolean
}

export function RankingsTableScrollArea({
  children,
  scrollerId = 'rankings-table-scroller',
  scrollerTestId = 'rankings-table-scroller',
  fillViewport = false,
}: RankingsTableScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollbarId = useId()
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    scrollWidth: 0,
    clientWidth: 0,
    scrollLeft: 0,
  })

  const readMetrics = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setMetrics({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollLeft: el.scrollLeft,
    })
  }, [])

  useLayoutEffect(() => {
    readMetrics()
  }, [readMetrics, children])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => readMetrics()
    el.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver = new ResizeObserver(() => readMetrics())
    resizeObserver.observe(el)
    const table = el.firstElementChild
    if (table) resizeObserver.observe(table)

    return () => {
      el.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
    }
  }, [readMetrics])

  const maxScroll = Math.max(0, metrics.scrollWidth - metrics.clientWidth)
  const canScroll = maxScroll > 2
  const thumbWidthPct = canScroll
    ? Math.max((metrics.clientWidth / metrics.scrollWidth) * 100, 18)
    : 100
  const thumbTravelPct = 100 - thumbWidthPct
  const thumbLeftPct =
    canScroll && maxScroll > 0
      ? (metrics.scrollLeft / maxScroll) * thumbTravelPct
      : 0

  const scrollFromTrackPointer = (clientX: number) => {
    const track = trackRef.current
    const scroller = scrollRef.current
    if (!track || !scroller || maxScroll <= 0) return

    const rect = track.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const thumbTravelPx = rect.width * (thumbTravelPct / 100)
    const thumbWidthPx = rect.width * (thumbWidthPct / 100)
    const targetThumbLeft = x - thumbWidthPx / 2
    const ratio = thumbTravelPx > 0 ? targetThumbLeft / thumbTravelPx : 0
    scroller.scrollLeft = Math.min(
      maxScroll,
      Math.max(0, ratio * maxScroll)
    )
  }

  const onTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.dataset.thumb === 'true') {
      return
    }
    event.preventDefault()
    scrollFromTrackPointer(event.clientX)
  }

  const onThumbPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const scroller = scrollRef.current
    const track = trackRef.current
    if (!scroller || !track || maxScroll <= 0) return

    const startX = event.clientX
    const startScrollLeft = scroller.scrollLeft
    const trackWidth = track.getBoundingClientRect().width
    const thumbTravelPx = trackWidth * (thumbTravelPct / 100)

    const onMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - startX
      const scrollDelta = thumbTravelPx > 0 ? (deltaX / thumbTravelPx) * maxScroll : 0
      scroller.scrollLeft = Math.min(
        maxScroll,
        Math.max(0, startScrollLeft + scrollDelta)
      )
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const rootClass = fillViewport
    ? 'rankings-this-week-shell flex w-full min-h-0 flex-1 flex-col'
    : 'flex w-full flex-col'

  return (
    <div className={rootClass}>
      <div
        ref={scrollRef}
        id={scrollerId}
        data-testid={scrollerTestId}
        className={`rankings-table-scroller w-full ${
          fillViewport ? 'rankings-table-vert-scroll min-h-0 flex-1' : 'overflow-x-auto'
        }`}
      >
        {children}
      </div>

      {canScroll && (
        <>
          <div className="h-11 shrink-0 lg:hidden" aria-hidden />
          <div
            className="rankings-table-scroll-track-shell lg:hidden fixed inset-x-0 z-[35] border-t border-ivory/15 bg-midnight-violet/97 px-4 pb-2 pt-2 sm:px-5"
            style={{
              bottom:
                'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="mx-auto w-full max-w-2xl lg:max-w-4xl">
              <div
                ref={trackRef}
                id={scrollbarId}
                role="scrollbar"
                aria-orientation="horizontal"
                aria-controls={scrollerId}
                aria-valuemin={0}
                aria-valuemax={maxScroll}
                aria-valuenow={Math.round(metrics.scrollLeft)}
                className="relative h-6 w-full touch-none select-none rounded-full bg-ivory/12 px-0.5"
                onPointerDown={onTrackPointerDown}
              >
                <div
                  data-thumb="true"
                  className="rankings-table-scroll-thumb absolute top-1/2 flex h-[18px] min-w-[3rem] -translate-y-1/2 items-center justify-center overflow-hidden rounded-full"
                  style={{
                    width: `${thumbWidthPct}%`,
                    left: `${thumbLeftPct}%`,
                  }}
                  onPointerDown={onThumbPointerDown}
                >
                  <span
                    className="rankings-table-scroll-thumb-grip"
                    aria-hidden
                  >
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}