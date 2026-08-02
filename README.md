# Before I Buy 🧾

> Sleep on it before you spend it.

A minimal anti-impulse-purchase tracker. Add things you want to buy, see how many **hours of net take-home pay** they actually cost, and decide later with a clear head.

**Live demo:** [before-i-buy.vercel.app](https://before-i-buy.vercel.app)

## Features

- Add items with name, price, category, and an optional note
- Calculates **net hours of work** per item, based on your pay — set as hourly, monthly, or annual, net or gross, in CAD/USD/EUR/PLN/UAH
- Track progress toward a purchase with an optional "already saved" amount
- **Cooling-off period per item** — pick "No wait", 3, 7, 14, or 30 days; a countdown badge shows days left, then flips to "ready to decide"
- A badge on the "Waiting List" nav pill counts how many items are ready to decide right now
- Decide: resisted it, bought it anyway, or remove it — removing shows an **Undo** toast instead of a confirm dialog
- Changed your mind on a past decision? Move an item from History back to "still deciding"
- Waiting list with grid or row view (locked to rows on mobile/tablet), plus sort/filter/group by category
- History as a sortable, filterable table — with summary stats and a resistance-rate meter
- Insights panel — resistance rate, current streak, spending by category, biggest temptations
- Switch currency any time — existing item prices convert too, not just the symbol
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

Oleksandra Gurkalo
