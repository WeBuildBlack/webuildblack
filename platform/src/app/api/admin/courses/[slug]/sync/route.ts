import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@/lib/admin';
import { getCourse } from '@/lib/courses';
import { createServiceClient } from '@/lib/supabase/server';

interface Props {
  params: { slug: string };
}

export async function POST(request: Request, { params }: Props) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  const courseData = getCourse(params.slug);
  if (!courseData) {
    return NextResponse.json({ error: `Course "${params.slug}" not found in filesystem` }, { status: 404 });
  }

  const supabase = createServiceClient();

  // Update course metadata
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
  let modulesUpdated = 0;
  let lessonsUpdated = 0;

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

    modulesUpdated++;

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
        lessonsUpdated++;
      }
    }
  }

  return NextResponse.json({
    message: 'Course synced successfully',
    course: course.slug,
    modulesUpdated,
    lessonsUpdated,
  });
}
