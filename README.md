# StayAssist AI

StayAssist AI is a Next.js prototype for premium hotel and residence operations. It includes a polished login flow, guest PWA request cards, and dashboards for concierge queues, property visibility, AI knowledge readiness, billing, and operational settings.

## Getting Started

Install dependencies and run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Scripts

- `npm run dev` starts the local Next.js server.
- `npm run lint` runs ESLint.
- `npm run build` creates a production build.

## App Structure

- `app/login` contains the sign-in page and server action redirect.
- `app/dashboard` renders the main operations workspace.
- `app/dashboard/requests` renders the live guest requests engine.
- `app/dashboard/qr` renders QR code management for units.
- `app/g/[token]` renders the QR-assigned guest PWA.
- `app/guest` renders a fallback guest PWA demo.
- `components/login`, `components/guest`, and `components/dashboard` hold the reusable UI.
- `lib/guest-requests.ts` contains mock local request data and local storage helpers.
