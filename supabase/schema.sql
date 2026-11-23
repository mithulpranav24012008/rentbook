-- RentBook database schema.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- Every table has a user_id that defaults to the signed-in user, and Row Level
-- Security policies so each user can only see and change their own rows.

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  building_id uuid not null references public.buildings (id) on delete cascade,
  label text not null,            -- e.g. "Flat 2B", "Ground floor"
  unit_type text,                 -- e.g. "2 BHK", "Shop", "Room"
  floor text,
  rent_amount numeric(12, 2),
  deposit numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  name text not null,
  phone text,
  email text,
  id_proof_type text,
  id_proof_number text,
  move_in_date date,
  rent_amount numeric(12, 2) not null default 0,
  deposit numeric(12, 2),
  rent_due_day int check (rent_due_day between 1 and 31),
  emergency_contact text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  month date not null,            -- first day of the rent month, e.g. 2026-11-01
  amount numeric(12, 2) not null,
  paid_on date not null default current_date,
  method text,                    -- Cash, UPI, Bank transfer, Cheque
  note text,
  created_at timestamptz not null default now(),
  unique (tenant_id, month)
);

create index if not exists buildings_user_idx on public.buildings (user_id);
create index if not exists units_user_idx on public.units (user_id);
create index if not exists units_building_idx on public.units (building_id);
create index if not exists tenants_user_idx on public.tenants (user_id);
create index if not exists tenants_unit_idx on public.tenants (unit_id);
create index if not exists payments_user_month_idx on public.payments (user_id, month);

alter table public.buildings enable row level security;
alter table public.units enable row level security;
alter table public.tenants enable row level security;
alter table public.payments enable row level security;

-- Buildings: own rows only.
drop policy if exists "own buildings" on public.buildings;
create policy "own buildings" on public.buildings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Units: own rows only, and only inside a building you own.
drop policy if exists "own units" on public.units;
create policy "own units" on public.units
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.buildings b where b.id = building_id and b.user_id = (select auth.uid()))
  );

-- Tenants: own rows only, and only linked to a unit you own.
drop policy if exists "own tenants" on public.tenants;
create policy "own tenants" on public.tenants
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (unit_id is null or exists (select 1 from public.units u where u.id = unit_id and u.user_id = (select auth.uid())))
  );

-- Payments: own rows only, and only for a tenant you own.
drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tenants t where t.id = tenant_id and t.user_id = (select auth.uid()))
  );
