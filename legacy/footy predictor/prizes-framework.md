# Prizes Framework

## Overview
This document outlines the prize structure for the Footy Predictor app based on the number of participating players in each gameweek.

## Prize Tiers

### Tier 1: 0-9 Players
- **Prize**: T-shirt
- **Description**: Custom Footy Predictor branded t-shirt
- **Player Range**: 1-9 participants

### Tier 2: 10-19 Players
- **Prize**: $10 Gift Card
- **Description**: Digital gift card to popular retailers
- **Player Range**: 10-19 participants

### Tier 3: 20-49 Players
- **Prize**: $25 Gift Card
- **Description**: Digital gift card to popular retailers
- **Player Range**: 20-49 participants

### Tier 4: 50-99 Players
- **Prize**: $50 Gift Card
- **Description**: Digital gift card to popular retailers
- **Player Range**: 50-99 participants

## Implementation Notes

### Display Logic
- Show current tier based on actual player count
- Display next tier as incentive for growth
- Update dynamically as players join

### UI Elements
- Current prize tier (left circle)
- Player count (center)
- Next prize tier (right circle)
- Dashed lines connecting elements

### Future Considerations
- Additional tiers for 100+ players
- Cash prizes for higher tiers
- Special prizes for consecutive wins
- Seasonal/tournament prizes

## Example Scenarios

**Scenario 1**: 15 players
- Current: $10 Gift Card (10-19 tier)
- Next: $25 Gift Card (20-49 tier)

**Scenario 2**: 65 players
- Current: $50 Gift Card (50-99 tier)
- Next: TBD (100+ tier)

**Scenario 3**: 8 players
- Current: T-shirt (0-9 tier)
- Next: $10 Gift Card (10-19 tier)

## Technical Implementation

### Data Structure
```javascript
const prizeTiers = [
    { min: 0, max: 9, prize: "T-shirt", value: 0 },
    { min: 10, max: 19, prize: "$10 Gift Card", value: 10 },
    { min: 20, max: 49, prize: "$25 Gift Card", value: 25 },
    { min: 50, max: 99, prize: "$50 Gift Card", value: 50 }
];
```

### Functions Needed
- `getCurrentTier(playerCount)` - Returns current prize tier
- `getNextTier(playerCount)` - Returns next achievable tier
- `formatPrizeDisplay(tier)` - Formats tier for UI display

---

*Last Updated: [Current Date]*
*Version: 1.0*
