# JM Journal — Crypto Trading Journal

A personal crypto trading journal built as a desktop app. Built with Electron, React and Supabase.

---

## What's inside

**Dashboard**
- Win rate, Risk:Reward, Profit Factor, Key Levels count, Tasks today
- Daily and max drawdown progress bars with breach warnings
- Goal progress bars (daily, weekly, monthly, yearly) in $
- Recent trades with R and $ P&L

**Trade Log**
- Log trades with entry, stop, exit — auto-calculates R
- Dollar P&L field alongside R
- Emotion, Setup and Mistake tags per trade
- Partial exits — log multiple exits and auto-recalculate weighted R
- Edit any existing trade (prices, R, $, tags, notes)
- Delete trades

**Journal**
- Log active positions with entry, stop, size, leverage, reasoning, trend, conditions
- Comparison chart rank per timeframe
- Chart screenshot upload (browse or paste)
- Mark as Closed / Reopen closed positions
- Delete positions

**Key Levels**
- Daily, Weekly, Monthly tabs — each with their own structured fields
- Daily: POI, D1 Support, D1 Resistance, Notes, Change since last post, Actionable toggle
- Weekly: Bias, POI, Prev WO, W1 Support, W1 Resistance, Notes, Change since last post
- Monthly: Bias, POI, Prev MO, M1 Support, M1 Resistance, Notes, Change since last post
- Comparison W1 and Comparison M1 tabs — free text and screenshot
- Chart screenshot per level

**Spot Buys**
- Log spot buy positions separately from leveraged trades

**Tasks**
- Daily recurring or one-off tasks with scheduled times
- Mac and Windows desktop notifications at scheduled times
- Mark done, urgent flag, tags

**Old Positions**
- Review any past trade or journal entry
- Add review text and chart screenshot
- Remove review without deleting the original entry

**Analytics**
- Overview: Win rate, Net P&L, Expectancy, Profit Factor, P&L Curve, By Pair, By Month, Avg Win/Loss, Best/Worst trade
- Calendar: Monthly P&L heatmap — colour coded by day
- Tags: Breakdown by Emotion, Setup and Mistake

**Education**
- Organise articles by person/author
- Per article: title, URL, date, tags, paste full content, multiple image uploads
- Expandable article view

**Export Data**
- Export every table to CSV — trades, journal entries, key levels, tasks, education authors and articles
- Export individually or all at once
- Opens in Google Sheets or Excel

**Settings**
- Account size for drawdown % calculations
- Daily and max drawdown limits with dashboard warnings
- Daily, weekly, monthly and yearly $ profit goals

---

## How to set it up

### Step 1 — Install the tools

You need Node.js and Git:

- Node.js: https://nodejs.org (download the LTS version)
- Git: https://git-scm.com/download/mac

### Step 2 — Clone the repo

Open Terminal and run these one at a time:

```bash
git clone https://github.com/JMBackTesting/JMJournal.git
cd JMJournal
npm install
```

### Step 3 — Set up Supabase

1. Go to https://supabase.com and create a free account
2. Click **New project**, give it a name, pick a region close to you
3. Once it loads, go to **SQL Editor** → **New query**
4. Copy and paste the SQL from the bottom of this README and click **Run**
5. Go to **Storage** and create a new bucket called `charts`, set it to **Public**
6. Go to **Settings** → **General** and copy your **Project URL**
7. Go to **Settings** → **API Keys** and copy your **Publishable key**

### Step 4 — Add your Supabase keys

In the JMJournal folder, create a file called `.env` and add: