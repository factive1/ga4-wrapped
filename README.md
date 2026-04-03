# GA4 Wrapped

A clean, open-source dashboard for Google Analytics 4. All your data, none of the pain.

You already have GA4 installed. You just need a dashboard that doesn't suck.

## What You Get

- **Overview** — sessions, users, pageviews, bounce rate at a glance
- **Traffic** — sources, mediums, campaigns broken down
- **Pages** — top pages by views, time on page, entrances
- **Engagement** — session duration, events, engaged sessions
- **Conversions** — goal completions and conversion rates
- **Revenue** — transaction revenue, purchase metrics
- **Devices** — browser, OS, screen resolution breakdown
- **Geo** — country and city-level traffic

All data is fetched live from the GA4 Data API. No database. No data warehouse. No third-party analytics platform.

## How It Works

1. You sign in with your Google account via OAuth
2. The app uses the GA4 Admin API to list the properties your account has access to
3. You pick a property and a date range
4. Each dashboard view fires parallel requests to the GA4 Data API using your OAuth token
5. Results render server-side with Next.js — your access token never touches the browser

There's no database, no background sync, no stored data. Every page load fetches fresh numbers straight from Google's API. The app is just a better UI for data you already own.

## Prerequisites

- Node.js 18+
- A Google Cloud Platform project with OAuth 2.0 credentials
- A GA4 property you have access to

## Setting Up Google Cloud Credentials

**You must create your own GCP OAuth credentials.** This app does not ship with any Google credentials — you bring your own.

### Step-by-step

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the following APIs:
   - **Google Analytics Data API** (this is the GA4 reporting API)
   - **Google Analytics Admin API** (used to list your properties)
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth client ID**
6. Choose **Web application** as the application type
7. Add authorized redirect URIs:
   - For local dev: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
8. Copy the **Client ID** and **Client Secret**

### Configure the OAuth consent screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** (unless you're on Google Workspace and want internal-only)
3. Fill in the required fields (app name, support email)
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/analytics.readonly`
   - `https://www.googleapis.com/auth/analytics.manage.readonly`
5. Add your Google account as a test user (required while in "Testing" status)

> **Note:** While your app is in "Testing" status, only test users you explicitly add can sign in. You don't need to go through Google's verification process for personal or internal use.

## Installation

```bash
git clone https://github.com/factive1/ga4-wrapped.git
cd ga4-wrapped
npm install
```

## Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

```env
GOOGLE_CLIENT_ID=your-client-id-from-step-8.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-from-step-8
AUTH_SECRET=generate-with-openssl-rand-base64-32
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the Google account that has access to your GA4 properties. Pick a property and you're in.

## Production

The app builds as a standalone Next.js server:

```bash
npm run build
```

Deploy with Docker, a VPS, or any platform that runs Node.js. Set the same environment variables in your production environment.

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- [Auth.js](https://authjs.dev/) v5 (Google OAuth)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1) (GA4)
- [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) (via shadcn/ui chart components)

## Security

- OAuth access tokens never leave the server
- Security headers (CSP, HSTS, X-Frame-Options) on all responses
- Input validation on all API parameters
- No database — nothing to breach

## License

[MIT](LICENSE)
