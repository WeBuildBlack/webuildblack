import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const supabase = createServiceClient();
  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .order('name');

  return NextResponse.json({ programs: programs || [] });
}

export async function POST(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const body = await request.json();
  const { slug, name, description, duration_weeks, capacity_per_cohort, schedule, registration_fields, update_fields } = body;

  if (!slug || !name || !description || !duration_weeks) {
    return NextResponse.json({ error: 'Missing required fields: slug, name, description, duration_weeks' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: program, error } = await supabase
    .from('programs')
    .upsert({
      slug,
      name,
      description,
      duration_weeks,
      capacity_per_cohort: capacity_per_cohort || 30,
      schedule: schedule || {},
      registration_fields: registration_fields || [],
      update_fields: update_fields || [],
      is_active: true,
    }, { onConflict: 'slug' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ program, message: 'Program created/updated' });
}
