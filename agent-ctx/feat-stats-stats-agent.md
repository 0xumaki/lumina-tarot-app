# feat-stats — stats-agent

## Task
Build stats/analytics API + view for the Lumina PWA.

## Files created
- `src/app/api/stats/route.ts` — GET /api/stats analytics endpoint (runtime=nodejs, force-dynamic)
- `src/features/stats/stats-view.tsx` — "use client" StatsView component (default export)

## API contract (`GET /api/stats`)
Requires `x-device-id` header. Returns:
```json
{
  "memberSince": "ISO date",
  "readings": { "total", "thisWeek", "mostUsedSpread", "mostUsedSpreadKey" },
  "goals": { "total", "active", "achieved", "totalConfirmations", "bestStreak", "bestStreakGoalTitle", "confirmationsThisWeek": [7 numbers] },
  "frequency": { "totalSessions", "totalSeconds", "totalMinutes", "mostUsedIntention", "mostUsedIntentionKey", "mostUsedIntentionHz", "minutesThisWeek": [7 numbers] },
  "activity": [{ "date": "YYYY-MM-DD", "readings", "confirmations", "frequencySec" } × 7]
}
```

## View component
`StatsView` (default export) — drop-in for the main agent to wire into the bottom nav.
- TanStack Query: `useQuery({ queryKey: ["stats"], refetchInterval: 30000 })`
- Layout: header (member-since) → 2×2 count-up tiles → SVG 7-day bar chart → Tarot/Manifestation/Frequency breakdown cards
- Loading skeleton + error shell included
- Design tokens: GOLD #C5A87C, LEAF #B5CD7E, SAGE #7A8680, glass surfaces, tabular-nums, framer-motion staggered entrance

## Wiring notes for main agent
The StatsView is NOT imported anywhere yet. To wire it in:
1. Import `StatsView` from `@/features/stats/stats-view` in `src/app/page.tsx`
2. Add a `"stats"` (or similar) entry to `TabKey` in `src/lib/store.ts`
3. Add a nav button to `src/components/lumina/bottom-nav.tsx`
4. Render `<StatsView />` when the tab is active

## Verification
- `bun run lint` clean (0 errors, 0 warnings)
- curl GET /api/stats with test device-id → 200, correct JSON shape
- Dev log: route compiled + ran 4 Prisma queries successfully
