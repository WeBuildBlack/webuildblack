import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe';
import { getCourse } from '@/lib/courses';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { courseSlug } = await request.json();
  const course = getCourse(courseSlug);

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseSlug)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already enrolled', redirect: `/courses/${courseSlug}/learn` });
  }

  // Free course — auto-enroll
  if (!course.priceCents || course.priceCents === 0) {
    await supabase.from('enrollments').insert({
      user_id: user.id,
      course_id: courseSlug,
      access_type: 'free',
    });
    return NextResponse.json({ url: '/checkout/success' });
  }

  // Paid course — create Stripe checkout
  if (!course.stripePriceId) {
    return NextResponse.json({ error: 'Course not configured for purchase' }, { status: 400 });
  }

  const session = await createCheckoutSession({
    priceId: course.stripePriceId,
    courseSlug,
    customerEmail: user.email!,
    userId: user.id,
  });

  return NextResponse.json({ url: session.url });
}
