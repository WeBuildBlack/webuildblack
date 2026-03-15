import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { courseSlug } = await request.json();

  if (!courseSlug) {
    return NextResponse.json({ error: 'courseSlug required' }, { status: 400 });
  }

  const adminSupabase = createServiceClient();

  // Look up course by slug
  const { data: course } = await adminSupabase
    .from('courses')
    .select('id, price_cents')
    .eq('slug', courseSlug)
    .single();

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Check if user is WBB member or course is free
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('is_wbb_member')
    .eq('id', user.id)
    .single();

  const isFree = !course.price_cents || course.price_cents === 0;
  const isWbbMember = profile?.is_wbb_member || false;

  if (!isFree && !isWbbMember) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }

  // Enroll
  const { error } = await adminSupabase.from('enrollments').upsert({
    user_id: user.id,
    course_id: course.id,
    access_type: isWbbMember ? 'wbb_member' : 'free',
  }, {
    onConflict: 'user_id,course_id',
  });

  if (error) {
    console.error('Enrollment failed:', error.message);
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
