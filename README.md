# Clearview

A self-hosted GA4 dashboard that doesn't suck.

You already have Google Analytics 4 installed. You don't need to switch providers. You just need a dashboard that shows your data clearly.

Clearview connects to your existing GA4 data via the Data API and renders 8 focused dashboard views. No database, no data storage — pure read-only dashboard using your Google account.

## Features

- **Overview** — Active users, key metrics, users by day chart, top pages and sources
- **Traffic** — Channels, sources, UTM campaigns with bar charts
- **Pages** — All pages with pageviews, users, time on page, and search
- **Engagement** — Engagement rate, events per session, top events
- **Conversions** — Conversion events, rates, conversions by source
- **Revenue** — Total revenue, transactions, revenue by source and landing page
- **Devices** — Device, browser, OS breakdown with donut charts
- **Geographic** — Users by country and city with search

Plus: dark mode, date range picker with presets, multi-property support, comparison periods, and skeleton loading states.

## Quick Start

### 1. Clone

```bash
git clone https://github.com/your-username/clearview.git
cd clearview
npm install
```

### 2. Set up GCP credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Analytics Data API** (`analyticsdata.googleapis.com`)
4. Enable the **Google Analytics Admin API** (`analyticsadmin.googleapis.com`)
5. Go to **APIs & Services > Credentials**
6. Click **Create Credentials > OAuth client ID**
7. Choose **Web application**
8. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (for Vercel)
9. Go to **APIs & Services > OAuth consent screen**
10. Add these scopes:
    - `https://www.googleapis.com/auth/analytics.readonly`
    - `https://www.googleapis.com/auth/analytics.manage.readonly`
11. Copy the **Client ID** and **Client Secret**

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_SECRET=  # Generate with: openssl rand -base64 32
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, select a GA4 property, and you're in.

## Deploy

### Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/clearview&env=GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,AUTH_SECRET)

Set the three environment variables in the Vercel dashboard. Update your GCP OAuth redirect URI to `https://your-app.vercel.app/api/auth/callback/google`.

### Docker

```bash
cp .env.example .env
# Edit .env with your credentials
docker compose up
```

### Self-hosted

Clearview is a standard Next.js app. Deploy it anywhere Node.js runs.

**HTTPS is required for production.** Without HTTPS, the `Secure` cookie flag is ineffective and tokens travel in plaintext. Use a reverse proxy (nginx, Caddy) to terminate TLS.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | OAuth client ID from GCP |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth client secret from GCP |
| `AUTH_SECRET` | Yes | Random secret for encrypting sessions. Generate with `openssl rand -base64 32` |

## Known Limits

- **Vercel free tier** has a 10-second serverless function timeout. Most GA4 API calls return in 1-3 seconds, but 90-day ranges on high-traffic properties with complex queries could get close. Each dashboard section loads independently, so one slow section won't block the rest.
- **GA4 API quotas**: Standard properties allow 200,000 tokens/day, 40,000 tokens/hour. A page load uses 3-6 API calls (~10 tokens each). Exponential backoff handles rate limits automatically.
- **No caching**: Data is fetched live from GA4 on every page load. This keeps things simple and ensures fresh data, but means every page load hits the API.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com)
- [Auth.js v5](https://authjs.dev) (Google OAuth)
- [Google Analytics Data API v1](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google Analytics Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

[MIT](LICENSE)
