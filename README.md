# JM Trading Journal

A personal crypto trading journal built with Electron + React + Supabase.

## Features
- Trade Log with auto R calculation
- Key Levels tracker with chart screenshots
- Active position journal
- Old positions review
- Tasks with recurring notifications
- Analytics dashboard

## Setup

### 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/jm-trading.git
cd jm-trading

### 2. Install dependencies
npm install

### 3. Set up Supabase
- Create a free account at https://supabase.com
- Create a new project
- Go to SQL Editor and run the schema below
- Copy your Project URL and publishable key

### 4. Create your .env file
cp .env.example .env
Then fill in your Supabase URL and key.

### 5. Run the app
npm run start

### 6. Build as a Mac app
npm run build

## Supabase Schema

Run this in your Supabase SQL Editor:

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

Also create a storage bucket called "charts" and set it to public.
