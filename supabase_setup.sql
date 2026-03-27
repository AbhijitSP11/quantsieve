-- ============================================================
-- QuantSieve — Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Profiles (extends auth.users) ──────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  email        text,
  display_name text,
  avatar_url   text,
  investor_profile jsonb,           -- saved InvestorProfile JSON
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);


-- ── 2. Reports ────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references public.profiles(id) on delete cascade not null,
  ticker              text not null,
  company_name        text,
  sector              text,
  market_cap_category text,
  verdict             text,          -- BUY / BUY_WITH_CAUTION / WAIT / NOT_SUITABLE / AVOID
  verdict_color       text,          -- green / amber / red
  verdict_summary     text,
  quality_score       jsonb,         -- { earned, total, percentage, label }
  entry_context       text,
  thesis              text,
  investor_profile    jsonb,         -- snapshot of InvestorProfile at time of report
  report_data         jsonb not null, -- full EvaluateResponse JSON
  created_at          timestamptz default now()
);

alter table public.reports enable row level security;

create policy "reports_select" on public.reports
  for select using (auth.uid() = user_id);

create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = user_id);

create policy "reports_delete" on public.reports
  for delete using (auth.uid() = user_id);


-- ── 3. Auto-create profile row on Google sign-up ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
