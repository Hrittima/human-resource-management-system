-- ============================================================
-- HRMS Auth schema for Supabase
-- Run this in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- 1. Table that tracks the running serial number per joining year
create table if not exists public.year_serials (
  year int primary key,
  last_serial int not null default 0
);

-- 2. Function to atomically get the next serial number for a year
create or replace function public.get_next_serial(p_year int)
returns int
language plpgsql
security definer
as $$
declare
  v_serial int;
begin
  insert into public.year_serials (year, last_serial)
  values (p_year, 1)
  on conflict (year)
  do update set last_serial = public.year_serials.last_serial + 1
  returning last_serial into v_serial;

  return v_serial;
end;
$$;

grant execute on function public.get_next_serial(int) to anon, authenticated;

-- 3. Profiles table (one row per employee/HR user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_id text unique not null,
  company_name text not null,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  logo_url text,
  joining_year int not null,
  serial_number int not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can insert their own profile right after signup
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. RPC used by the LOGIN page: given a generated employee_id,
--    look up the underlying auth email so we can call
--    supabase.auth.signInWithPassword({ email, password }).
--    security definer lets an anonymous (logged-out) visitor call it,
--    but it only ever returns the email column, nothing else.
create or replace function public.get_email_by_employee_id(p_employee_id text)
returns text
language sql
security definer
as $$
  select email from public.profiles where employee_id = p_employee_id limit 1;
$$;

grant execute on function public.get_email_by_employee_id(text) to anon, authenticated;

-- 5. Storage bucket for company logos uploaded during signup
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- Anyone can view logos (bucket is public)
create policy "Public read access to company logos"
  on storage.objects for select
  using (bucket_id = 'company-logos');

-- Allow uploads during signup. NOTE: for hackathon speed this allows
-- anon uploads to this bucket only. Tighten this after the hackathon
-- (e.g. require auth, or move the upload to occur after sign-in).
create policy "Anyone can upload a company logo"
  on storage.objects for insert
  with check (bucket_id = 'company-logos');
