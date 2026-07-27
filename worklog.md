# Lumina — Tarot · Manifestation · Frequencies PWA

## Project Status
Building a mobile-responsive, PWA-installable tarot + manifestation + frequency app
using the "Lumina Cybernetics" design language (black bg, glass surfaces, gold #C5A87C
accent, sage #7A8680, light-green #B5CD7E, Inter thin weights, 4px rhythm, glass +
gradient-border shells).

### Confirmed decisions
1. AI LLM tarot interpretations via z-ai-web-dev-sdk (free = short Yes/No + 1 line; premium = deep)
2. Anonymous device-ID identity + mock premium toggle + realistic upgrade screen (no real Stripe)
3. Web Audio API engine: pure tones + binaural + ambient pad, auto-intention detection
4. Notifications API + Badging API + in-app Widget Preview (no native widget possible on web)
5. Public-domain Rider-Waite card imagery (download to /public/tarot)

### Tech
Next.js 16 App Router, TS, Tailwind 4, shadcn/ui (new-york), Prisma/SQLite, Zustand,
TanStack Query, framer-motion, z-ai-web-dev-sdk. Single `/` route, tab-based mobile app.

---
Task ID: 1
Agent: main
Task: Foundation — design system, Prisma schema, PWA manifest/SW/icons, layout, providers, app shell

Work Log:
- (in progress)

---
Task ID: 2
Agent: tarot-data-agent
Task: Generate 78-card Rider-Waite tarot dataset

Work Log:
- Read prior worklog; confirmed Next.js + TS + Tailwind 4 Lumina stack and design intent.
- Authored /home/z/my-project/src/lib/tarot-data.ts containing TarotCard type and TAROT_DECK const array with all 78 cards.
- Major arcana (0–21): Fool through World, with elemental, astrological, and numerological correspondences authentic to Rider-Waite-Smith tradition. Used celestial/planetary glyphs (☉ ☽ ♀ ♂ ♃ ♄ ♅ ♆ ♇ ☿) and zodiac signs (♈–♓) plus thematic emoji for symbols.
- Minor arcana: 14 Wands (Fire, 🜂), 14 Cups (Water, 🜄), 14 Swords (Air, 🜁), 14 Pentacles (Earth, 🜃). Alchemical element glyph used consistently per suit; court cards numbered Page=11, Knight=12, Queen=13, King=14.
- Each card carries 4–5 upright/reversed keywords, 2–4 sentence meanings, yes/no upright+reversed, first-person present-tense affirmation, and 1–3 intentionTags drawn strictly from the controlled 16-word vocabulary.
- Exported 5 helper functions: getCardById, getAllCards, getMajorArcana, getMinorArcana, getCardsByIntention. File is side-effect free (no fs, no "use client").
- Verified with bun: count=78, unique ids=78, suits=[major,wands,cups,swords,pentacles]. Per-suit counts: major 22, wands 14, cups 14, swords 14, pentacles 14. All major numbers 0–21 present, all minor suits 1–14 present. No out-of-vocabulary tags. All yes/no values valid. Helper functions return correct counts.
- Ran tsc --noEmit against the file: zero errors, strict-compatible.

Stage Summary:
- Produced /home/z/my-project/src/lib/tarot-data.ts (~1100 lines) — production-quality 78-card Rider-Waite-Smith dataset with authentic symbolism, astrology, numerology, meanings, affirmations, yes/no tendencies, unicode symbols, and intention tags.
- Verified counts: 22 Major Arcana + 56 Minor Arcana (14 × 4 suits) = 78 unique slugs.
- Notable choices: alchemical glyphs (🜂🜄🜁🜃) for minor suits for elegance and per-suit consistency; celestial/zodiac glyphs for major arcana symbols; yes/no logic tuned thoughtfully (Sun=Yes, Tower=No, Two of Swords=Maybe, Death upright=No/reversed=Maybe); reversed meaning direction generally weakens or flips upright tendency.
- Dataset is import-ready for both server and client components and powers the auto-frequency matching via intentionTags.

---
Task ID: 1
Agent: main
Task: Foundation + full app build (tasks 3-9) + self-verification

Work Log:
- Built Lumina design system in globals.css: black bg, glass surfaces (rgba(18,24,21,0.5) + 24px backdrop blur), gold #C5A87C / sage / leaf palette, gradient-border shell, aurora backdrop, gold text gradient, premium shimmer, safe-area + scrollbar utilities. Inter font (300/400/500/600).
- Prisma schema: Device (anonymous device-id identity, isPremium mock), Reading, Goal, Confirmation (unique per goal per day), FrequencySession, UsageLog (unique per device per day). Pushed to SQLite.
- PWA: public/manifest.webmanifest (standalone, portrait, shortcuts to Tarot/Manifest/Frequency), public/sw.js (precache shell + runtime image cache + offline fallback), public/offline.html, icons (192/512/1024/maskable/apple-touch) generated via AI image-gen + sharp, card-back.png generated.
- Layout: Inter font, full PWA metadata + viewport (cover, no-scale for app feel), apple-mobile-web-app tags, SW register component, Providers (QueryClient + next-themes forced dark).
- Core lib: device.ts (anonymous device upsert via x-device-id header), limits.ts (free=2 readings/1 goal/30s freq; premium=∞; 6 spreads incl. Celtic Cross), frequencies.ts (12 intention presets: abundance 888Hz, love 639, healing 528, intuition 852, transformation 741, protection 174, clarity 432, peace 396, creativity 417, spiritual-growth 963, confidence, release — each with carrierHz + binaural beat + brainwave type + affirmation + keyword detection), tarot.ts (Fisher-Yates shuffle, draw with 40% reverse chance, yes/no tally), ai-tarot.ts (z-ai-web-dev-sdk LLM with premium=deep / free=concise, graceful fallback).
- API routes: /api/me (GET device+usage, PATCH premium toggle), /api/tarot/read (POST draw+interpret, GET spreads), /api/tarot/history, /api/manifest/goals (GET/POST/PATCH/DELETE), /api/manifest/confirm (POST upsert per day + streak), /api/frequency/session (GET/POST).
- Card art: Wikimedia Commons rate-limited (429) in sandbox; built premium custom SVG card-face renderer (suit-colored frame, roman numeral, suit glyph, central symbol, name) with graceful /tarot/{slug}.jpg image load → SVG fallback. Card-back.png used face-down.
- UI: Lumina primitives (GlassCard, ShellCard, Pill, SectionTitle, GoldButton, GhostButton, Divider, StarField), BottomNav (5 tabs with animated active pill), app shell with aurora backdrop + sticky header.
- Views: Home (greeting by hour, quick actions, widget preview, install hint via beforeinstallprompt, notifications setup, daily card, premium CTA), Tarot (question + spread picker + shuffle animation + card-by-card reveal + AI interpretation + keywords + affirmation + history sheet), Manifestation (goal CRUD sheet with live auto-frequency detection, goal cards with streak/confirm, daily ritual info), Frequency (visualizer with pulse rings, mode selector pure/binaural/pad, 12 preset grid, affirmation, Web Audio engine hook), Premium (comparison table, perks grid, activate/management).
- Web Audio engine: OscillatorNode pure tone, binaural (stereo merger, L/R offset by beat/2), ambient pad (layered detuned sines + perfect fifth + LFO vibrato). Fade in/out envelope, master gain limiter, 1s tick timer, free=30s / premium=10min auto-stop.
- Notifications: useNotificationPermission hook (request + welcome notification + Badging API setAppBadge).
- Fixed: sw-register.tsx syntax error (operator precedence), removed unused eslint-disable directives, replaced db.$transaction array form (broke with async wrapper) with sequential calls.

Verification (agent-browser, iPhone 14 emulation):
- Home renders: greeting "The dusk softens", quick actions, widget preview, notifications, install hint, daily card, premium CTA. No console errors.
- Tarot: asked "Will I find fulfilling creative work this year?" → shuffle animation → drew King of Pentacles Reversed → AI returned "NO. The reversed King of Pentacles suggests your creative path is currently blocked by material concerns..." → keywords (greed/control/materialism/stagnation) + affirmation shown → usage decremented 2→0. Real LLM working.
- Manifestation: created "Financial freedom" goal → auto-detected "Financial Abundance · 888 Hz" → saved → goal card with 888Hz pill, statement, 09:00 reminder → clicked Confirm now → streak "1d", "1 confirmations", "Confirmed today".
- Frequency: selected 888Hz Financial Abundance → "Begin 30s session" → "NOW RESONATING" with 30s timer + Stop button → Web Audio engine started, no console errors.
- Premium: activated via Premium tab → page reloaded → home shows "Premium" badge + "Unlimited" for tarot.
- Responsive: tested 1200px desktop and 375px (iPhone SE width) — layout holds, bottom nav adapts.
- Lint: clean (0 errors, 0 warnings). Dev log: no runtime errors.

Stage Summary:
- Complete, working PWA. All 5 confirmed decisions implemented. Single `/` route, 5-tab mobile app.
- Free tier enforced: 2 tarot/day (Yes/No + Single only), 1 manifestation goal, 30s frequency. Premium unlocks everything.
- AI tarot interpretations via z-ai-web-dev-sdk LLM (real, contextual, graceful fallback).
- Auto-intention→frequency detection from question/goal text (12 presets, keyword weighted).
- PWA installable on Android + iOS (manifest, SW, icons, apple meta, shortcuts, offline fallback).
- In-app widget preview + Notifications + Badging API (native widget not possible on web — documented).
- Card art: custom SVG renderer (Wikimedia unreachable in sandbox); image-ready for future drop-in.
- Files: globals.css, layout.tsx, page.tsx, providers.tsx, sw-register.tsx, lib/{device,limits,frequencies,tarot,ai-tarot,store}.ts, tarot-data.ts, hooks/{use-api,use-notifications}.ts, components/lumina/{primitives,bottom-nav}.tsx, features/{home,manifest,tarot,frequency,premium}/*.tsx, app/api/{me,tarot/read,tarot/history,manifest/goals,manifest/confirm,frequency/session}/route.ts, public/{manifest.webmanifest,sw.js,offline.html,icons/*,tarot/card-back.png}.

Unresolved / next-phase recommendations:
- Download real public-domain RWS card art when network allows (component already supports it via /tarot/{slug}.jpg with SVG fallback).
- Add a real push-notification scheduling mini-service for goal reminder times (currently permission + welcome notification only; no scheduled reminders).
- Deepen premium readings (multi-paragraph) — verify with a premium-activated reading.
- Add streak analytics / weekly reflection view.
- Polish: haptic feedback on draw, sound design for card flip.
