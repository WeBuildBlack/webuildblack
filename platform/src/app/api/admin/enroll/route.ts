import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const { email, courseSlug, accessType = 'manual' } = await request.json();

  if (!email || !courseSlug) {
    return NextResponse.json({ error: 'email and courseSlug are required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Find user by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!profile) {
    return NextResponse.json({ error: `User with email "${email}" not found` }, { status: 404 });
  }

  // Create enrollment
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .upsert({
      user_id: profile.id,
      course_id: courseSlug,
      access_type: accessType,
    }, { onConflict: 'user_id,course_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enrollment, message: `${email} enrolled in ${courseSlug}` });
}
