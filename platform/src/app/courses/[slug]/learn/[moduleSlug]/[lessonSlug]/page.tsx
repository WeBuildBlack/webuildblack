import { getCourse, getLessonContent } from '@/lib/courses';
import { renderMarkdown } from '@/lib/markdown';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import LessonSidebar from '@/components/course/LessonSidebar';
import MarkComplete from '@/components/course/MarkComplete';
import LessonContent from '@/components/course/LessonContent';

interface Props {
  params: { slug: string; moduleSlug: string; lessonSlug: string };
}

export default async function LessonPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const course = getCourse(params.slug);
  if (!course) notFound();

  // Check enrollment (look up course UUID by slug first)
  const { data: courseRecord } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', params.slug)
    .single();

  const { data: enrollment } = courseRecord
    ? await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseRecord.id)
        .single()
    : { data: null };

  // Find current lesson
  const currentModule = course.modules.find((m) => m.id === params.moduleSlug);
  if (!currentModule) notFound();

  const currentLesson = currentModule.lessons.find((l) => l.slug === params.lessonSlug);
  if (!currentLesson) notFound();

  // If not enrolled and not free preview, redirect to course page
  if (!enrollment && !currentLesson.isFreePreview) {
    redirect(`/courses/${params.slug}`);
  }

  // Get lesson content
  const lessonData = getLessonContent(params.slug, params.moduleSlug, params.lessonSlug);
  if (!lessonData) notFound();

  const mdxSource = await renderMarkdown(lessonData.content);

  // Build prev/next navigation
  const allLessons: { moduleSlug: string; lessonSlug: string; title: string }[] = [];
  course.modules.forEach((mod) => {
    mod.lessons.forEach((lesson) => {
      allLessons.push({
        moduleSlug: mod.id,
        lessonSlug: lesson.slug,
        title: lesson.title,
      });
    });
  });

  const currentIndex = allLessons.findIndex(
    (l) => l.moduleSlug === params.moduleSlug && l.lessonSlug === params.lessonSlug
  );

  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Check progress
  const { data: progress } = await supabase
    .from('progress')
    .select('completed_at')
    .eq('user_id', user.id)
    .eq('lesson_slug', `${params.moduleSlug}/${params.lessonSlug}`)
    .eq('course_slug', params.slug)
    .single();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <LessonSidebar
        course={course}
        currentModuleSlug={params.moduleSlug}
        currentLessonSlug={params.lessonSlug}
        courseSlug={params.slug}
      />

      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6">
          <Link href={`/courses/${params.slug}`} className="text-brand-medium-brown hover:underline font-body text-sm">
            &larr; {course.title}
          </Link>
          <h1 className="text-3xl font-heading font-bold text-brand-dark-brown mt-2">
            {currentLesson.title}
          </h1>
          {currentLesson.estimatedMinutes && (
            <p className="text-sm text-brand-medium-gray font-body mt-1">
              ~{currentLesson.estimatedMinutes} min read
            </p>
          )}
        </div>

        {/* Lesson body */}
        <div className="prose-wbb">
          <LessonContent source={mdxSource} />
        </div>

        {/* Mark Complete */}
        <div className="mt-8 pt-8 border-t border-brand-light-gray">
          <MarkComplete
            courseSlug={params.slug}
            moduleSlug={params.moduleSlug}
            lessonSlug={params.lessonSlug}
            isCompleted={!!progress?.completed_at}
          />
        </div>

        {/* Prev / Next */}
        <div className="mt-8 flex justify-between items-center">
          {prevLesson ? (
            <Link
              href={`/courses/${params.slug}/learn/${prevLesson.moduleSlug}/${prevLesson.lessonSlug}`}
              className="text-brand-medium-brown hover:underline font-body"
            >
              &larr; {prevLesson.title}
            </Link>
          ) : <div />}
          {nextLesson ? (
            <Link
              href={`/courses/${params.slug}/learn/${nextLesson.moduleSlug}/${nextLesson.lessonSlug}`}
              className="btn-primary text-sm"
            >
              Next: {nextLesson.title} &rarr;
            </Link>
          ) : (
            <Link href={`/dashboard`} className="btn-primary text-sm">
              Back to Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
