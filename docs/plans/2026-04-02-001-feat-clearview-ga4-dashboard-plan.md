---
title: "feat: Clearview — Self-Hosted GA4 Dashboard"
type: feat
status: active
date: 2026-04-02
---

# Clearview — Self-Hosted Open Source GA4 Dashboard

## Overview

A self-hosted Next.js app that connects to GA4 via the Data API and renders a clean, opinionated dashboard. Target user: site owners who have GA4 installed but hate the GA4 interface. Ships as a free, open source GitHub repo — clone, configure GCP credentials, run.

**Positioning:** "You already have GA4 installed. You don't need to switch providers. You just need a dashboard that doesn't suck."

## Problem Statement / Motivation

GA4's interface is universally disliked. The data is there — it's the UI that's the problem. Existing alternatives either require switching analytics providers entirely (Plausible, Umami, Fathom) or are paid SaaS products. There's a gap for a free, self-hosted dashboard that sits on top of GA4 data the user already has.

## Proposed Solution

A Next.js App Router application with 8 focused dashboard views, Google OAuth for auth (using the user's own GCP credentials), and live data fetching from the GA4 Data API. No database, no data storage — pure read-only dashboard. After sign-in, the user picks from their accessible GA4 properties — no hardcoded property ID.

## Technical Approach

### Auth Architecture

**OAuth user tokens with `BetaAnalyticsDataClient`** (not service accounts). The signed-in user's Google OAuth token is passed through to GA4 API calls via the `authClient` constructor option. This means:

- User signs in with Google → Auth.js v5 captures `access_token`, `refresh_token`, `expires_at` in JWT
- Google provider configured with `analytics.readonly` + `analytics.manage.readonly` scopes, `access_type: "offline"`, `prompt: "consent"` (required for refresh token)
- `jwt` callback stores tokens; checks `expires_at` on each request and refreshes via `https://oauth2.googleapis.com/token` if expired. **If refresh fails, clear session and redirect to sign-in** — never return a broken token.
- **Access token stays server-side only** — do NOT expose it in the `session` callback. Access it via `auth()` in Server Components and API routes only.
- GA4 client created per-request using `new BetaAnalyticsDataClient({ authClient: oauth2Client })` with the user's token

```ts
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google({
    authorization: {
      params: {
        scope: "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.manage.readonly",
        access_type: "offline",
        prompt: "consent"
      }
    }
  })],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      // Return token if still valid
      if (Date.now() < (token.expiresAt as number) * 1000) return token
      // Attempt refresh — on failure, clear tokens to force re-auth
      try {
        return await refreshAccessToken(token)
      } catch {
        return { ...token, accessToken: undefined, error: "RefreshTokenError" }
      }
    },
    session({ session, token }) {
      // Access token intentionally NOT exposed to client
      // Use auth() server-side to get the token for API calls
      if (token.error) session.error = token.error
      return session
    }
  }
})
```

### Multi-Property Support

After OAuth sign-in, use the GA4 Admin API (`analyticsadmin.googleapis.com`) to fetch the user's accessible GA4 properties. Present a property picker on first use; store the selected property ID in a cookie or URL param. No `GA4_PROPERTY_ID` env var — the user picks their property in the UI.

- Requires `analytics.manage.readonly` scope (already included above)
- Fetch via `AnalyticsAdminServiceClient.listAccountSummaries()`
- Property picker shown on first sign-in and accessible from sidebar header
- Selected property persisted in a cookie (`ga4_property_id`)

### GA4 API Layer (`/lib/ga4.ts`)

Single service file. All functions accept `dateRange`, `propertyId`, and `accessToken` params. Use `React.cache()` on all GA4 query functions to deduplicate identical calls within a single server render.

**Key design decisions:**
- **Comparison periods via native API support**: Pass two `DateRange` objects in a single `runReport` call — the API returns rows tagged by date range index. No need for separate requests. Halves comparison request count.
- **Quota handling**: GA4 standard properties allow 200K tokens/day, 40K tokens/hour, 10 concurrent requests. Fire requests in parallel (no artificial serialization). Implement exponential backoff on 429 errors. Set `returnPropertyQuota: true` to monitor remaining quota.
- **Singleton client pattern**: Share a single `BetaAnalyticsDataClient` instance per request cycle rather than re-instantiating.
- **Realtime API**: `runRealtimeReport` is a separate method with different available dimensions/metrics (subset of standard). Only used for the Overview page's active users card.

### Date Range

- **Presets**: Today, Last 7 Days, Last 30 Days, Last 90 Days, Custom Range
- **Default**: Last 30 Days
- **URL params**: `?from=2026-03-03&to=2026-04-02&preset=30d` — store both the dates and the preset. Malformed params fall back to Last 30 Days.
- **Comparison**: Automatic previous period (e.g., 30d selected → compare to prior 30d). Handled in a single API call via dual `DateRange`.
- **Bounds**: If comparison period has no data (new property), metric cards show the value with no change indicator rather than "0%" or "N/A".
- **Persistent across views**: Stored in URL search params. Date picker component reads/writes URL params.
- **Library**: Use `johnpolacek/date-range-picker-for-shadcn` — has comparison ranges, presets, built on shadcn primitives. (Fallback: inline with shadcn Calendar + Popover if dependency goes stale.)

### UI Stack

- **shadcn/ui**: `npx shadcn@latest init` with App Router. Components: Card, Sidebar, Tabs, Sheet (mobile nav), Select, Popover, Calendar.
- **Charts**: Use shadcn/ui's built-in Chart components (wraps Recharts with theme-aware styling) rather than using Recharts directly. All chart components marked `"use client"`.
- **Data tables**: Plain HTML `<table>` with simple client-side sorting (click column header to toggle asc/desc). No TanStack Table, no CSV export — keep it minimal. Pagination at 50 rows with simple prev/next controls.
- **Responsive tables**: Horizontal scroll on mobile with pinned first column for key identifier (page path, source, country).
- **Loading**: Skeleton loaders per component via shadcn Skeleton. Each section loads independently via individual Suspense boundaries around Server Components.
- **Dark mode**: shadcn's built-in theming with `next-themes`.

## Implementation Phases

### Phase 1: Foundation + Overview

Build the foundation and the Overview page together — day one ends with a real working dashboard, not a test harness.

**Foundation:**
- Initialize Next.js project (App Router, TypeScript, Tailwind)
- Install and configure shadcn/ui (`npx shadcn@latest init`)
- Set up Auth.js v5 with Google OAuth + required scopes
- Implement token refresh with error handling in `jwt` callback
- Implement property picker via Admin API (list properties → user selects → store in cookie)
- Create `.env.example` with required vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`
- Validate `NEXTAUTH_SECRET` is set and not a placeholder on startup
- Build GA4 service layer (`/lib/ga4.ts`) — core `runReport` wrapper with `React.cache()`, exponential backoff on 429, `returnPropertyQuota: true`
- Define shared types (`/lib/types.ts`)
- Sign-in page with branding (logo, one-liner, "Sign in with Google" button)

**Shell (built alongside Overview):**
- Dashboard shell layout: sidebar nav (8 views with icons) + top bar
- Sidebar: shadcn Sidebar component, collapsible to icon-only, active state, property name at top with picker
- Date range picker component with presets, URL param persistence, comparison period display

**Overview (`/`):**
- Metric card component (value, label, trend arrow with % change, color-coded up/down)
- Line chart component (users by day)
- 6 metric cards: Active Users (realtime via `runRealtimeReport`), Users, Sessions, Pageviews, Bounce Rate, Avg Session Duration
- Line chart: Users by day over selected date range
- Two small tables: Top 5 pages (by pageviews), Top 5 sources (by users)
- Skeleton loaders for each section
- Individual Suspense boundaries per section
- Error display component (API errors inline, auth expiry → redirect)

**GA4 functions:** `getRealtimeActiveUsers()`, `getOverviewMetrics()`, `getUsersByDay()`, `getTopPages()`, `getTopSources()`, `listProperties()`

**Files:**
```
app/layout.tsx
app/page.tsx
app/sign-in/page.tsx
app/api/auth/[...nextauth]/route.ts
auth.ts
lib/ga4.ts
lib/admin.ts               — property listing via Admin API
lib/types.ts
components/dashboard-shell.tsx
components/sidebar-nav.tsx
components/property-picker.tsx
components/date-range-picker.tsx
components/metric-card.tsx
components/charts/line-chart.tsx
components/skeleton-card.tsx
components/skeleton-chart.tsx
components/error-display.tsx
.env.example
```

### Phase 2: Traffic + Pages + Engagement

Build the data table component here — its first real consumer is the Traffic view.

**2a. Traffic (`/traffic`)**
- Sortable table component (plain HTML `<table>`, client-side sort, pagination) — built here as the first table consumer
- Tab/toggle: Channels | Sources | UTM Campaigns
- Table: Source/Medium, Channel Group, Users, Sessions, Bounce Rate, Avg Duration
- Bar chart component (built here as first consumer)
- Bar chart: Top 10 traffic sources by users
- GA4 functions: `getTrafficByChannel()`, `getTrafficBySource()`, `getTrafficByCampaign()`

**2b. Pages (`/pages`)**
- Table: Page Path, Page Title, Pageviews, Unique Users, Avg Time on Page
- Search/filter by path or title (client-side filter on fetched data)
- GA4 functions: `getPageMetrics()`

**2c. Engagement (`/engagement`)**
- 4 metric cards: Engagement Rate, Avg Engaged Time, Pages/Session, Events per Session
- Table: Top Events — Event Name, Event Count, Users
- Default filter excludes only: `page_view`, `session_start`, `first_visit`, `scroll`. Toggle to show/hide these.
- Bar chart: Top 10 events by count
- GA4 functions: `getEngagementMetrics()`, `getTopEvents()`

**Files:**
```
app/traffic/page.tsx
app/pages/page.tsx
app/engagement/page.tsx
components/sortable-table.tsx     — plain HTML table with sort + pagination, built here with Traffic as first consumer
components/charts/bar-chart.tsx  — built here with Traffic as first consumer
components/skeleton-table.tsx
```

### Phase 3: Conversions + Revenue + Devices + Geo

**3a. Conversions (`/conversions`)**
- Metric cards: Total Conversions, Conversion Rate
- Table: Conversion Event Name, Completions, Users, Conversion Rate
- Breakdown table: Conversions by Source/Medium
- Empty state: "No conversion events found. Mark events as conversions in your GA4 property to see data here."
- GA4 functions: `getConversionMetrics()`, `getConversionsBySource()`

**3b. Revenue (`/revenue`)**
- Metric cards: Total Revenue, Transactions, Revenue per User, Avg Order Value
- Table: Revenue by Source/Medium
- Table: Revenue by Page (landing pages driving revenue)
- Empty state: "No revenue data found. This view requires ecommerce tracking to be configured in GA4."
- GA4 functions: `getRevenueMetrics()`, `getRevenueBySource()`, `getRevenueByPage()`

**3c. Devices (`/devices`)**
- Donut chart component (built here as first consumer)
- 3 donut charts side by side: Device Category, Top Browsers, Top Operating Systems
- Table: Device, Browser, OS, Screen Resolution, Users, Sessions
- GA4 functions: `getDeviceBreakdown()`, `getBrowserBreakdown()`, `getOSBreakdown()`, `getFullDeviceTable()`

**3d. Geo (`/geo`)**
- Table: Country, City, Users, Sessions, Bounce Rate, Avg Duration
- Search by country/city (client-side filter)
- GA4 functions: `getGeoMetrics()`

**Files:**
```
app/conversions/page.tsx
app/revenue/page.tsx
app/devices/page.tsx
app/geo/page.tsx
components/charts/donut-chart.tsx  — built here with Devices as first consumer
```

### Phase 4: Polish & Launch Prep

- Dark mode toggle in top bar
- Responsive testing — sidebar collapse, table horizontal scroll, chart sizing
- Error handling audit: every API call has loading/error/empty states
- "Deploy to Vercel" button for one-click setup
- README:
  1. One-line description + screenshot
  2. Features list (8 views)
  3. Quick Start (4 steps: clone, GCP setup, env vars, run)
  4. GCP Setup Guide (detailed with screenshots: create project → enable GA4 Data API + Admin API → create OAuth credentials → configure consent screen with required scopes). Note both redirect URIs: `http://localhost:3000/api/auth/callback/google` for local, `https://your-app.vercel.app/api/auth/callback/google` for Vercel.
  5. Environment variables reference
  6. Deployment guide (Vercel free tier, self-hosted with reverse proxy for HTTPS)
  7. Known limits: Vercel free tier has a 10-second serverless function timeout. Most GA4 API calls return in 1-3 seconds, but 90-day ranges on high-traffic properties with complex queries could get close. Each dashboard section loads independently (separate requests), so one slow section won't block the rest.
  8. Tech stack
  9. Contributing guide
  10. MIT License
- `Dockerfile` + `docker-compose.yml` for one-command self-hosted deploy
- Open source prep: LICENSE file, `.github/CONTRIBUTING.md`, issue templates

## Technical Considerations

### GA4 API Quotas

| Limit | Value |
|-------|-------|
| Daily tokens | 200,000 |
| Hourly tokens | 40,000 |
| Concurrent requests | 10 |
| Typical query cost | ~10 tokens |

A single page load fires 3-6 API calls depending on the view. **Strategy**: fire requests in parallel (no artificial serialization for single-user self-hosted), implement exponential backoff on 429s, set `returnPropertyQuota: true` to surface remaining quota. No caching for v1 — if quota becomes a real problem, add in-memory TTL cache in a future version.

### Security (Open Source — Must Be Airtight)

**Token handling:**
- **Access token stays server-side only** — never exposed in `session` callback, never sent to client components, never logged. Access only via `auth()` in Server Components and API routes.
- OAuth tokens stored in Auth.js encrypted JWT (AES-256). Verify `NEXTAUTH_SECRET` is ≥32 bytes and encryption is not disabled.
- Refresh token stored in JWT — if cookie is stolen, attacker gets long-lived access. Mitigations: `Secure`, `HttpOnly`, `SameSite=Lax` cookie attributes enforced. HTTPS required.
- On failed token refresh, immediately clear all token fields from JWT and set `error: "RefreshTokenError"` — never return a stale/broken token that could be retried.

**Input validation:**
- Property ID from cookie validated server-side against user's accessible properties on every request (not just on selection). Prevents IDOR if someone tampers with the cookie.
- Date range params (`from`, `to`) validated as `YYYY-MM-DD` format, sane date range (start ≤ end, not in future, not before 2020). Reject malformed input — fall back to Last 30 Days.
- No user-generated content rendered as HTML anywhere. All GA4 data rendered as text content, never `dangerouslySetInnerHTML`.

**Auth enforcement:**
- Every Server Component and API route calls `auth()` and redirects to sign-in if no valid session. No unprotected routes except `/sign-in` and `/api/auth/*`.
- CSRF protection via Auth.js built-in state parameter on OAuth flow.
- Rate limit the OAuth callback route to prevent abuse.

**Deployment security:**
- App refuses to start if `NEXTAUTH_SECRET` is missing, empty, or matches known placeholder values (`"changeme"`, `"your-secret-here"`, etc.).
- `.env.example` includes `openssl rand -base64 32` command with explicit warning not to reuse secrets.
- README documents HTTPS as a hard requirement for production (not optional). Without HTTPS, `Secure` cookie flag is ineffective and tokens travel in plaintext.
- No secrets in client bundle — verify with `next build` that no server-only imports leak to client chunks.
- `Content-Security-Policy` header: restrict to `self` for scripts/styles, block inline scripts, no `eval`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` headers via `next.config.js`.

**Dependency hygiene:**
- Minimal dependency tree. No TanStack Table, no unnecessary packages. Every dependency is an attack surface.
- Lock file (`package-lock.json`) committed. Dependabot / Renovate configured for security updates.
- No GA4 data stored anywhere — purely pass-through. No database, no local files, no localStorage. Nothing to breach.

### Performance

- Server Components for data fetching (no client-side fetch waterfalls)
- Independent section loading via individual Suspense boundaries — fast sections render while slow ones show skeletons
- Use `Promise.all` for independent fetches within a page (not sequential awaits)
- Charts are `"use client"` with data passed as props from server
- `React.cache()` on all GA4 query functions to deduplicate identical calls within a single server render

## Acceptance Criteria

### Functional

- [ ] User can sign in with Google and pick from their accessible GA4 properties
- [ ] All 8 dashboard views render with correct data from GA4
- [ ] Date range picker works across all views with URL persistence
- [ ] Comparison period shows % change on metric cards
- [ ] Tables are sortable and paginated (50 rows)
- [ ] Empty states display for Conversions and Revenue when no data exists
- [ ] Token refresh works silently — failed refresh redirects to sign-in
- [ ] Dark mode works across all views
- [ ] Property picker accessible from sidebar, selection persisted

### Non-Functional

- [ ] Page loads feel fast — skeleton loaders, no full-page spinners
- [ ] Works on mobile (sidebar collapses, tables scroll horizontally)
- [ ] Setup takes <15 minutes for someone following the README
- [ ] Docker deploy works with `docker compose up`
- [ ] HTTPS deployment documented

### Security

- [ ] Access token never appears in client bundle, session callback, or browser devtools
- [ ] Property ID validated against user's accessible properties on every request
- [ ] Date range params validated and sanitized server-side
- [ ] No `dangerouslySetInnerHTML` anywhere
- [ ] `NEXTAUTH_SECRET` validation on startup (length, not placeholder)
- [ ] Security headers set: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- [ ] `next build` output verified — no server-only code in client chunks
- [ ] All routes except `/sign-in` and `/api/auth/*` require valid session
- [ ] Cookie attributes enforced: `Secure`, `HttpOnly`, `SameSite=Lax`

### Open Source

- [ ] README with GCP setup guide (including Admin API + required scopes)
- [ ] `.env.example` with all required vars documented + secret generation command
- [ ] MIT license
- [ ] Clean git history (no secrets, no junk commits)
- [ ] `package-lock.json` committed
- [ ] Dependabot or Renovate configured for security updates

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| GA4 API quota limits hit on heavy use | Backoff on 429, show quota warning. Add in-memory cache if needed post-launch. |
| GCP setup friction discourages users | Detailed README with screenshots covering both GA4 Data API and Admin API setup |
| Google OAuth token refresh failures | Graceful redirect to re-auth with clear message, never return broken token |
| `BetaAnalyticsDataClient` — "Beta" in the name | Stable since 2020, just Google's naming. GA4 Data API v1 is GA. |
| Recharts 3.0 breaking changes | Use shadcn Chart components (wrapper) to insulate from direct Recharts API |
| `date-range-picker-for-shadcn` maintenance | Thin wrapper on shadcn primitives — fork or inline if needed |
| Admin API adds setup complexity | One extra API to enable in GCP, but eliminates the `GA4_PROPERTY_ID` config step |

## Success Metrics

- GitHub stars as a proxy for interest (target: useful enough that GA4-haters share it)
- Setup completion rate — if people clone but can't get past GCP setup, the README failed
- Issue quality — are people requesting features (good) or reporting setup failures (bad)?

## Sources & References

### External

- [GA4 Data API Quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)
- [Auth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [NextAuth Google Provider](https://next-auth.js.org/providers/google)
- [BetaAnalyticsDataClient Docs](https://googleapis.dev/nodejs/analytics-data/latest/v1beta.BetaAnalyticsDataClient.html)
- [Date Range Picker for shadcn](https://github.com/johnpolacek/date-range-picker-for-shadcn)
- [Recharts 3.0 Migration Guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)
- [shadcn/ui Charts](https://ui.shadcn.com/docs/components/chart)

### Review Feedback Incorporated

- Architecture review: multi-property support, merge phases, drop request serialization, fix auth error handling
- Security review: keep access token server-side, NEXTAUTH_SECRET validation, HTTPS requirement
- Performance review: `React.cache()`, Suspense boundaries per section, `Promise.all` for parallel fetches
- DHH review: build components alongside their first consumer (not in isolation), reduced event exclusion list
