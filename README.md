# Before I Buy 🧾

> Sleep on it before you spend it — and let a friend keep you honest.

An impulse-purchase tracker built around accountability, not just willpower. Add things you want to buy, see how many **hours of net take-home pay** they actually cost, sit through a cooling-off period — and share the list with a friend so they can see what you're tempted by and help talk you down (or off the ledge).

**Live demo:** [before-i-buy.vercel.app](https://before-i-buy.vercel.app)

## Features

- **Friends & accountability** — send/accept friend requests, then share a list with a friend so they can see what you're tempted by and help talk you out of it (or back into it) — read-only: their price/currency, not yours, no editing, no insights or personal stats leaked through
- **Multiple lists** — create, rename, and switch between named lists (e.g. one to share, one to keep private)
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
- Switch currency any time — existing item prices convert too, not just the symbol, using live exchange rates when available (falls back to a static table if offline)
- Dark / light mode (respects system preference, persists)
- Account required (email/password or Google) — choose a username on first sign-in; your items, lists, and settings sync across devices via Supabase
- Fully responsive — works on mobile

## Tech

- React 18 + Vite
- CSS Modules
- lucide-react (icons)
- Supabase (Auth + Postgres + Realtime) as the backend
- One Vercel serverless function (`/api/delete-account.js`) for account deletion, since that needs a service-role key that can't live in client code

## Run locally

Needs a Supabase project — see `.env.example` for the required variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). The `items`, `settings`, `lists`, `list_shares`, `profiles`, and `friend_requests` tables + RLS policies must exist first (ask in the project for the schema SQL if you're setting this up fresh — `supabase/migrations/` has partial RLS-policy documentation but is not a full schema pull).

```bash
npm install
npm run dev
```

## Deploy

Deployed via Vercel (auto-detects the Vite build + `/api` serverless function — no extra config needed). Set the same three env vars above in the Vercel project settings.

```bash
npm run build
```

## Settings

Click the gear icon to set your actual pay — hourly, monthly, or annual, net or gross — plus your currency. The default ($25 CAD/hr) is just a starting point; edit it to match your real take-home pay.

## Built by

Oleksandra Gurkalo
