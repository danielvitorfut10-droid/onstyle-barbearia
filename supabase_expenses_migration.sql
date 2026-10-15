-- =====================================================
-- Migration: Create expenses table for Studio Blackout
-- Run this in your Supabase SQL Editor
-- =====================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  item_name text not null,
  amount_cents integer not null default 0,
  expense_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.expenses enable row level security;

-- Permissive policies for panel users
create policy "Allow read expenses" on public.expenses for select using (true);
create policy "Allow insert expenses" on public.expenses for insert with check (true);
create policy "Allow update expenses" on public.expenses for update using (true);
create policy "Allow delete expenses" on public.expenses for delete using (true);

-- Index for fast queries by barber + date
create index if not exists idx_expenses_barber_date on public.expenses(barber_id, expense_date);
