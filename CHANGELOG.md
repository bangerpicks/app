# Changelog

## 1.1.0 — 2026-11-06

First production release of Banger Picks rules and the client that can satisfy them.

- Default-deny Firestore rules: pick deadline and fixture lock, shop balance via `pointsSpent`, stock tied to one redemption, maintenance mode, and public player counts.
- Hosting and rules deploy together. The settings page shows the release version, short commit, and build date.
- Read-only Firestore backup and idempotent migrations for `pointsSpent`, favorite-player prices, and player counts.

Signed-in users can still read every profile and every pick. Cancelling a redemption does not refund `pointsSpent`.
