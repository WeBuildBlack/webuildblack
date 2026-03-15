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

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Include cohorts
  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('*')
    .eq('program_id', program.id)
    .order('start_date', { ascending: false });

  return NextResponse.json({ program, cohorts: cohorts || [] });
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const body = await request.json();
  const supabase = createServiceClient();

  const { data: program, error } = await supabase
    .from('programs')
    .update(body)
    .eq('slug', params.slug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  return NextResponse.json({ program, message: 'Program updated' });
}
