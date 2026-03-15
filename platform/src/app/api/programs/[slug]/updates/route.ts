import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get program
  const { data: program } = await serviceClient
    .from('programs')
    .select('id')
    .eq('slug', params.slug)
    .single();

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Find user's active registration for this program
  const { data: registrations } = await serviceClient
    .from('cohort_registrations')
    .select('*, cohorts!inner(*)')
    .eq('user_id', user.id)
    .eq('cohorts.program_id', program.id)
    .in('status', ['registered', 'active']);

  // Prefer in_progress cohort
  const registration = registrations?.find((r: any) => r.cohorts?.status === 'in_progress') || registrations?.[0];

  if (!registration) {
    return NextResponse.json({ error: 'No active registration found' }, { status: 404 });
  }

  // Get all weekly updates for this cohort
  const { data: updates } = await serviceClient
    .from('weekly_updates')
    .select('*')
    .eq('user_id', user.id)
    .eq('cohort_id', registration.cohort_id)
    .order('week_number', { ascending: true });

  return NextResponse.json({ updates: updates || [], registration });
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get program
  const { data: prog } = await serviceClient
    .from('programs')
    .select('id, duration_weeks')
    .eq('slug', params.slug)
    .single();

  if (!prog) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Find active registration
  const { data: registrations } = await serviceClient
    .from('cohort_registrations')
    .select('*, cohorts!inner(*)')
    .eq('user_id', user.id)
    .eq('cohorts.program_id', prog.id)
    .in('status', ['registered', 'active']);

  // Prefer in_progress cohort
  const registration = registrations?.find((r: any) => r.cohorts?.status === 'in_progress') || registrations?.[0];

  if (!registration) {
    return NextResponse.json({ error: 'No active registration found' }, { status: 404 });
  }

  const cohort = registration.cohorts;

  if (cohort.status !== 'in_progress') {
    return NextResponse.json({ error: 'Cohort is not currently in progress' }, { status: 400 });
  }

  const body = await request.json();
  const { week_number, data: updateData } = body;

  if (week_number === undefined || week_number < 0 || week_number > (prog.duration_weeks || 52)) {
    return NextResponse.json({ error: 'Invalid week number' }, { status: 400 });
  }

  // Upsert weekly update
  const { data: update, error } = await serviceClient
    .from('weekly_updates')
    .upsert({
      user_id: user.id,
      cohort_id: registration.cohort_id,
      week_number,
      data: updateData || {},
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,cohort_id,week_number',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ update, message: 'Weekly update saved' });
}
