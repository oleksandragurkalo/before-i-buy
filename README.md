# Before I Buy 🧾

> Sleep on it before you spend it.

A minimal anti-impulse-purchase tracker. Add things you want to buy, see how many **hours of net take-home pay** they actually cost, and decide later with a clear head.

**Live demo:** [before-i-buy.vercel.app](https://before-i-buy.vercel.app)

## Features

- Add items with name, price, category, and an optional note
- Calculates **net hours of work** per item, based on your pay — set as hourly, monthly, or annual, net or gross, in CAD/USD/EUR/PLN/UAH
- Track progress toward a purchase with an optional "already saved" amount
- Day counter on each waiting item
- Decide: resisted it, bought it anyway, or remove it
- Waiting list with grid or row view, plus sort/filter/group by category
- History as a sortable, filterable table — with summary stats and a resistance-rate meter
- Insights panel — resistance rate, spending by category, biggest temptations
- Export/import your data as JSON (it's all local — this is your only backup)
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

Click the gear icon to set your actual pay — hourly, monthly, or annual, net or gross — plus your currency. The default ($25 CAD/hr) is just a starting point; edit it to match your real take-home pay.

## Built by

Sandra Gurkalo — [sandradev.ca](https://sandradev.ca)
