import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check WBB membership
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_wbb_member')
    .eq('id', user.id)
    .single();

  if (!profile?.is_wbb_member) {
    return NextResponse.json(
      { error: 'WBB Slack membership required to register for programs' },
      { status: 403 }
    );
  }

  const serviceClient = createServiceClient();

  // Get program
  const { data: program } = await serviceClient
    .from('programs')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Get open cohort
  const { data: cohort } = await serviceClient
    .from('cohorts')
    .select('*')
    .eq('program_id', program.id)
    .eq('status', 'open')
    .order('start_date', { ascending: true })
    .limit(1)
    .single();

  if (!cohort) {
    return NextResponse.json({ error: 'No open cohort for registration' }, { status: 400 });
  }

  // Check capacity
  const { count } = await serviceClient
    .from('cohort_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('cohort_id', cohort.id)
    .neq('status', 'withdrawn');

  if ((count || 0) >= cohort.capacity) {
    return NextResponse.json({ error: 'Cohort is full' }, { status: 400 });
  }

  // Check if already registered
  const { data: existing } = await serviceClient
    .from('cohort_registrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohort.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already registered for this cohort' }, { status: 409 });
  }

  // Validate registration data
  const body = await request.json();
  const registrationData = body.registration_data || {};

  // Check required fields
  for (const field of program.registration_fields) {
    if (field.required && !registrationData[field.key]) {
      return NextResponse.json(
        { error: `${field.label} is required` },
        { status: 400 }
      );
    }
  }

  // Insert registration
  const { data: registration, error } = await serviceClient
    .from('cohort_registrations')
    .insert({
      user_id: user.id,
      cohort_id: cohort.id,
      registration_data: registrationData,
      status: 'registered',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    registration,
    cohort: { slug: cohort.slug, name: cohort.name, start_date: cohort.start_date },
    message: 'Successfully registered',
  });
}
