# Contributing to Clearview

Thanks for your interest in contributing!

## Getting Started

1. Fork the repo
2. Clone your fork
3. Follow the [Quick Start](#quick-start) in the README
4. Create a branch for your change
5. Make your changes
6. Run `npm run build` to verify
7. Submit a pull request

## Guidelines

- Keep dependencies minimal. Every dependency is an attack surface.
- No `dangerouslySetInnerHTML`. All GA4 data rendered as text content.
- Access tokens stay server-side only. Never expose in client components.
- Use plain HTML `<table>` for data tables. No TanStack Table.
- Follow existing patterns in the codebase.

## Reporting Issues

- Include your Node.js version, browser, and OS
- Include steps to reproduce
- Include error messages or screenshots if applicable

## Security Issues

If you discover a security vulnerability, please open an issue. This is a self-hosted tool — there is no production deployment to compromise.
