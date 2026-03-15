import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAllCourses } from '@/lib/courses';
import { getUserRegistrations, getWeekNumber } from '@/lib/programs';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get enrollments with course slug
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, courses(slug)')
    .eq('user_id', user.id);

  // Get progress
  const { data: progress } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', user.id);

  const courses = getAllCourses();
  const enrolledSlugs = new Set(
    (enrollments || []).map((e: any) => e.courses?.slug).filter(Boolean)
  );

  // Compute progress per course
  const courseProgress = courses
    .filter((c) => enrolledSlugs.has(c.slug))
    .map((course) => {
      const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
      const completedLessons = (progress || []).filter(
        (p: any) => p.course_slug === course.slug
      ).length;
      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      // Find next uncompleted lesson
      const completedIds = new Set(
        (progress || [])
          .filter((p: any) => p.course_slug === course.slug)
          .map((p: any) => p.lesson_slug)
      );

      let nextLesson: { moduleSlug: string; lessonSlug: string } | null = null;
      for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
          if (!completedIds.has(`${mod.id}/${lesson.slug}`)) {
            nextLesson = { moduleSlug: mod.id, lessonSlug: lesson.slug };
            break;
          }
        }
        if (nextLesson) break;
      }

      return {
        ...course,
        totalLessons,
        completedLessons,
        percent,
        nextLesson,
      };
    });

  const unenrolledCourses = courses.filter((c) => !enrolledSlugs.has(c.slug));

  // Get program registrations
  const programRegistrations = await getUserRegistrations(user.id);
  const activePrograms = programRegistrations.filter(
    (r: any) => r.status === 'registered' || r.status === 'active'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-brand-dark-brown">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="text-brand-dark-gray font-body mt-1">
          {profile?.is_wbb_member && (
            <span className="inline-flex items-center gap-1 text-brand-medium-brown font-bold text-sm mr-3">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              WBB Member
            </span>
          )}
          Continue learning where you left off.
        </p>
      </div>

      {/* My Programs */}
      {activePrograms.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-heading font-bold text-brand-dark-brown mb-4">
            My Programs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activePrograms.map((reg: any) => {
              const cohort = reg.cohorts;
              const program = cohort?.programs;
              if (!program || !cohort) return null;

              const weekNumber = cohort.status === 'in_progress'
                ? getWeekNumber(cohort.start_date)
                : null;

              // Check if update submitted this week
              const weeksLogged = 0; // Computed client-side if needed

              return (
                <div key={reg.id} className="border border-brand-light-gray rounded-xl p-6 bg-white">
                  <h3 className="font-heading font-bold text-brand-dark-brown text-lg mb-1">
                    {program.name}
                  </h3>
                  <p className="text-sm text-brand-medium-gray font-body mb-3">
                    {cohort.name}
                    {reg.pod && <> &middot; Pod: <span className="font-bold text-brand-dark-gray">{reg.pod}</span></>}
                  </p>

                  {weekNumber !== null && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 bg-brand-light-gray rounded-full h-2">
                        <div
                          className="bg-brand-gold h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round((weekNumber / program.duration_weeks) * 100))}%` }}
                        />
                      </div>
                      <span className="text-sm font-accent font-bold text-brand-dark-gray">
                        Week {weekNumber}/{program.duration_weeks}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {cohort.status === 'in_progress' && (
                      <Link
                        href={`/programs/${program.slug}/updates`}
                        className="btn-primary text-sm"
                      >
                        Weekly Update
                      </Link>
                    )}
                    <Link
                      href={`/programs/${program.slug}`}
                      className="text-brand-medium-brown font-accent font-bold text-sm flex items-center"
                    >
                      View Program &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activePrograms.length === 0 && (
        <section className="mb-8">
          <Link
            href="/programs"
            className="text-brand-medium-brown font-accent font-bold text-sm hover:underline"
          >
            Explore Programs &rarr;
          </Link>
        </section>
      )}

      {/* Enrolled Courses */}
      {courseProgress.length > 0 ? (
        <section className="mb-12">
          <h2 className="text-xl font-heading font-bold text-brand-dark-brown mb-4">
            My Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courseProgress.map((course) => (
              <div key={course.slug} className="border border-brand-light-gray rounded-xl p-6 bg-white">
                <h3 className="font-heading font-bold text-brand-dark-brown text-lg mb-2">
                  {course.title}
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-brand-light-gray rounded-full h-2">
                    <div
                      className="bg-brand-gold h-2 rounded-full transition-all"
                      style={{ width: `${course.percent}%` }}
                    />
                  </div>
                  <span className="text-sm font-accent font-bold text-brand-dark-gray">
                    {course.percent}%
                  </span>
                </div>
                <p className="text-sm text-brand-medium-gray font-body mb-4">
                  {course.completedLessons} of {course.totalLessons} lessons completed
                </p>
                {course.nextLesson ? (
                  <Link
                    href={`/courses/${course.slug}/learn/${course.nextLesson.moduleSlug}/${course.nextLesson.lessonSlug}`}
                    className="btn-primary text-sm"
                  >
                    Continue Learning
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-green-700 font-accent font-bold text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Course Completed
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mb-12 bg-brand-off-white rounded-xl p-8 text-center">
          <h2 className="text-xl font-heading font-bold text-brand-dark-brown mb-2">
            No Courses Yet
          </h2>
          <p className="text-brand-dark-gray font-body mb-4">
            Browse our catalog and start learning today.
          </p>
          <Link href="/courses" className="btn-primary">
            Browse Courses
          </Link>
        </section>
      )}

      {/* More courses to explore */}
      {unenrolledCourses.length > 0 && (
        <section>
          <h2 className="text-xl font-heading font-bold text-brand-dark-brown mb-4">
            Explore More Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unenrolledCourses.map((course) => (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="border border-brand-light-gray rounded-xl p-6 bg-white hover:shadow-md transition-shadow"
              >
                <h3 className="font-heading font-bold text-brand-dark-brown mb-2">
                  {course.title}
                </h3>
                <p className="text-sm text-brand-dark-gray font-body mb-3">
                  {course.description}
                </p>
                <span className="text-brand-medium-brown font-accent font-bold text-sm">
                  View Course &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
