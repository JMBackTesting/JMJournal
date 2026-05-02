# JMJournal

Personal crypto trading journal built with Electron + React + Vite + Supabase.

## Stack

- Electron (desktop app, Windows + Mac)
- React + Vite
- Supabase (database + storage)

## Pages

- **Dashboard** — win rate, net R, avg R (all time + last 30 days), session countdowns, key levels snapshot, recent trades
- **Trade Log** — log trades with entry/exit price, date, time, stop, R, $ P&L, emotion, setup, mistake, partials
- **Journal** — active positions with status (Active Bids / In Trade / Watching POI / Rough Drawing), chart screenshots, trade reasoning
- **Key Levels** — Daily / Weekly / Monthly / Comparison tabs with pair filter
- **Spot Buys** — spot position tracker
- **Old Positions** — closed journal entries with weekly review notes
- **Analytics** — 7 tabs: Overview, Calendar, Streaks, Days, Time, Drawdown, Tags
- **Trading Notes** — quick notes by category: Emotion, Setup Observation, Market Note, Lesson, Mistake, General
- **Education** — articles and authors library
- **Export Data** — CSV export of all tables
- **Settings** — account size

## Setup

Clone the repo, then create a `.env` file in the root with your Supabase credentials:

    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

Install dependencies:

    npm install

Run in development:

    npm run start

Build for Windows:

    npm run build

## Security Notes

- `.env` is gitignored — never commit your Supabase keys
- Chart screenshots stored in Supabase `charts` storage bucket
- All tables use RLS with open policies (single user app)