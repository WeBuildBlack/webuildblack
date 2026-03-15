-- Progress tracking uses filesystem-based lesson slugs, not UUID references.
-- The original schema expected lessons to live in the database, but course
-- content lives in the filesystem and is read at runtime.
-- This migration changes progress to use text-based identifiers.

-- Drop existing progress table and recreate with text-based IDs
drop table if exists public.progress cascade;

create table public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  course_slug text not null,
  lesson_slug text not null,
  completed_at timestamptz default now(),
  quiz_score jsonb,
  unique(user_id, course_slug, lesson_slug)
);

alter table public.progress enable row level security;

create policy "Users can view own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own progress"
  on public.progress for delete
  using (auth.uid() = user_id);

create index idx_progress_user_id on public.progress(user_id);
create index idx_progress_course_slug on public.progress(course_slug);
