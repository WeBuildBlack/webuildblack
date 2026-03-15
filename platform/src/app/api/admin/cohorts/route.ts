import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const programSlug = searchParams.get('program');
  const status = searchParams.get('status');

  const supabase = createServiceClient();

  let query = supabase
    .from('cohorts')
    .select('*, programs(slug, name)')
    .order('start_date', { ascending: false });

  if (programSlug) {
    query = query.eq('programs.slug', programSlug);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: cohorts } = await query;

  // Attach registration counts
  const result = [];
  for (const cohort of cohorts || []) {
    const { count } = await supabase
      .from('cohort_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('cohort_id', cohort.id);

    result.push({ ...cohort, registration_count: count || 0 });
  }

  return NextResponse.json({ cohorts: result });
}
