-- KisanSetu Supabase schema
create extension if not exists pgcrypto;

create table if not exists centres (
  centre_id text primary key,
  employee_id text unique,
  name text not null,
  district text not null,
  city text not null,
  address text not null,
  lat double precision not null,
  lon double precision not null,
  counters integer not null default 2 check (counters > 0)
);

create table if not exists farmers (
  farmer_id text primary key,
  mobile text unique not null,
  email text,
  name text not null,
  village text not null,
  district text not null,
  crop text not null default 'Wheat',
  centre_id text references centres(centre_id),
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  booking_id uuid primary key default gen_random_uuid(),
  farmer_id text not null references farmers(farmer_id),
  centre_id text not null references centres(centre_id),
  crop text not null,
  quantity_kg numeric(12,2) not null check (quantity_kg > 0),
  date date not null,
  slot text not null,
  token text not null,
  status text not null default 'waiting',
  checked_in boolean not null default false,
  called_at timestamptz,
  procurement_started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  skip_reason text,
  deferred_at timestamptz,
  defer_reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bookings_queue on bookings(centre_id, date, status, created_at);
create index if not exists idx_bookings_farmer on bookings(farmer_id, date);
create unique index if not exists uq_active_farmer_date on bookings(farmer_id, date) where status in ('waiting','serving','procurement_pending');
create unique index if not exists uq_centre_token on bookings(centre_id, token);

create table if not exists token_counters (
  centre_id text primary key references centres(centre_id),
  last_token integer not null default 0
);

create or replace function next_mandi_token(p_centre_id text)
returns text
language plpgsql
as $$
declare n integer;
begin
  insert into token_counters(centre_id, last_token) values (p_centre_id, 0)
  on conflict (centre_id) do nothing;
  update token_counters set last_token = last_token + 1
  where centre_id = p_centre_id
  returning last_token into n;
  return 'T-' || lpad(n::text, 3, '0');
end;
$$;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  farmer_id text not null references farmers(farmer_id),
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);
create index if not exists idx_notifications_farmer on notifications(farmer_id, created_at desc);

create table if not exists procurements (
  procurement_id uuid primary key default gen_random_uuid(),
  farmer_id text not null references farmers(farmer_id),
  centre_id text not null references centres(centre_id),
  crop text not null,
  quantity_kg numeric(12,2) not null,
  quality_grade text not null default 'FAQ',
  rate_per_kg numeric(12,2) not null,
  amount numeric(14,2) not null,
  token text not null,
  created_at timestamptz not null default now(),
  employee_id text,
  completed_at timestamptz
);

create table if not exists payments (
  payment_id text primary key,
  farmer_id text not null references farmers(farmer_id),
  token text not null,
  status text not null default 'processing',
  amount numeric(14,2),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_payments_farmer on payments(farmer_id, created_at desc);

-- Backend uses the service-role key, so it bypasses RLS.
-- Enable RLS if you later expose Supabase directly to the browser.
alter table centres enable row level security;
alter table farmers enable row level security;
alter table bookings enable row level security;
alter table notifications enable row level security;
alter table procurements enable row level security;
alter table payments enable row level security;


-- Existing installations: run these migration statements once.
alter table public.centres add column if not exists employee_id text;
create unique index if not exists uq_centres_employee_id on public.centres(employee_id) where employee_id is not null;
notify pgrst, 'reload schema';
