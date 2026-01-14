# Dashboard Setup

The dashboard has been created according to the specifications in `docs/figma/dashboard-layout.md`.

## Next Steps

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Firebase** (if not already configured):
   - Create a `.env.local` file with your Firebase credentials
   - Configure Firebase in `src/lib/firebase/` (to be created)

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **View Dashboard**:
   - Navigate to `http://localhost:3000/dashboard`

## Component Structure

The dashboard components are organized as follows:

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # Dashboard page (server component)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles with Tailwind
├── components/
│   └── dashboard/
│       ├── DashboardClient.tsx     # Main client wrapper
│       ├── Header.tsx              # Header with logo and user badge
│       ├── UserBadge.tsx           # User badge component
│       ├── IntroSection.tsx        # Intro title and description
│       ├── GameweekCard.tsx        # Gameweek info card
│       ├── MatchCard.tsx           # Match prediction card
│       ├── TeamInfo.tsx            # Team display with form
│       ├── MatchStats.tsx          # Match score and positions
│       ├── PredictionButtons.tsx   # HOME/DRAW/AWAY buttons
│       └── BottomNavigation.tsx    # Bottom nav (Dashboard/Rankings/Shop)
└── types/
    └── dashboard.ts          # TypeScript types
```

## TODO

- [ ] Integrate Firebase Authentication
- [ ] Implement data fetching from Firestore
- [ ] Add prediction submission logic
- [ ] Add real-time updates for player count
- [ ] Add error and loading states
- [ ] Add empty state when no matches available
- [ ] Implement team logo loading from API-Football
- [ ] Add form indicator color mapping (W/D/L)
- [ ] Add responsive design for tablet/desktop
- [ ] Add accessibility improvements (ARIA labels, keyboard navigation)

## Design Specifications

All components follow the exact specifications from `docs/figma/dashboard-layout.md`:

- **Colors**: Brand colors from `brand-info/colors.txt`
- **Typography**: Inter font family with specified weights and sizes
- **Spacing**: 10px/20px padding and gaps as specified
- **Dimensions**: All component sizes match the design specs
- **Layout**: Mobile-first design optimized for 375px width
