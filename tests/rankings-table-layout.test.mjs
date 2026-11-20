import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const MOBILE_SCROLLER_WIDTH_PX = 358 // 390 viewport minus AppShell px-4 (16px × 2)
const RNK_COLUMN_PX = 36 // w-9 (compact rank column)
const USER_COLUMN_MOBILE_PX = 96
const PTS_COLUMN_MOBILE_PX = 36 // w-9 (slim PTS sticky)
const V122_USER_MAX_PX = 144 // max-w min(42vw, 9rem) at 390px
const V122_PTS_PX = 49 // measured sticky PTS at 390px (v1.2.2)

describe('RankingsTable mobile sticky geometry', () => {
  const source = readFileSync(
    new URL('../src/components/dashboard/RankingsTable.tsx', import.meta.url),
    'utf8'
  )

  const scrollAreaSource = readFileSync(
    new URL('../src/components/dashboard/RankingsTableScrollArea.tsx', import.meta.url),
    'utf8'
  )

  const globals = readFileSync(
    new URL('../src/app/globals.css', import.meta.url),
    'utf8'
  )

  it('uses one flex-bound scrollport for sticky headers without double page scroll', () => {
    const rankingsClient = readFileSync(
      new URL('../src/components/dashboard/RankingsClient.tsx', import.meta.url),
      'utf8'
    )
    assert.match(scrollAreaSource, /fillViewport/)
    assert.match(scrollAreaSource, /rankings-table-vert-scroll/)
    assert.match(rankingsClient, /lockWeeklyViewport/)
    assert.match(rankingsClient, /-mx-4 sm:-mx-5/)
    assert.match(rankingsClient, /max-w-none flex-1/)
    assert.match(rankingsClient, /fillViewport/)
    assert.doesNotMatch(rankingsClient, /ReferralPopup/)
    const tabsIdx = rankingsClient.indexOf('rankings-view-tabs')
    const heroIdx = rankingsClient.indexOf("hallOfFameBlurb")
    assert.ok(tabsIdx > -1 && heroIdx > tabsIdx, 'view tabs render above Season/HoF hero')
    assert.match(source, /rankings-table-head-row/)
    assert.match(globals, /\.rankings-table-vert-scroll[\s\S]*min-height: 0/)
    assert.match(globals, /\.rankings-table-head-row th[\s\S]*top: 0/)
    assert.match(source, /rankings-table-sticky-rank/)
    assert.match(globals, /\.rankings-table-sticky-rank::before/)
    assert.match(source, /rankings-table-sticky-user/)
    assert.match(globals, /\.rankings-table-sticky-user[\s\S]*left: calc\(2.25rem - 3px\)/)
  })

  it('uses compact 96px user column and narrower PTS column below sm', () => {
    assert.match(source, /w-\[96px\] min-w-\[96px\] max-w-\[96px\]/)
    assert.match(source, /rankings-table-sticky-pts/)
    assert.match(source, /w-9 min-w-9 sm:w-11/)
  })

  it('exposes a horizontal scroller with iOS-friendly touch styles', () => {
    assert.match(source, /RankingsTableScrollArea/)
    assert.match(scrollAreaSource, /data-testid=\{scrollerTestId\}/)
    assert.match(scrollAreaSource, /scrollerTestId = 'rankings-table-scroller'/)
    assert.match(scrollAreaSource, /rankings-table-scroller/)
    assert.match(globals, /\.rankings-table-scroller[\s\S]*touch-action: pan-x pan-y/)
    assert.match(
      globals,
      /@media \(max-width: 1023px\)[\s\S]*\.rankings-table-scroller\.rankings-table-vert-scroll[\s\S]*touch-action: pan-y/
    )
    assert.match(globals, /overscroll-behavior-x: contain/)
    assert.match(globals, /-webkit-overflow-scrolling: touch/)
  })

  it('exposes a vertical side scrubber for weekly viewport on mobile', () => {
    assert.match(scrollAreaSource, /rankings-table-vert-scrollbar/)
    assert.match(scrollAreaSource, /aria-orientation="vertical"/)
    assert.match(scrollAreaSource, /scrollFromVertTrackPointer/)
    assert.doesNotMatch(
      scrollAreaSource,
      /rankings-table-scroll-v-track-shell[\s\S]*absolute inset-y-0 right-0/
    )
    assert.match(globals, /\.rankings-table-scroll-v-track-shell/)
  })

  it('limits row highlight to devices with hover', () => {
    assert.match(source, /\[@media\(hover:hover\)\]:hover:bg-ivory\/5/)
  })

  it('targets at least ~170px swipe window at 390px viewport', () => {
    const swipeWindowPx =
      MOBILE_SCROLLER_WIDTH_PX -
      RNK_COLUMN_PX -
      USER_COLUMN_MOBILE_PX -
      PTS_COLUMN_MOBILE_PX
    const v122SwipeWindowPx =
      MOBILE_SCROLLER_WIDTH_PX - 49 - V122_USER_MAX_PX - V122_PTS_PX

    assert.equal(swipeWindowPx, 190)
    assert.ok(swipeWindowPx >= 165, 'swipe window should meet QA target')
    assert.ok(swipeWindowPx > v122SwipeWindowPx, 'should reclaim width vs v1.2.2')
    assert.equal(v122SwipeWindowPx, 116) // v1.2.2 measured swipe window at 390px
  })
})

describe('ReferralPopup banner offset', () => {
  const source = readFileSync(
    new URL('../src/components/dashboard/ReferralPopup.tsx', import.meta.url),
    'utf8'
  )

  it('sticks flush under header', () => {
    assert.match(source, /var\(--header-height\)/)
    assert.match(source, /sticky z-50/)
    assert.doesNotMatch(source, /5rem/)
  })
})