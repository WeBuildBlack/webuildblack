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

  // Get cohort
  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id')
    .eq('slug', params.slug)
    .single();

  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  const { data: updates } = await supabase
    .from('weekly_updates')
    .select('*, profiles(email, full_name, slack_user_id)')
    .eq('cohort_id', cohort.id)
    .order('week_number', { ascending: true })
    .order('submitted_at', { ascending: true });

  return NextResponse.json({ updates: updates || [] });
}
