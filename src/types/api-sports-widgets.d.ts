/**
 * TypeScript declarations for API-SPORTS Widgets v3.1
 * Web components for displaying sports data
 */

declare namespace JSX {
  interface IntrinsicElements {
    'api-sports-widget': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'data-type'?: string
        'data-key'?: string
        'data-sport'?: string
        'data-theme'?: string
        'data-lang'?: string
        'data-custom-lang'?: string
        'data-timezone'?: string
        'data-show-logos'?: string | boolean
        'data-logo-url'?: string
        'data-show-errors'?: string | boolean
        'data-favorite'?: string | boolean
        'data-date'?: string
        'data-league'?: string | number
        'data-country'?: string
        'data-refresh'?: string | number | boolean
        'data-show-toolbar'?: string | boolean
        'data-tab'?: string
        'data-games-style'?: string | number
        'data-target-game'?: string
        'data-target-standings'?: string
        'data-target-team'?: string
        'data-target-player'?: string
        'data-target-league'?: string
        'data-game-id'?: string | number
        'data-game-tab'?: string
        'data-team-statistics'?: string | boolean
        'data-player-statistics'?: string | boolean
        'data-events'?: string | boolean
        'data-quarters'?: string | boolean
        'data-h2h'?: string
        'data-season'?: string | number
        'data-standings'?: string | boolean
        'data-team-id'?: string | number
        'data-team-tab'?: string
        'data-team-squad'?: string | boolean
        'data-player-id'?: string | number
        'data-player-trophies'?: string | boolean
        'data-player-injuries'?: string | boolean
      },
      HTMLElement
    >
  }
}
