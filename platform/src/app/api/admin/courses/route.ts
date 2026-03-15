import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { getAllCourses, getCourse } from '@/lib/courses';

export async function GET(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const supabase = createServiceClient();
  const { data: courses } = await supabase
    .from('courses')
    .select('*, enrollments(count)')
    .order('created_at', { ascending: false });

  return NextResponse.json({ courses: courses || [] });
}

export async function POST(request: Request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const { slug } = await request.json();
  const courseData = getCourse(slug);

  if (!courseData) {
    return NextResponse.json({ error: `Course "${slug}" not found in filesystem` }, { status: 404 });
  }

  const supabase = createServiceClient();

  // Upsert course
  const { data: course, error } = await supabase
    .from('courses')
    .upsert({
      slug: courseData.slug,
      title: courseData.title,
      description: courseData.description,
      difficulty: courseData.difficulty,
      estimated_hours: courseData.estimatedHours,
      price_cents: courseData.priceCents || 0,
      stripe_price_id: courseData.stripePriceId || null,
      is_published: true,
    }, { onConflict: 'slug' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync modules and lessons
  for (let i = 0; i < courseData.modules.length; i++) {
    const mod = courseData.modules[i];

    const { data: moduleRow } = await supabase
      .from('modules')
      .upsert({
        course_id: course.id,
        slug: mod.id,
        title: mod.title,
        sort_order: i,
        estimated_minutes: mod.estimatedMinutes,
      }, { onConflict: 'course_id,slug' })
      .select()
      .single();

    if (moduleRow) {
      for (let j = 0; j < mod.lessons.length; j++) {
        const lesson = mod.lessons[j];
        await supabase
          .from('lessons')
          .upsert({
            module_id: moduleRow.id,
            slug: lesson.slug,
            title: lesson.title,
            sort_order: j,
            content_path: `${courseData.slug}/modules/${mod.id}/lessons/${lesson.slug}.md`,
            estimated_minutes: lesson.estimatedMinutes || null,
            is_free_preview: lesson.isFreePreview || false,
          }, { onConflict: 'module_id,slug' });
      }
    }
  }

  return NextResponse.json({ course, message: 'Course synced successfully' });
}
