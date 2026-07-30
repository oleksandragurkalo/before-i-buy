# Before I Buy 🧾

> Sleep on it before you spend it.

A minimal anti-impulse-purchase tracker. Add things you want to buy, see how many **hours of net take-home pay** they actually cost, and decide later with a clear head.

**Live demo:** [before-i-buy.vercel.app](https://before-i-buy.vercel.app) ← update after deploy

## Features

- Add items with name, price, and category
- Calculates **net hours of work** per item (default: $27 CAD/hr after ~30% tax)
- Day counter from when you added it
- Decide: "I don't need it" or "I bought it anyway"
- History tab with running totals — resisted vs spent
- Dark / light mode (respects system preference, persists)
- All data in **localStorage** — no account, no server, no tracking
- Fully responsive — works on mobile

## Tech

- React 18 + Vite
- CSS Modules
- lucide-react (icons)
- Zero backend

## Run locally

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
# drag dist/ to Vercel, Netlify, or any static host
```

## Settings

Click the gear icon to set your actual net hourly rate and currency. The default ($27 CAD) is based on ~$38/hr gross minus ~30% effective tax rate — a typical entry-to-mid frontend developer rate in Canada.

## Built by

Sandra Gurkalo — [sandradev.ca](https://sandradev.ca)
