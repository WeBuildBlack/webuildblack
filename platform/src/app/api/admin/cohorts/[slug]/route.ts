import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const supabase = createServiceClient();

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('*, programs(slug, name)')
    .eq('slug', params.slug)
    .single();

  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('cohort_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('cohort_id', cohort.id);

  return NextResponse.json({ cohort: { ...cohort, registration_count: count || 0 } });
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const body = await request.json();
  const supabase = createServiceClient();

  const { data: cohort, error } = await supabase
    .from('cohorts')
    .update(body)
    .eq('slug', params.slug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  return NextResponse.json({ cohort, message: 'Cohort updated' });
}
