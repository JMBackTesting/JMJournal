# JM Journal — Crypto Trading Journal

A personal crypto trading journal built as a Mac desktop app. Built with Electron, React and Supabase.

## What it does

- **Trade Log** — log every trade with entry, stop, exit. Auto-calculates R
- **Key Levels** — track support/resistance levels by timeframe with chart screenshots
- **Journal** — log active positions with reasoning, bias and conditions
- **Old Positions** — review past trades and write up what you learned
- **Tasks** — recurring reminders that fire as Mac notifications
- **Analytics** — P&L curve, win rate by pair, monthly breakdown

---

## How to set it up

### Step 1 — Install the tools

You need Node.js and Git. Install both:

- Node.js: https://nodejs.org (download the LTS version)
- Git: https://git-scm.com/download/mac

### Step 2 — Clone the repo

Open Terminal and run these one at a time:

    git clone https://github.com/JMBackTesting/JMJournal.git
    cd JMJournal
    npm install

### Step 3 — Set up Supabase (your free database)

1. Go to https://supabase.com and create a free account
2. Click New project, give it a name, pick a region close to you
3. Once it loads, go to SQL Editor then New query
4. Copy and paste the SQL from the bottom of this README and click Run
5. Go to Storage and create a new bucket called charts, set it to Public
6. Go to Settings, then General, and copy your Project URL
7. Go to Settings, then API Keys, and copy your Publishable key

### Step 4 — Add your Supabase keys

In the JMJournal folder, create a file called .env and add these two lines:

    VITE_SUPABASE_URL=your_project_url_here
    VITE_SUPABASE_KEY=your_publishable_key_here

Replace the values with what you copied from Supabase.

### Step 5 — Run the app

    npm run start

The app will open as a desktop window.

### Step 6 — Build as a real Mac app (optional)

    npm run build

Open the release folder and double click the .dmg file. Drag to Applications.

---

## Database setup

Go to Supabase, open SQL Editor, click New query, paste all of this in and click Run:

    create table trades (
      id uuid default gen_random_uuid() primary key,
      created_at timestamp with time zone default now(),
      pair text not null,
      side text not null,
      entry_price numeric,
      exit_price numeric,
      size numeric,
      pnl_r numeric,
      notes text,
      date date
    );

    create table key_levels (
      id uuid default gen_random_uuid() primary key,
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now(),
      pair text not null,
      price numeric not null,
      type text not null,
      notes text,
      chart_url text,
      date date
    );

    create table tasks (
      id uuid default gen_random_uuid() primary key,
      created_at timestamp with time zone default now(),
      text text not null,
      scheduled_time text,
      done boolean default false,
      urgent boolean default false,
      date date default current_date,
      tags text[],
      last_completed_date date,
      is_recurring boolean default false
    );

    create table journal_entries (
      id uuid default gen_random_uuid() primary key,
      created_at timestamp with time zone default now(),
      date date default current_date,
      title text,
      content text,
      mood text,
      tags text[]
    );

    alter table key_levels add column if not exists date date;
    alter table tasks add column if not exists tags text[];
    alter table tasks add column if not exists last_completed_date date;
    alter table tasks add column if not exists is_recurring boolean default false;
