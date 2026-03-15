import { createClient, createServiceClient } from '@/lib/supabase/server';

export interface Program {
  id: string;
  slug: string;
  name: string;
  description: string;
  duration_weeks: number;
  capacity_per_cohort: number;
  schedule: {
    cadence?: Array<{
      season: string;
      appOpen: string;
      appClose: string;
      kickoff: string;
      endOffset: number;
    }>;
    podRoles?: string[];
    podMinSize?: number;
    podMaxSize?: number;
  };
  registration_fields: RegistrationField[];
  update_fields: UpdateField[];
  is_active: boolean;
  created_at: string;
}

export interface RegistrationField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'number' | 'checkbox';
  required?: boolean;
  options?: Array<{ value: string; label: string }> | string[];
}

export interface UpdateField {
  key: string;
  label: string;
  type: 'number' | 'select' | 'textarea' | 'checkbox' | 'rating' | 'text';
  default?: any;
  options?: string[];
  min?: number;
  max?: number;
  required?: boolean;
}

export interface Cohort {
  id: string;
  program_id: string;
  slug: string;
  name: string;
  start_date: string;
  end_date: string;
  application_open: string;
  application_close: string;
  capacity: number;
  status: 'upcoming' | 'open' | 'in_progress' | 'completed';
  created_at: string;
  registration_count?: number;
}

export interface Registration {
  id: string;
  user_id: string;
  cohort_id: string;
  pod: string | null;
  registration_data: Record<string, any>;
  status: 'registered' | 'active' | 'completed' | 'withdrawn';
  registered_at: string;
}

export interface WeeklyUpdate {
  id: string;
  user_id: string;
  cohort_id: string;
  week_number: number;
  data: Record<string, any>;
  submitted_at: string;
  updated_at: string;
}

export async function getPrograms(): Promise<(Program & { currentCohort: Cohort | null })[]> {
  const supabase = createClient();

  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (!programs) return [];

  const result = [];
  for (const program of programs) {
    const cohort = await getCurrentCohort(program.slug);
    result.push({ ...program, currentCohort: cohort });
  }
  return result;
}

export async function getProgram(slug: string): Promise<(Program & { cohorts: Cohort[] }) | null> {
  const supabase = createClient();

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!program) return null;

  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('*')
    .eq('program_id', program.id)
    .neq('status', 'completed')
    .order('start_date', { ascending: true });

  // Attach registration counts
  const cohortsWithCounts: Cohort[] = [];
  for (const cohort of cohorts || []) {
    const { count } = await supabase
      .from('cohort_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('cohort_id', cohort.id)
      .neq('status', 'withdrawn');

    cohortsWithCounts.push({ ...cohort, registration_count: count || 0 });
  }

  return { ...program, cohorts: cohortsWithCounts };
}

export async function getCurrentCohort(programSlug: string): Promise<Cohort | null> {
  const supabase = createClient();

  // Get program ID
  const { data: program } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', programSlug)
    .single();

  if (!program) return null;

  // Prefer open cohort, then in_progress, then upcoming
  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('*')
    .eq('program_id', program.id)
    .neq('status', 'completed')
    .order('start_date', { ascending: true });

  if (!cohorts || cohorts.length === 0) return null;

  const open = cohorts.find((c) => c.status === 'open');
  if (open) return open;

  const inProgress = cohorts.find((c) => c.status === 'in_progress');
  if (inProgress) return inProgress;

  return cohorts[0]; // Next upcoming
}

export async function getUserRegistrations(userId: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from('cohort_registrations')
    .select('*, cohorts(*, programs(*))')
    .eq('user_id', userId)
    .neq('status', 'withdrawn')
    .order('registered_at', { ascending: false });

  return data || [];
}

export function getWeekNumber(cohortStartDate: string): number {
  const start = new Date(cohortStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(diffDays / 7));
}
