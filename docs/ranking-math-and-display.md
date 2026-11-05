# Ranking Math & Display

This doc covers the **all-time ranking formula**, **weekly placement multipliers** (×1.5, ×1.3, ×1.2), how we **display rankings per user**, and the **CSS animations** used on the This Week table and the All-Time leaderboard.

---

## 1. All-time ranking math

**Formula (what we show users):**

- **Rank = points + (accuracy × 0.5)**
- **Points** already include weekly placement bonuses (see below).

So the **displayed all-time score** is:

```
allTimeScore = points + (accuracy × 0.5)
```

- **points** — Total points from correct predictions, including any **placement bonuses** from finishing 1st, 2nd, or 3rd in a completed gameweek.
- **accuracy** — Percentage of correct predictions (0–100). We add `accuracy × 0.5` so consistency is rewarded in the leaderboard.

**Backend detail (optional):** In some code paths the stored `allTimeScore` can also include explicit podium weights (`weekWins1st×5`, `weekWins2nd×3`, `weekWins3rd×2`). The user-facing explanation is the one above: rank = points + (accuracy × 0.5), with points already reflecting weekly bonuses.

**Sort order:** All-time rankings are sorted by `allTimeScore` descending. Ties use the same rank until the next lower score.

---

## 2. Weekly placement multipliers (×1.5, ×1.3, ×1.2)

When a gameweek is marked **completed**, the top 3 by that week’s points get **bonus points** added to their **total points** (and thus into all-time):

| Place | Multiplier | Bonus (added to points) |
|-------|------------|--------------------------|
| 1st   | **×1.5**   | +50% of that week’s points |
| 2nd   | **×1.3**   | +30% of that week’s points |
| 3rd   | **×1.2**   | +20% of that week’s points |

So if you score 20 points in a week and finish 1st, you get `20 + 10 = 30` points for that week (effectively ×1.5). These bonuses are applied server-side in `onGameweekStatusChange` and stored on the user’s `points` and `weekWins1st` / `weekWins2nd` / `weekWins3rd` counts.

---

## 3. How we display this per user

### All-time view (card list)

- **Score shown:** `allTimeScore ?? points` (composite score).
- **Per-row “math” (ScoreMathDisplay):**
  - Formula line: `score = pts + (accuracy%×0.5)`.
  - Example: `127 = 98 pts + 29 (58%×0.5)`.
- **Other per-user info:**
  - Rank (with Trophy / Medal / Award icon for 1–3).
  - Display name, “(You)” for current user.
  - **Last week badge** when the user placed 1st, 2nd, or 3rd in the most recently completed gameweek (“Last week champion”, “Last week 2nd”, “Last week 3rd”).
  - Stats: e.g. `correct/total correct • accuracy%`.
- **Styling:** Top 3 use gold / silver / bronze card styles and glow; current user gets a lime-yellow ring.

### This week view (table)

- **Points column:** Weekly points for that gameweek.
- **Multiplier badges:** Only for ranks 1–3 in that week:
  - 1st: **×1.5** (gold).
  - 2nd: **×1.3** (silver).
  - 3rd: **×1.2** (bronze).
- **Last week badge:** Same as all-time, shown next to the name in the User column when applicable.

---

## 4. This week table – animations

- **Multiplier badges** (×1.5, ×1.3, ×1.2) use a **casino-style** treatment:
  - **Class:** `multiplier-badge-gold`, `multiplier-badge-silver`, `multiplier-badge-bronze` (from `RankingsTable.tsx` → `MultiplierBadge`).
  - **Animations (in `globals.css`):**
    - **slot-reveal:** 0.6s, scale/rotate pop-in (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
    - **jackpot-glow-gold / silver / bronze:** 1.5s ease-in-out infinite pulse (box-shadow glow).
  - **Stagger:** Delay 0 ms (1st), 100 ms (2nd), 200 ms (3rd) so they appear in order.

**CSS snippet (concept):**

```css
.multiplier-badge-gold {
  animation: slot-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
    jackpot-glow-gold 1.5s ease-in-out infinite;
}
@keyframes slot-reveal {
  0%   { opacity: 0; transform: scale(0.5) rotate(-12deg); }
  60%  { opacity: 1; transform: scale(1.15) rotate(3deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes jackpot-glow-gold {
  0%, 100% { box-shadow: 0 0 6px #ff9b00, ...; }
  50%      { box-shadow: 0 0 12px #ff9b00, ...; }
}
```

Tailwind animation names are defined in `tailwind.config.ts` (`slot-reveal`, `jackpot-glow-gold`, etc.) and used via the badge classes above.

---

## 5. All-time ranking – CSS and animations

- **Card container:** Each row uses one of:
  - `all-time-card` (default)
  - `all-time-card-gold` (1st)
  - `all-time-card-silver` (2nd)
  - `all-time-card-bronze` (3rd)

- **Animations (in `globals.css`):**
  - **slot-reveal:** Same as badges – 0.5s pop-in (scale/rotate).
  - **jackpot-glow (top 3 only):** 2s ease-in-out infinite glow (gold / silver / bronze) on the card.

- **Stagger:** Each card gets `animationDelay: index * 80` (capped at 400 ms) so rows appear one after another.

**CSS snippet (concept):**

```css
.all-time-card {
  animation: slot-reveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.all-time-card-gold {
  animation: slot-reveal 0.5s ... forwards,
    jackpot-glow-gold 2s ease-in-out infinite;
}
/* Similar for silver/bronze. */
```

**In `RankingsClient.tsx`:**

- `RankingRow` applies the card class and `style={{ animationDelay: `${cardDelay}ms`, animationFillMode: 'both' }}` with `cardDelay = Math.min(index * 80, 400)`.

So: **all-time list** = slot-reveal on every card + continuous glow on top 3, with a staggered delay for a simple “reveal” vibe; **this week table** = same slot-reveal + glow only on the ×1.5 / ×1.3 / ×1.2 badges with a short stagger.

---

## 6. Reference – where it lives in code

| Topic | Location |
|-------|----------|
| All-time formula (client) | `app/src/lib/users.ts` – `computeAllTimeScore`, `getAllTimeRankings` |
| All-time formula (server) | `app/functions/src/index.ts` – `computeAllTimeScoreValue`, autoScoring, `onGameweekStatusChange` |
| Weekly rankings & sort | `app/src/lib/rankings.ts` – `getWeeklyRankingsForGameweek` |
| Placement bonuses (×1.5, ×1.3, ×1.2) | `app/functions/src/index.ts` – `onGameweekStatusChange`, `bonusMultipliers` |
| Multiplier badges (×1.5, ×1.3, ×1.2) | `app/src/components/dashboard/RankingsTable.tsx` – `MultiplierBadge` |
| This week table | `app/src/components/dashboard/RankingsClient.tsx` + `RankingsTable.tsx` |
| All-time cards & ScoreMathDisplay | `app/src/components/dashboard/RankingsClient.tsx` – `RankingRow`, `ScoreMathDisplay` |
| Badge/card animations | `app/src/app/globals.css` – `.multiplier-badge-*`, `.all-time-card*`, `@keyframes slot-reveal`, `jackpot-glow-*` |
| Tailwind animation names | `app/tailwind.config.ts` – `animation` section |
| Copy (“how ranking works”) | `app/src/messages/en.json` – `rankings.howRankingWorks` |

---

## 7. Copy shown to users

- **How ranking works (All Time):**  
  `Rank = points + (accuracy × 0.5). Weekly: 1st ×1.5, 2nd ×1.3, 3rd ×1.2.`
- **Score label:** “score” (or “punt.” in es-MX).
- **Last week badges:** “Last week champion”, “Last week 2nd”, “Last week 3rd” (or localized equivalents).

This keeps the **new all-time math**, **per-user display**, **×1.5 / ×1.3 / ×1.2** explanation, and **this week + all-time animation vibe** in one place for product and front-end reference.
