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
  scrollHeight: number
  clientHeight: number
  scrollTop: number
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
  const vertTrackRef = useRef<HTMLDivElement>(null)
  const scrollbarId = useId()
  const vertScrollbarId = useId()
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    scrollWidth: 0,
    clientWidth: 0,
    scrollLeft: 0,
    scrollHeight: 0,
    clientHeight: 0,
    scrollTop: 0,
  })

  const readMetrics = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setMetrics({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollLeft: el.scrollLeft,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
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

  const maxScrollX = Math.max(0, metrics.scrollWidth - metrics.clientWidth)
  const canScrollX = maxScrollX > 2
  const thumbWidthPct = canScrollX
    ? Math.max((metrics.clientWidth / metrics.scrollWidth) * 100, 18)
    : 100
  const thumbTravelXPct = 100 - thumbWidthPct
  const thumbLeftPct =
    canScrollX && maxScrollX > 0
      ? (metrics.scrollLeft / maxScrollX) * thumbTravelXPct
      : 0

  const maxScrollY = Math.max(0, metrics.scrollHeight - metrics.clientHeight)
  const canScrollY = fillViewport && maxScrollY > 2
  const thumbHeightPct = canScrollY
    ? Math.max((metrics.clientHeight / metrics.scrollHeight) * 100, 18)
    : 100
  const thumbTravelYPct = 100 - thumbHeightPct
  const thumbTopPct =
    canScrollY && maxScrollY > 0
      ? (metrics.scrollTop / maxScrollY) * thumbTravelYPct
      : 0

  const scrollFromTrackPointer = (clientX: number) => {
    const track = trackRef.current
    const scroller = scrollRef.current
    if (!track || !scroller || maxScrollX <= 0) return

    const rect = track.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width)
    const thumbTravelPx = rect.width * (thumbTravelXPct / 100)
    const thumbWidthPx = rect.width * (thumbWidthPct / 100)
    const targetThumbLeft = x - thumbWidthPx / 2
    const ratio = thumbTravelPx > 0 ? targetThumbLeft / thumbTravelPx : 0
    scroller.scrollLeft = Math.min(
      maxScrollX,
      Math.max(0, ratio * maxScrollX)
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
    if (!scroller || !track || maxScrollX <= 0) return

    const startX = event.clientX
    const startScrollLeft = scroller.scrollLeft
    const trackWidth = track.getBoundingClientRect().width
    const thumbTravelPx = trackWidth * (thumbTravelXPct / 100)

    const onMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - startX
      const scrollDelta = thumbTravelPx > 0 ? (deltaX / thumbTravelPx) * maxScrollX : 0
      scroller.scrollLeft = Math.min(
        maxScrollX,
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

  const scrollFromVertTrackPointer = (clientY: number) => {
    const track = vertTrackRef.current
    const scroller = scrollRef.current
    if (!track || !scroller || maxScrollY <= 0) return

    const rect = track.getBoundingClientRect()
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height)
    const thumbTravelPx = rect.height * (thumbTravelYPct / 100)
    const thumbHeightPx = rect.height * (thumbHeightPct / 100)
    const targetThumbTop = y - thumbHeightPx / 2
    const ratio = thumbTravelPx > 0 ? targetThumbTop / thumbTravelPx : 0
    scroller.scrollTop = Math.min(
      maxScrollY,
      Math.max(0, ratio * maxScrollY)
    )
  }

  const onVertTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.dataset.vertThumb === 'true'
    ) {
      return
    }
    event.preventDefault()
    scrollFromVertTrackPointer(event.clientY)
  }

  const onVertThumbPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const scroller = scrollRef.current
    const track = vertTrackRef.current
    if (!scroller || !track || maxScrollY <= 0) return

    const startY = event.clientY
    const startScrollTop = scroller.scrollTop
    const trackHeight = track.getBoundingClientRect().height
    const thumbTravelPx = trackHeight * (thumbTravelYPct / 100)

    const onMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startY
      const scrollDelta = thumbTravelPx > 0 ? (deltaY / thumbTravelPx) * maxScrollY : 0
      scroller.scrollTop = Math.min(
        maxScrollY,
        Math.max(0, startScrollTop + scrollDelta)
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

  const scroller = (
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
  )

  return (
    <div className={rootClass}>
      {fillViewport ? (
        <div className="flex min-h-0 w-full flex-1 flex-row items-stretch gap-0.5">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{scroller}</div>
          {canScrollY ? (
            <div
              className="rankings-table-scroll-v-track-shell flex w-7 shrink-0 items-stretch justify-center py-1 lg:hidden"
              data-testid="rankings-table-vert-scrollbar"
            >
              <div
                ref={vertTrackRef}
                id={vertScrollbarId}
                role="scrollbar"
                aria-orientation="vertical"
                aria-controls={scrollerId}
                aria-valuemin={0}
                aria-valuemax={maxScrollY}
                aria-valuenow={Math.round(metrics.scrollTop)}
                className="relative h-full min-h-[4rem] w-[18px] touch-none select-none rounded-full bg-ivory/10 py-0.5"
                onPointerDown={onVertTrackPointerDown}
              >
                <div
                  data-vert-thumb="true"
                  className="rankings-table-scroll-thumb rankings-table-scroll-thumb--vertical absolute left-1/2 flex min-h-[2.5rem] w-[14px] -translate-x-1/2 items-center justify-center overflow-hidden rounded-full"
                  style={{
                    height: `${thumbHeightPct}%`,
                    top: `${thumbTopPct}%`,
                  }}
                  onPointerDown={onVertThumbPointerDown}
                >
                  <span
                    className="rankings-table-scroll-thumb-grip rankings-table-scroll-thumb-grip--vertical"
                    aria-hidden
                  >
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        scroller
      )}

      {canScrollX ? (
        <>
          <div className="h-11 shrink-0 lg:hidden" aria-hidden />
          <div
            className="rankings-table-scroll-track-shell lg:hidden fixed inset-x-0 z-[35] border-t border-ivory/15 bg-midnight-violet/97 px-4 pb-2 pt-2 sm:px-5"
            style={{
              bottom:
                'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div
              className={
                fillViewport
                  ? 'w-full px-4 sm:px-5'
                  : 'mx-auto w-full max-w-2xl lg:max-w-4xl'
              }
            >
              <div
                ref={trackRef}
                id={scrollbarId}
                role="scrollbar"
                aria-orientation="horizontal"
                aria-controls={scrollerId}
                aria-valuemin={0}
                aria-valuemax={maxScrollX}
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
      ) : null}
    </div>
  )
}