# Dashboard Layout Design Documentation

## Overview

This document provides comprehensive design specifications for the Dashboard page layout based on the Figma design. The dashboard is the primary user interface where players view the current gameweek, make match predictions, and interact with the core functionality of the Banger Picks application.

**Figma Design Reference:**
- File Key: `BFnm0wKlzp62rjXmoa6X7i`
- Node ID: `3:6`
- Design URL: `https://www.figma.com/design/BFnm0wKlzp62rjXmoa6X7i/Untitled?node-id=3-6`

### Design Approach

- **Mobile-First**: The design is optimized for mobile devices (iPhone 16 viewport as base)
- **Component-Based**: Modular component structure for reusability
- **Real-time Data**: Displays live gameweek information and match data
- **Interactive Elements**: Prediction buttons, status indicators, and navigation

### Key Features

- Current gameweek display with player count and status
- Match prediction cards with team information
- Form indicators for team performance
- Prediction selection buttons (HOME/DRAW/AWAY)
- Bottom navigation for app navigation

## Layout Structure

The dashboard follows a vertical scrollable layout with four main sections:

```
┌─────────────────────────────────┐
│         Header (80px)           │
│  [Logo]          [User Badge]   │
├─────────────────────────────────┤
│                                 │
│      Main Content Container     │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Intro Section           │ │
│  │   Title & Description     │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Gameweek Info Card      │ │
│  │   - Gameweek Number       │ │
│  │   - Player Count          │ │
│  │   - Status Badge          │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Match Prediction Card   │ │
│  │   - Match Info Header     │ │
│  │   - Team Display          │ │
│  │   - Prediction Buttons    │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Match Prediction Card   │ │
│  │   (Multiple cards)        │ │
│  └───────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│    Bottom Navigation (100px)    │
│  [Dashboard] [Rankings] [Shop]  │
└─────────────────────────────────┘
```

### Header Component

**Dimensions:**
- Height: `80px`
- Padding: `20px` horizontal, `10px` vertical
- Background: `#240830` (midnight-violet)

**Layout:**
- Flexbox with `justify-between` alignment
- Left: Logo (156px width, 40px height)
- Right: User authentication badge

### Main Content Container

**Dimensions:**
- Flexible height (fills remaining space)
- Padding: `20px` horizontal, `10px` vertical
- Gap between sections: `20px`
- Background: `#240830` (midnight-violet)

**Layout:**
- Flex column layout
- Items centered
- Content stretch enabled

### Bottom Navigation

**Dimensions:**
- Height: `100px`
- Padding: `20px` horizontal, `10px` vertical
- Background: `#daff00` (lime-yellow)
- Border radius: `10px` (top corners only)

**Layout:**
- Flexbox with `justify-between` alignment
- Three navigation items (Dashboard, Rankings, Shop)
- Each item: `100px` width, vertical stack (icon + label)

## Component Specifications

### 1. Header Component

**Structure:**
```typescript
Header {
  logo: Image (156px × 40px)
  userBadge: Button/Pill {
    text: username (e.g., "FootyLuver_93")
    backgroundColor: #daff00 (lime-yellow)
    textColor: #240830 (midnight-violet)
    borderRadius: 10px
    padding: 10px
    height: 25px
  }
}
```

**User Badge Specifications:**
- Font: Inter Bold
- Font Size: `14px`
- Letter Spacing: `0.28px`
- Text Alignment: Right
- Border Radius: `10px`
- Padding: `10px`
- Height: `25px`
- Background: `#daff00` (lime-yellow)
- Text Color: `#240830` (midnight-violet)

### 2. Intro Section

**Structure:**
```typescript
IntroSection {
  title: "Predict Football Matches"
  description: "Join fans making predictions and competing for the top spot"
}
```

**Title Specifications:**
- Font: Inter Semi-Bold
- Font Size: `24px`
- Line Height: Normal
- Letter Spacing: `0.24px`
- Color: `#daff00` (lime-yellow)
- Text Alignment: Center
- Padding: `10px` vertical

**Description Specifications:**
- Font: Inter Regular
- Font Size: `20px`
- Line Height: `20px`
- Letter Spacing: `0.2px`
- Color: `#fdfff0` (ivory)
- Text Alignment: Center
- Max Width: `309px`
- Padding: `10px` vertical

### 3. Gameweek Info Card

**Structure:**
```typescript
GameweekCard {
  header: {
    backgroundColor: #daff00 (lime-yellow)
    text: "GAMEWEEK {number}"
    borderRadius: 10px (top corners)
  }
  body: {
    border: 1px solid #daff00 (lime-yellow)
    backgroundColor: transparent
    borderRadius: 10px (bottom corners)
    content: {
      playerCount: {
        icon: Users icon (18px × 18px)
        count: number
        label: "Players Joined"
      }
      status: Badge {
        text: "CLOSED" | "OPEN" | "UPCOMING"
        backgroundColor: #ee4136 (cinnabar) | #daff00 (lime-yellow) | ...
        textColor: #240830 (midnight-violet)
      }
    }
  }
}
```

**Header Specifications:**
- Height: `35px`
- Background: `#daff00` (lime-yellow)
- Border Radius: `10px` (top-left and top-right only)
- Padding: `10px`
- Font: Inter Black Italic
- Font Size: `24px`
- Letter Spacing: `0.24px`
- Text Color: `#240830` (midnight-violet)
- Text Alignment: Center

**Body Specifications:**
- Border: `1px solid #daff00` (lime-yellow)
- Border Radius: `10px` (bottom-left and bottom-right only)
- Padding: `10px`
- Gap: `10px` (between elements)

**Player Count Section:**
- Layout: Horizontal flex with gap `10px`
- Icon: `18px × 18px` (Users icon from Lucide)
- Count Font: Inter Regular, `16px`, Color: `#fdfff0` (ivory)
- Label Font: Inter Regular, `16px`, Color: `#fdfff0` (ivory)

**Status Badge:**
- Background: `#ee4136` (cinnabar) for "CLOSED"
- Padding: `10px` horizontal, `5px` vertical
- Border Radius: `10px`
- Font: Inter Bold Italic
- Font Size: `16px`
- Text Color: `#240830` (midnight-violet)

### 4. Match Prediction Card

**Structure:**
```typescript
MatchCard {
  matchInfoHeader: {
    backgroundColor: #fdfff0 (ivory)
    borderRadius: 10px (top corners)
    content: {
      league: string (left)
      date: string (center)
      time: string (right)
    }
  }
  matchBody: {
    border: 1px solid #fdfff0 (ivory)
    borderRadius: 10px (bottom corners)
    content: {
      homeTeam: TeamInfo
      matchStats: {
        score: "-" | score
        label: "VS"
        positions: {
          home: number
          away: number
        }
        formLabel: "Form"
      }
      awayTeam: TeamInfo
      predictionButtons: [HOME, DRAW, AWAY]
    }
  }
}
```

**Match Info Header Specifications:**
- Height: `35px`
- Background: `#fdfff0` (ivory)
- Border Radius: `10px` (top-left and top-right only)
- Padding: `10px`
- Grid Layout: 3 columns, equal width
- Font: Inter Medium
- Font Size: `12px`
- Text Color: `#240830` (midnight-violet)
- Text Alignment: Left (league), Center (date), Right (time)

**Match Body Specifications:**
- Border: `1px solid #fdfff0` (ivory)
- Border Radius: `10px` (bottom-left and bottom-right only)
- Padding: `10px`
- Gap: `10px` (between sections)

**Team Info Component:**
```typescript
TeamInfo {
  logo: Image (35px × 35px)
  name: string
  form: FormIndicator[] (5 indicators)
}
```

- Logo: `35px × 35px` square (placeholder: `#d9d9d9` gray)
- Name Font: Inter Semi-Bold
- Name Font Size: `14px`
- Name Color: `#ffffff` (white)
- Name Max Height: `40px` (allows line wrapping)
- Form Layout: Horizontal flex with `justify-between`
- Form Indicator Size: `18px × 18px`

**Form Indicator:**
- Size: `18px × 18px`
- Padding: `1px`
- Background: `#daff00` (lime-yellow) for wins
- Border Radius: Inherited (small, for individual indicators)
- Font: Inter Black
- Font Size: `14px`
- Text Color: `#240830` (midnight-violet)
- Text: "W" (Win), "D" (Draw), "L" (Loss)

**Match Stats Section:**
- Layout: Vertical flex, centered
- Height: `101px`
- Gap: `4px` (between position elements)
- Score Display:
  - Font: Inter Semi-Bold
  - Font Size: `24px`
  - Letter Spacing: `0.24px`
  - Color: `#ffffff` (white)
- VS Label:
  - Font: Inter Semi-Bold
  - Font Size: `14px`
  - Letter Spacing: `0.14px`
  - Color: `#ffffff` (white)
- Position Display:
  - Container: `18px × 18px`
  - Padding: `2px`
  - Font: Inter Semi-Bold
  - Font Size: `16px`
  - Color: `#fdfff0` (ivory)
- Form Label:
  - Font: Inter Semi-Bold
  - Font Size: `10px`
  - Letter Spacing: `0.1px`
  - Color: `#ffffff` (white)

**Prediction Buttons:**
```typescript
PredictionButton {
  width: 100px
  height: 40px
  backgroundColor: #fdfff0 (ivory)
  borderRadius: 10px
  text: "HOME" | "DRAW" | "AWAY"
  textColor: #240830 (midnight-violet)
}
```

- Layout: Horizontal flex with gap `10px`
- Width: `100px` per button
- Height: `40px`
- Background: `#fdfff0` (ivory)
- Border Radius: `10px`
- Font: Inter Bold Italic
- Font Size: `16px`
- Letter Spacing: `0.16px`
- Text Color: `#240830` (midnight-violet)
- Cursor: Pointer
- States: Default, Hover, Active, Selected (requires styling)

### 5. Bottom Navigation Component

**Structure:**
```typescript
BottomNav {
  items: [
    {
      icon: Icon (38px × 38px)
      label: "Dashboard"
      active: boolean
    },
    {
      icon: Icon (38px × 38px)
      label: "Rankings"
      active: boolean
    },
    {
      icon: Icon (38px × 38px)
      label: "Shop"
      active: boolean
    }
  ]
}
```

**Navigation Item Specifications:**
- Width: `100px` per item
- Layout: Vertical flex, centered
- Gap: `10px` (between icon and label)
- Icon Size: `38px × 38px`
- Icon Color: `#240830` (midnight-violet)
- Label Font: Inter Semi-Bold
- Label Font Size: `14px`
- Label Letter Spacing: `0.7px`
- Label Color: `#240830` (midnight-violet)
- Active State: Bold/emphasized styling (design shows Dashboard as active)

## Design Tokens

### Colors

All colors align with the brand color system defined in `brand-info/colors.txt`:

| Token | Hex Code | CSS Variable | Usage |
|-------|----------|--------------|-------|
| Background Primary | `#240830` | `--midnight-violet` | Main background, text on light surfaces |
| Primary Accent | `#daff00` | `--lime-yellow` | Headers, buttons, borders, active states |
| Text Light | `#fdfff0` | `--ivory` | Text on dark background, card backgrounds |
| Status Error | `#ee4136` | `--cinnabar` | Closed/error status badges |
| Text Dark | `#240830` | `--midnight-violet` | Text on light backgrounds |
| Draw Accent | `#ff9b00` | `--amber-glow` | Draw indicators (not shown in design, but in brand) |

**Additional Colors:**
- Team Logo Placeholder: `#d9d9d9` (gray)
- Text White: `#ffffff` (white) - used for team names and match stats

### Typography

**Font Family:** Inter (Google Fonts or system fallback)

**Font Weights:**
- Regular: `400`
- Medium: `500`
- Semi-Bold: `600`
- Bold: `700`
- Black: `900`

**Font Styles:**
- Regular
- Italic
- Bold Italic
- Black Italic

**Font Sizes:**

| Usage | Size | Line Height | Letter Spacing | Weight | Style |
|-------|------|-------------|----------------|--------|-------|
| Gameweek Title | `24px` | Normal | `0.24px` | Black | Italic |
| Intro Title | `24px` | Normal | `0.24px` | Semi-Bold | Regular |
| Intro Description | `20px` | `20px` | `0.2px` | Regular | Regular |
| Button Text | `16px` | `20px` | `0.16px` | Bold | Italic |
| Player Count | `16px` | `20px` | `0.16px` | Regular | Regular |
| Status Badge | `16px` | `20px` | `0.16px` | Bold | Italic |
| Team Name | `14px` | `16px` | `0.14px` | Semi-Bold | Regular |
| User Badge | `14px` | Normal | `0.28px` | Bold | Regular |
| Nav Label | `14px` | Normal | `0.7px` | Semi-Bold | Regular |
| Match Info | `12px` | `20px` | `0.2px` | Medium | Regular |
| Form Indicator | `14px` | `20px` | `0.14px` | Black | Regular |
| Position Label | `10px` | `16px` | `0.1px` | Semi-Bold | Regular |

### Spacing

**Gaps:**
- Small: `5px` - Used between related elements
- Medium: `10px` - Standard spacing between components
- Large: `20px` - Major section spacing

**Padding:**
- Small: `10px` - Internal component padding
- Medium: `20px` - Section padding, header/footer padding

**Border Radius:**
- Standard: `10px` - Used for all rounded corners (buttons, cards, badges)

**Component Dimensions:**

| Component | Width | Height | Notes |
|-----------|-------|--------|-------|
| Header | 100% | `80px` | Fixed height |
| Logo | `156px` | `40px` | Fixed dimensions |
| User Badge | Auto | `25px` | Height fixed, width auto |
| Gameweek Header | 100% | `35px` | Full width, fixed height |
| Match Info Header | 100% | `35px` | Full width, fixed height |
| Team Logo | `35px` | `35px` | Square |
| Form Indicator | `18px` | `18px` | Square |
| Prediction Button | `100px` | `40px` | Fixed dimensions |
| Bottom Nav | 100% | `100px` | Fixed height |
| Nav Icon | `38px` | `38px` | Square |
| Nav Item | `100px` | Auto | Width fixed, height auto |
| Users Icon | `18px` | `18px` | Square |

## Component Breakdown

### Header Component

**Data Requirements:**
- Logo image URL
- User authentication state
- Username/display name

**Functionality:**
- Display app logo (links to home/dashboard)
- Show user authentication badge
- User badge should link to profile (if implemented)

**Implementation Notes:**
- Logo should be responsive (maintain aspect ratio)
- User badge should handle long usernames (truncate or wrap)
- Consider adding click handler for user menu/profile

### Gameweek Info Card

**Data Requirements:**
```typescript
interface GameweekData {
  gameweekId: string;
  name: string; // "GAMEWEEK 5"
  playerCount: number; // Total players who joined
  status: 'OPEN' | 'CLOSED' | 'UPCOMING' | 'COMPLETED';
  deadline?: Timestamp;
  startDate?: Timestamp;
  endDate?: Timestamp;
}
```

**Functionality:**
- Display current/active gameweek information
- Show real-time player count
- Display status badge with appropriate color
- Update dynamically as gameweek status changes

**Status Badge Colors:**
- OPEN: `#daff00` (lime-yellow) - Green/yellow
- CLOSED: `#ee4136` (cinnabar) - Red
- UPCOMING: Consider using a neutral color or `#ff9b00` (amber-glow)
- COMPLETED: Consider using a muted color or gray

**Implementation Notes:**
- Player count should update in real-time using Firestore listeners
- Status should be determined by comparing current time with gameweek dates
- Consider adding deadline countdown if gameweek is OPEN

### Match Prediction Card

**Data Requirements:**
```typescript
interface MatchCardData {
  fixtureId: number;
  league: {
    id: number;
    name: string;
    logo?: string;
  };
  date: Date;
  time: string; // Formatted time
  homeTeam: {
    id: number;
    name: string;
    logo: string;
    position: number; // League position
    form: ('W' | 'D' | 'L')[]; // Last 5 matches
  };
  awayTeam: {
    id: number;
    name: string;
    logo: string;
    position: number; // League position
    form: ('W' | 'D' | 'L')[]; // Last 5 matches
  };
  userPrediction?: 'H' | 'D' | 'A' | null; // Current user's prediction
  matchStatus?: string; // NS, 1H, HT, 2H, FT, etc.
  score?: {
    home: number;
    away: number;
  };
}
```

**Functionality:**
- Display match information (league, date, time)
- Show team logos, names, and positions
- Display team form indicators (last 5 matches)
- Allow user to select prediction (HOME/DRAW/AWAY)
- Show selected prediction state
- Disable predictions if gameweek is CLOSED
- Display score when match is finished

**Interactive States:**
- Default: All buttons enabled (if gameweek is OPEN)
- Hover: Button highlight
- Active/Selected: Button should show selected state (different background or border)
- Disabled: Grayed out if gameweek is CLOSED

**Implementation Notes:**
- Team logos should have fallback placeholder (gray square)
- Team names should wrap if too long (max 2 lines)
- Form indicators should map: W = Win (lime-yellow), D = Draw (amber-glow), L = Loss (cinnabar)
- Prediction selection should be saved to Firestore
- Consider optimistic updates for better UX
- Multiple match cards should be rendered in a loop

### Bottom Navigation

**Data Requirements:**
- Current route/path to determine active state
- Navigation routes: `/dashboard`, `/rankings`, `/shop`

**Functionality:**
- Navigation between main app sections
- Highlight active section
- Icon + label for each navigation item

**Implementation Notes:**
- Use Next.js Link component for navigation
- Active state should be determined by current pathname
- Icons should be from Lucide React library
- Consider adding hover states
- Navigation should be persistent across pages (if using layout)

## Implementation Guidance

### Next.js/React Component Structure

**Recommended Component Hierarchy:**
```
app/dashboard/page.tsx (Server Component)
├── DashboardClient (Client Component - 'use client')
    ├── Header
    │   ├── Logo
    │   └── UserBadge
    ├── MainContent
    │   ├── IntroSection
    │   ├── GameweekCard
    │   │   ├── GameweekHeader
    │   │   └── GameweekBody
    │   │       ├── PlayerCount
    │   │       └── StatusBadge
    │   └── MatchCardList
    │       └── MatchCard (multiple)
    │           ├── MatchInfoHeader
    │           └── MatchBody
    │               ├── TeamInfo (home)
    │               ├── MatchStats
    │               ├── TeamInfo (away)
    │               └── PredictionButtons
    └── BottomNavigation
        └── NavItem (3x)
```

**Component Files:**
```
src/components/dashboard/
├── DashboardClient.tsx
├── Header.tsx
├── UserBadge.tsx
├── IntroSection.tsx
├── GameweekCard.tsx
├── MatchCard.tsx
├── TeamInfo.tsx
├── MatchStats.tsx
├── PredictionButtons.tsx
└── BottomNavigation.tsx
```

### Data Fetching Requirements

**Server-Side Data Fetching:**
- Fetch current gameweek ID from Firestore
- Fetch gameweek document with status and metadata
- Fetch fixtures for the current gameweek
- Fetch user predictions (if authenticated)

**Client-Side Data Fetching:**
- Use React Query (TanStack Query) for:
  - Gameweek data (with real-time updates)
  - Player count (with real-time updates)
  - Match fixtures
  - User predictions
  - Team form data (may need API calls)

**Real-time Updates:**
- Use Firestore listeners for:
  - Player count changes
  - Gameweek status changes
  - Match score updates (if displaying live scores)

### State Management

**Local Component State:**
- Selected prediction per match (temporary, before submission)
- Form validation state
- Loading states

**React Query Cache:**
- Gameweek data
- Fixtures data
- User predictions
- Player counts

**Zustand Store (if needed):**
- Global UI state (modals, notifications)
- User authentication state (likely handled by Firebase Auth)

### Responsive Design Considerations

**Mobile-First Approach:**
- Design is optimized for mobile (base: 375px width iPhone 16)
- All dimensions are designed for mobile viewport
- Ensure touch targets are at least 44px × 44px (prediction buttons are 40px, consider increasing)

**Tablet/Desktop Adaptations:**
- Consider max-width container for content (e.g., 768px for tablets, 1024px for desktop)
- Adjust spacing proportionally
- Consider grid layout for match cards on larger screens (2 columns on tablet, 3 on desktop)
- Bottom navigation might become side navigation on desktop

**Responsive Breakpoints (suggested):**
- Mobile: < 768px (default design)
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Accessibility Requirements

**Semantic HTML:**
- Use proper heading hierarchy (h1, h2, h3)
- Use button elements for interactive elements
- Use nav element for navigation
- Use article/section for content sections

**ARIA Labels:**
- Add aria-label to prediction buttons ("Predict home win", "Predict draw", "Predict away win")
- Add aria-label to navigation items
- Add aria-live regions for dynamic content (player count, status)
- Add aria-label to user badge button

**Keyboard Navigation:**
- All interactive elements should be keyboard accessible
- Tab order should be logical
- Focus indicators should be visible (Tailwind focus:ring)

**Screen Readers:**
- Provide alt text for team logos
- Provide descriptive text for icons (Users icon: "Players joined")
- Announce status changes (e.g., "Gameweek closed")
- Describe form indicators clearly

**Color Contrast:**
- Ensure WCAG AA compliance (4.5:1 for text, 3:1 for UI components)
- Verify contrast ratios:
  - Lime-yellow (#daff00) on midnight-violet (#240830): Check contrast
  - Ivory (#fdfff0) on midnight-violet (#240830): Check contrast
  - Midnight-violet (#240830) on ivory (#fdfff0): Check contrast

### Form Indicators Color Mapping

**Design Specification:**
- Win (W): `#daff00` (lime-yellow) background, `#240830` (midnight-violet) text
- Draw (D): Should use `#ff9b00` (amber-glow) background, `#240830` (midnight-violet) text
- Loss (L): Should use `#ee4136` (cinnabar) background, `#240830` (midnight-violet) text

**Note:** The Figma design shows all form indicators as wins (lime-yellow). Implementation should map actual form data to appropriate colors.

### Performance Considerations

**Image Optimization:**
- Use Next.js Image component for team logos
- Implement lazy loading for match cards below the fold
- Use appropriate image sizes (35px × 35px for logos)

**Code Splitting:**
- Use dynamic imports for heavy components if needed
- Consider lazy loading bottom navigation if it's shared across pages

**Data Optimization:**
- Fetch only necessary data (limit gameweek fixtures to active gameweek)
- Use pagination or virtualization if displaying many matches
- Cache static data (team logos, league info)

**Render Optimization:**
- Use React.memo for MatchCard if rendering many cards
- Avoid unnecessary re-renders with proper state management
- Use React Query's cache to minimize refetches

## Design Specifications Table

### Component Dimensions

| Component | Width | Height | Border Radius | Notes |
|-----------|-------|--------|---------------|-------|
| Header | 100% | 80px | - | Fixed height |
| Logo | 156px | 40px | - | Maintain aspect ratio |
| User Badge | Auto | 25px | 10px | Width based on content |
| Intro Section | 100% | Auto | - | Max width: 309px for description |
| Gameweek Card | 100% | Auto | 10px | Full width card |
| Gameweek Header | 100% | 35px | 10px (top) | Fixed height |
| Match Card | 100% | Auto | 10px | Full width card |
| Match Info Header | 100% | 35px | 10px (top) | Fixed height |
| Team Logo | 35px | 35px | - | Square image |
| Form Indicator | 18px | 18px | - | Square |
| Prediction Button | 100px | 40px | 10px | Fixed dimensions |
| Bottom Nav | 100% | 100px | 10px (top) | Fixed height |
| Nav Icon | 38px | 38px | - | Square |
| Nav Item | 100px | Auto | - | Width fixed |

### Spacing Values

| Type | Value | Usage |
|------|-------|-------|
| Gap - Small | 5px | Tight spacing between related elements |
| Gap - Medium | 10px | Standard component spacing |
| Gap - Large | 20px | Major section spacing |
| Padding - Small | 10px | Internal component padding |
| Padding - Medium | 20px | Section padding, header/footer |
| Border Radius | 10px | All rounded corners |

### Color Mapping (Tailwind CSS)

```typescript
// tailwind.config.ts
colors: {
  'midnight-violet': '#240830',
  'lime-yellow': '#daff00',
  'ivory': '#fdfff0',
  'cinnabar': '#ee4136',
  'amber-glow': '#ff9b00',
}
```

### TypeScript Interfaces

```typescript
// Component Props
interface HeaderProps {
  logoUrl: string;
  username: string;
  userPhotoUrl?: string;
}

interface GameweekCardProps {
  gameweek: GameweekData;
  playerCount: number;
}

interface MatchCardProps {
  match: MatchCardData;
  userPrediction?: 'H' | 'D' | 'A' | null;
  onPredictionSelect: (fixtureId: number, prediction: 'H' | 'D' | 'A') => void;
  disabled?: boolean;
}

interface PredictionButtonsProps {
  selected?: 'H' | 'D' | 'A' | null;
  onSelect: (prediction: 'H' | 'D' | 'A') => void;
  disabled?: boolean;
}

interface BottomNavigationProps {
  currentPath: string;
}
```

## Additional Notes

### Design Variations

The Figma design shows two identical match cards. In implementation:
- Cards should be rendered dynamically based on gameweek fixtures
- Support 1-10 matches per gameweek (design shows 2 as example)
- Maintain consistent styling across all match cards

### Missing Design Elements

Consider implementing:
- Loading states (skeletons or spinners)
- Error states (when data fails to load)
- Empty states (when no gameweek or matches available)
- Success feedback (when prediction is saved)
- Hover states for interactive elements
- Active/selected states for prediction buttons
- Disabled states for prediction buttons (when gameweek is CLOSED)

### Data Flow

```
1. User loads dashboard page
2. Server component fetches current gameweek ID
3. Client component mounts and fetches:
   - Gameweek data (React Query)
   - Fixtures for gameweek (React Query)
   - User predictions (React Query)
4. Components render with data
5. User selects prediction → Update local state
6. Submit predictions → API route → Firestore
7. React Query invalidates cache → Refetch data
8. UI updates with new predictions
```

### Integration Points

**Firebase/Firestore:**
- `gameweeks/{gameweekId}` - Gameweek data
- `gameweeks/{gameweekId}/fixtures/{fixtureId}` - Match fixtures
- `predictions/{fixtureId}/entries/{uid}` - User predictions
- `users` collection - Player count aggregation

**API Routes (Next.js):**
- `/api/gameweek/current` - Get current gameweek
- `/api/gameweek/{id}/fixtures` - Get gameweek fixtures
- `/api/predictions` - Submit user predictions
- `/api/predictions/user` - Get user predictions

**External APIs:**
- API-Football.com - Team form data, league positions (if not cached in Firestore)

## References

- [Brand Colors](./../brand-info/colors.txt)
- [Figma Design](https://www.figma.com/design/BFnm0wKlzp62rjXmoa6X7i/Untitled?node-id=3-6)
- [Architecture Documentation](./architecture.md)
- [Database Schema](./database-schema.md)
- [API Reference](./api-reference.md)
- [Figma MCP Integration Guide](./figma-mcp-integration.md)
