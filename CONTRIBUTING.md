# Contributing to GA4 Wrapped

Thanks for your interest in contributing.

## Dev Environment Setup

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your Google OAuth credentials (see [README](README.md#setting-up-google-cloud-credentials))
4. Run the dev server: `npm run dev`
5. Open `http://localhost:3000`

You'll need your own GCP project with OAuth credentials and a GA4 property to test against.

## Submitting a PR

1. Create a branch off `main`
2. Make your changes
3. Run `npm run lint` and `npm run test` before pushing
4. Open a PR against `main` with a clear description of what changed and why

Keep PRs focused. One feature or fix per PR.

## Code Style

- TypeScript throughout
- Follow existing patterns in the codebase
- No new dependencies without a good reason — every dependency is an attack surface
- Plain HTML `<table>` elements for tables (no TanStack Table)
- Server-side data fetching — access tokens never touch the client

## Reviews

I review PRs on my own timeline. If it's been a while and you haven't heard back, it's not personal — I'll get to it.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
