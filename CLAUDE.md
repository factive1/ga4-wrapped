# Clearview - Open Source GA4 Dashboard

A self-hosted Next.js app that connects to GA4 via the Data API and renders a clean, opinionated dashboard. "You already have GA4 installed. You just need a dashboard that doesn't suck."

## Tech Stack

- **Framework:** Next.js (App Router)
- **UI:** shadcn/ui + Tailwind
- **Auth:** Auth.js v5 with Google OAuth
- **Analytics API:** `@google-analytics/data` (GA4 Data API v1) + Admin API for property listing
- **Charts:** shadcn/ui Chart components (wraps Recharts)
- **Tables:** Plain HTML `<table>` with simple client-side sorting — no TanStack Table, no CSV export
- **No database** - all data fetched live from GA4 API

## Key Architectural Decisions

- **OAuth user tokens** (not service accounts) — user's Google token passed to `BetaAnalyticsDataClient` via `authClient`
- **Access token stays server-side only** — never exposed in session callback or client components
- **Multi-property support** — no `GA4_PROPERTY_ID` env var. User picks from their accessible properties via Admin API after sign-in.
- **No caching for v1** — fire requests in parallel, exponential backoff on 429
- **`React.cache()`** on all GA4 query functions to deduplicate within a render
- **Suspense boundaries per section** — independent loading, no full-page spinners
- **Components built alongside their first consumer** — not in isolation
- **Minimal dependencies** — every dependency is an attack surface. No TanStack Table, no CSV export. Plain HTML tables.
- **Security is non-negotiable** — access token server-side only, input validation on all params, security headers, CSP, no `dangerouslySetInnerHTML`

## Next.js 16 Conventions

- **Proxy instead of Middleware**: Use `proxy.ts` (not `middleware.ts`) with `export function proxy()`
- **Async request APIs**: All `cookies()`, `headers()`, `params`, `searchParams` must be `await`ed
- **Type generation**: Run `npx next typegen` for type-safe `PageProps`, `LayoutProps`, `RouteContext`

## Plan

See [docs/plans/2026-04-02-001-feat-clearview-ga4-dashboard-plan.md](docs/plans/2026-04-02-001-feat-clearview-ga4-dashboard-plan.md) for the full implementation plan.

### Phases

1. **Foundation + Overview** — Auth, property picker, GA4 service layer, shell, Overview page
2. **Traffic + Pages + Engagement** — Data table component, bar chart, 3 views
3. **Conversions + Revenue + Devices + Geo** — Donut chart, remaining 4 views
4. **Polish & Launch** — Dark mode, responsive, README, Docker, open source prep
