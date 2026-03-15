import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const courseSlug = searchParams.get('course');

  const supabase = createServiceClient();

  let query = supabase
    .from('profiles')
    .select(`
      id, email, full_name, is_wbb_member, created_at,
      enrollments(course_id, access_type, enrolled_at),
      progress(lesson_id, course_id, completed_at)
    `)
    .order('created_at', { ascending: false });

  const { data: students, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Optionally filter by course enrollment
  let filtered = students || [];
  if (courseSlug) {
    filtered = filtered.filter((s: any) =>
      s.enrollments?.some((e: any) => e.course_id === courseSlug)
    );
  }

  return NextResponse.json({
    total: filtered.length,
    students: filtered,
  });
}
