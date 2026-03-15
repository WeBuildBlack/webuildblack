import Link from 'next/link';
import { getAllCourses } from '@/lib/courses';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Courses',
  description: 'Browse technical education courses from We Build Black.',
};

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

export default function CoursesPage() {
  const courses = getAllCourses();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-brand-dark-brown mb-4">
          Course Catalog
        </h1>
        <p className="text-lg text-brand-dark-gray font-body max-w-2xl mx-auto">
          Hands-on technical courses designed to take you from learning to earning. WBB Slack members get every course free.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-center text-brand-medium-gray font-body">
          No courses available yet. Check back soon!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <Link
              key={course.slug}
              href={`/courses/${course.slug}`}
              className="group bg-white border border-brand-light-gray rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="bg-brand-dark-brown p-6">
                <span className={`inline-block text-xs font-accent font-bold px-2 py-1 rounded-full ${difficultyColors[course.difficulty]}`}>
                  {course.difficulty}
                </span>
                <h2 className="text-xl font-heading font-bold text-white mt-3 group-hover:text-brand-gold transition-colors">
                  {course.title}
                </h2>
              </div>
              <div className="p-6">
                <p className="text-brand-dark-gray font-body text-sm mb-4">
                  {course.description}
                </p>
                <div className="flex items-center justify-between text-sm text-brand-medium-gray font-body">
                  <span>{course.modules.length} modules</span>
                  <span>{course.estimatedHours}h estimated</span>
                </div>
                {course.priceCents ? (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-brand-dark-brown">
                      ${(course.priceCents / 100).toFixed(0)}
                    </span>
                    <span className="text-xs text-brand-medium-gray">
                      Free for WBB members
                    </span>
                  </div>
                ) : (
                  <div className="mt-4">
                    <span className="text-lg font-bold text-green-700">Free</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
