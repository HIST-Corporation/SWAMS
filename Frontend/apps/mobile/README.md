# apps/mobile — RESERVED for Expo

Nothing is built here until the owner approves the mobile spike (Open Decision 8:
Expo vs Capacitor; build order slice 10).

When approved:

- Expo (React Native, JavaScript) + React Navigation + secure token storage + push.
- Routes map 1:1 to the PWA's bottom tabs and deep links (`swams://attendance/today`,
  `swams://leave/requests/:id`) — defined now (Section 11 rule 4).
- The app reuses `packages/design-tokens` (`rn-theme.js`), `domain`, `validation`,
  `permissions`, `api-client` and `i18n` **unchanged** — those packages are DOM-free by rule
  and every package README carries an "RN-safe?" line.
- Platform adapters (`storage`, `secureStore`, `geolocation`, `camera`, `push`, `share`,
  `haptics`, `deepLink`, `connectivity`) get native implementations; the web implementations
  live in `apps/web`.
- Native-only extras stay out of scope until then: background geofence, mock-location
  detection, biometric unlock, QR/NFC punch, haptics.

ADR: see `docs/adr/0008-expo-vs-capacitor.md` (pending — Open Decision 8).
