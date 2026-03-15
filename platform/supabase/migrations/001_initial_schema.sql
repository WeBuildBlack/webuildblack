-- WBB Learn Platform - Initial Schema
-- Run this in Supabase SQL Editor or via migrations

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  slack_user_id text,
  slack_team_id text,
  is_wbb_member boolean default false,
  stripe_customer_id text,
  role text default 'student' check (role in ('student', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. COURSES
-- ============================================
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  description text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  estimated_hours integer,
  price_cents integer default 0,
  stripe_price_id text,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.courses enable row level security;

create policy "Anyone can view published courses"
  on public.courses for select
  using (is_published = true);

create policy "Admins can manage courses"
  on public.courses for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- 3. MODULES
-- ============================================
create table public.modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses on delete cascade not null,
  slug text not null,
  title text not null,
  sort_order integer not null,
  estimated_minutes integer,
  created_at timestamptz default now(),
  unique(course_id, slug)
);

alter table public.modules enable row level security;

create policy "Anyone can view modules of published courses"
  on public.modules for select
  using (
    exists (
      select 1 from public.courses
      where courses.id = modules.course_id and courses.is_published = true
    )
  );

-- ============================================
-- 4. LESSONS
-- ============================================
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  module_id uuid references public.modules on delete cascade not null,
  slug text not null,
  title text not null,
  sort_order integer not null,
  content_path text,
  estimated_minutes integer,
  is_free_preview boolean default false,
  created_at timestamptz default now(),
  unique(module_id, slug)
);

alter table public.lessons enable row level security;

create policy "Anyone can view lesson metadata of published courses"
  on public.lessons for select
  using (
    exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id and c.is_published = true
    )
  );

-- ============================================
-- 5. ENROLLMENTS
-- ============================================
create table public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  access_type text not null check (access_type in ('paid', 'wbb_member', 'manual', 'free')),
  stripe_payment_id text,
  enrolled_at timestamptz default now(),
  unique(user_id, course_id)
);

alter table public.enrollments enable row level security;

create policy "Users can view own enrollments"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "Admins can view all enrollments"
  on public.enrollments for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can create enrollments"
  on public.enrollments for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- 6. PROGRESS
-- ============================================
create table public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  lesson_id uuid references public.lessons on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  completed_at timestamptz default now(),
  quiz_score jsonb,
  unique(user_id, lesson_id)
);

alter table public.progress enable row level security;

create policy "Users can view own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.progress for update
  using (auth.uid() = user_id);

create policy "Admins can view all progress"
  on public.progress for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- 7. PAYMENTS
-- ============================================
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  stripe_checkout_session_id text unique,
  amount_cents integer not null,
  status text default 'pending' check (status in ('pending', 'completed', 'refunded', 'failed')),
  created_at timestamptz default now()
);

alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Admins can view all payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- 8. ADMIN VIEWS
-- ============================================
create or replace view public.v_enrollment_stats as
select
  c.slug as course_slug,
  c.title as course_title,
  count(e.id) as total_enrollments,
  count(case when e.access_type = 'paid' then 1 end) as paid_enrollments,
  count(case when e.access_type = 'wbb_member' then 1 end) as wbb_member_enrollments,
  count(case when e.access_type = 'manual' then 1 end) as manual_enrollments,
  count(case when e.access_type = 'free' then 1 end) as free_enrollments
from public.courses c
left join public.enrollments e on e.course_id = c.id
group by c.id, c.slug, c.title;

create or replace view public.v_revenue_stats as
select
  c.slug as course_slug,
  c.title as course_title,
  count(p.id) as total_payments,
  coalesce(sum(case when p.status = 'completed' then p.amount_cents else 0 end), 0) as total_revenue_cents,
  coalesce(avg(case when p.status = 'completed' then p.amount_cents else null end), 0) as avg_payment_cents
from public.courses c
left join public.payments p on p.course_id = c.id
group by c.id, c.slug, c.title;

-- ============================================
-- 9. INDEXES
-- ============================================
create index idx_enrollments_user_id on public.enrollments(user_id);
create index idx_enrollments_course_id on public.enrollments(course_id);
create index idx_progress_user_id on public.progress(user_id);
create index idx_progress_course_id on public.progress(course_id);
create index idx_payments_user_id on public.payments(user_id);
create index idx_modules_course_id on public.modules(course_id);
create index idx_lessons_module_id on public.lessons(module_id);
create index idx_courses_slug on public.courses(slug);

-- ============================================
-- 10. UPDATED_AT TRIGGER
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger courses_updated_at
  before update on public.courses
  for each row execute procedure public.update_updated_at();
