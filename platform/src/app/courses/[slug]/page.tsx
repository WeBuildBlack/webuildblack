import Link from 'next/link';
import { getCourse, getAllCourses } from '@/lib/courses';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import EnrollSidebar from './EnrollSidebar';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const courses = getAllCourses();
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = getCourse(params.slug);
  if (!course) return { title: 'Course Not Found' };
  return {
    title: course.title,
    description: course.description,
  };
}

const difficultyLabels: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: Props) {
  const course = getCourse(params.slug);
  if (!course) notFound();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isWbbMember = false;
  let isEnrolled = false;

  if (user) {
    // Check WBB membership
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_wbb_member')
      .eq('id', user.id)
      .single();

    isWbbMember = profile?.is_wbb_member || false;

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    // Need to match by course slug via courses table
    if (enrollment && enrollment.length > 0) {
      // Check if enrolled in this specific course
      const { data: courseRecord } = await supabase
        .from('courses')
        .select('id')
        .eq('slug', params.slug)
        .single();

      if (courseRecord) {
        const { data: specificEnrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseRecord.id)
          .single();

        isEnrolled = !!specificEnrollment;
      }
    }
  }

  const totalLessons = course.modules.reduce(
    (acc, mod) => acc + mod.lessons.length,
    0
  );

  // Find next incomplete lesson (or first lesson if no progress)
  let nextLessonUrl: string | undefined;
  if (isEnrolled && user) {
    const { data: progress } = await supabase
      .from('progress')
      .select('lesson_slug')
      .eq('user_id', user.id)
      .eq('course_slug', params.slug);

    const completedSlugs = new Set((progress || []).map((p: any) => p.lesson_slug));

    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (!completedSlugs.has(`${mod.id}/${lesson.slug}`)) {
          nextLessonUrl = `/courses/${params.slug}/learn/${mod.id}/${lesson.slug}`;
          break;
        }
      }
      if (nextLessonUrl) break;
    }
  }

  if (!nextLessonUrl) {
    const firstMod = course.modules[0];
    const firstLesson = firstMod?.lessons[0];
    nextLessonUrl = firstMod && firstLesson
      ? `/courses/${params.slug}/learn/${firstMod.id}/${firstLesson.slug}`
      : undefined;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <Link href="/courses" className="text-brand-medium-brown hover:underline font-body text-sm mb-4 inline-block">
          &larr; Back to Courses
        </Link>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-brand-dark-brown mb-4">
          {course.title}
        </h1>
        <p className="text-lg text-brand-dark-gray font-body max-w-3xl mb-6">
          {course.description}
        </p>
        <div className="flex flex-wrap gap-4 text-sm font-body text-brand-dark-gray">
          <span className="bg-brand-off-white px-3 py-1 rounded-full">
            {difficultyLabels[course.difficulty]}
          </span>
          <span className="bg-brand-off-white px-3 py-1 rounded-full">
            {course.estimatedHours} hours
          </span>
          <span className="bg-brand-off-white px-3 py-1 rounded-full">
            {course.modules.length} modules
          </span>
          <span className="bg-brand-off-white px-3 py-1 rounded-full">
            {totalLessons} lessons
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Curriculum */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-heading font-bold text-brand-dark-brown mb-6">
            Curriculum
          </h2>
          <div className="space-y-4">
            {course.modules.map((mod, idx) => (
              <div key={mod.id} className="border border-brand-light-gray rounded-lg overflow-hidden">
                <div className="bg-brand-off-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-heading font-bold text-brand-dark-brown">
                    <span className="text-brand-medium-brown mr-2">{String(idx + 1).padStart(2, '0')}</span>
                    {mod.title}
                  </h3>
                  <span className="text-sm text-brand-medium-gray font-body">
                    {mod.estimatedMinutes}min
                  </span>
                </div>
                <ul className="divide-y divide-brand-light-gray">
                  {mod.lessons.map((lesson) => (
                    <li key={lesson.slug} className={`px-6 py-3 flex items-center justify-between ${lesson.slug === 'project' ? 'bg-brand-gold/10' : ''}`}>
                      <div className="flex items-center gap-2">
                        {lesson.slug === 'project' && (
                          <span className="text-xs bg-brand-gold/20 text-brand-medium-brown px-2 py-0.5 rounded-full font-accent font-bold">
                            Project
                          </span>
                        )}
                        {lesson.isFreePreview && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-accent">
                            Free Preview
                          </span>
                        )}
                        <span className={`font-body text-sm ${lesson.slug === 'project' ? 'text-brand-dark-brown font-bold' : 'text-brand-dark-gray'}`}>
                          {lesson.title}
                        </span>
                      </div>
                      {lesson.estimatedMinutes && (
                        <span className="text-xs text-brand-medium-gray font-body">
                          {lesson.estimatedMinutes}min
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Prerequisites */}
          {course.prerequisites.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-heading font-bold text-brand-dark-brown mb-4">
                Prerequisites
              </h2>
              <ul className="list-disc pl-6 space-y-1 text-brand-dark-gray font-body">
                {course.prerequisites.map((prereq) => (
                  <li key={prereq}>{prereq}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <EnrollSidebar
            slug={course.slug}
            priceCents={course.priceCents}
            difficulty={difficultyLabels[course.difficulty]}
            estimatedHours={course.estimatedHours}
            moduleCount={course.modules.length}
            lessonCount={totalLessons}
            isLoggedIn={!!user}
            isWbbMember={isWbbMember}
            isEnrolled={isEnrolled}
            firstLessonUrl={nextLessonUrl}
          />
        </div>
      </div>
    </div>
  );
}
