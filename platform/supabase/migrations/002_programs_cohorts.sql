-- Migration: Programs, Cohorts, Registrations, Weekly Updates
-- Adds program/cohort management to the learn platform

-- ============================================================
-- TABLES
-- ============================================================

create table programs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  duration_weeks integer not null,
  capacity_per_cohort integer not null default 30,
  schedule jsonb not null default '{}',
  registration_fields jsonb not null default '[]',
  update_fields jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cohorts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  slug text unique not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  application_open date not null,
  application_close date not null,
  capacity integer not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'open', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);

create table cohort_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cohort_id uuid not null references cohorts(id) on delete cascade,
  pod text,
  registration_data jsonb not null default '{}',
  status text not null default 'registered'
    check (status in ('registered', 'active', 'completed', 'withdrawn')),
  registered_at timestamptz not null default now(),
  unique (user_id, cohort_id)
);

create table weekly_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cohort_id uuid not null references cohorts(id) on delete cascade,
  week_number integer not null check (week_number >= 0),
  data jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cohort_id, week_number)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_cohorts_program_id on cohorts(program_id);
create index idx_cohorts_status on cohorts(status);
create index idx_cohort_registrations_user_id on cohort_registrations(user_id);
create index idx_cohort_registrations_cohort_id on cohort_registrations(cohort_id);
create index idx_cohort_registrations_status on cohort_registrations(status);
create index idx_weekly_updates_user_id on weekly_updates(user_id);
create index idx_weekly_updates_cohort_id on weekly_updates(cohort_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table programs enable row level security;
alter table cohorts enable row level security;
alter table cohort_registrations enable row level security;
alter table weekly_updates enable row level security;

-- Programs: anyone can view active programs
create policy "Anyone can view active programs"
  on programs for select
  using (is_active = true);

create policy "Admins can manage programs"
  on programs for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Cohorts: anyone can view
create policy "Anyone can view cohorts"
  on cohorts for select
  using (true);

create policy "Admins can manage cohorts"
  on cohorts for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Registrations: users see/manage own; admins see all
create policy "Users can view own registrations"
  on cohort_registrations for select
  using (auth.uid() = user_id);

create policy "Users can insert own registrations"
  on cohort_registrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own registrations"
  on cohort_registrations for update
  using (auth.uid() = user_id);

create policy "Admins can manage all registrations"
  on cohort_registrations for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Weekly updates: users see/manage own; admins see all
create policy "Users can view own weekly updates"
  on weekly_updates for select
  using (auth.uid() = user_id);

create policy "Users can insert own weekly updates"
  on weekly_updates for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weekly updates"
  on weekly_updates for update
  using (auth.uid() = user_id);

create policy "Admins can manage all weekly updates"
  on weekly_updates for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- FUNCTIONS: Yearly Cohort Generation
-- ============================================================

create or replace function generate_yearly_cohorts()
returns void
language plpgsql
as $$
declare
  prog record;
  cadence_entry jsonb;
  cohort_year integer;
  season text;
  app_open_md text;
  app_close_md text;
  kickoff_md text;
  end_offset integer;
  app_open_date date;
  app_close_date date;
  kickoff_date date;
  end_date date;
  cohort_slug text;
  cohort_name text;
  initial_status text;
begin
  cohort_year := extract(year from current_date)::integer;

  for prog in select * from programs where is_active = true loop
    if prog.schedule is null or prog.schedule->'cadence' is null then
      continue;
    end if;

    for cadence_entry in select * from jsonb_array_elements(prog.schedule->'cadence') loop
      season := cadence_entry->>'season';
      app_open_md := cadence_entry->>'appOpen';
      app_close_md := cadence_entry->>'appClose';
      kickoff_md := cadence_entry->>'kickoff';
      end_offset := (cadence_entry->>'endOffset')::integer;

      -- Parse dates. appOpen may be in the prior year (e.g. 12-01 for a January cohort)
      app_open_date := (cohort_year || '-' || app_open_md)::date;
      app_close_date := (cohort_year || '-' || app_close_md)::date;
      kickoff_date := (cohort_year || '-' || kickoff_md)::date;

      -- If appOpen is after appClose, it means appOpen is in the prior year
      if app_open_date > app_close_date then
        app_open_date := ((cohort_year - 1) || '-' || app_open_md)::date;
      end if;

      end_date := kickoff_date + (end_offset * 7);

      cohort_slug := prog.slug || '-' || cohort_year || '-' || season;
      cohort_name := prog.name || ' - ' ||
        initcap(season) || ' ' || cohort_year;

      -- Determine initial status based on current date
      if current_date < app_open_date then
        initial_status := 'upcoming';
      elsif current_date <= app_close_date then
        initial_status := 'open';
      elsif current_date <= end_date then
        initial_status := 'in_progress';
      else
        initial_status := 'completed';
      end if;

      insert into cohorts (
        program_id, slug, name, start_date, end_date,
        application_open, application_close, capacity, status
      ) values (
        prog.id, cohort_slug, cohort_name, kickoff_date, end_date,
        app_open_date, app_close_date, prog.capacity_per_cohort, initial_status
      ) on conflict (slug) do nothing;
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- FUNCTIONS: Daily Cohort Status Updates
-- ============================================================

create or replace function update_cohort_statuses()
returns void
language plpgsql
as $$
declare
  c record;
  new_status text;
begin
  for c in select * from cohorts where status != 'completed' loop
    if current_date < c.application_open then
      new_status := 'upcoming';
    elsif current_date >= c.application_open and current_date <= c.application_close then
      new_status := 'open';
    elsif current_date > c.application_close and current_date < c.start_date then
      new_status := 'upcoming';
    elsif current_date >= c.start_date and current_date <= c.end_date then
      new_status := 'in_progress';
    else
      new_status := 'completed';
    end if;

    if new_status != c.status then
      update cohorts set status = new_status where id = c.id;

      -- When a cohort completes, mark active registrations as completed
      if new_status = 'completed' then
        update cohort_registrations
          set status = 'completed'
          where cohort_id = c.id and status = 'active';
      end if;
    end if;
  end loop;
end;
$$;

-- ============================================================
-- pg_cron JOBS (requires pg_cron extension enabled in Supabase)
-- These will fail silently if pg_cron is not available.
-- In that case, call the functions via GitHub Actions instead.
-- ============================================================

do $$
begin
  -- Yearly: generate cohorts on Jan 1
  perform cron.schedule(
    'generate-yearly-cohorts',
    '0 0 1 1 *',
    'select generate_yearly_cohorts()'
  );

  -- Daily: update cohort statuses at midnight UTC
  perform cron.schedule(
    'update-cohort-statuses',
    '0 0 * * *',
    'select update_cohort_statuses()'
  );
exception
  when undefined_function then
    raise notice 'pg_cron not available. Schedule generate_yearly_cohorts() and update_cohort_statuses() externally.';
  when others then
    raise notice 'pg_cron scheduling failed: %. Schedule functions externally.', sqlerrm;
end;
$$;
