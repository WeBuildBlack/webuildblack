'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CourseData } from '@/lib/courses';

interface Props {
  course: CourseData;
  currentModuleSlug: string;
  currentLessonSlug: string;
  courseSlug: string;
}

export default function LessonSidebar({ course, currentModuleSlug, currentLessonSlug, courseSlug }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed bottom-4 left-4 z-40 bg-brand-dark-brown text-white p-3 rounded-full shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-72 bg-brand-off-white border-r border-brand-light-gray overflow-y-auto
        transform transition-transform lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4">
          <Link href={`/courses/${courseSlug}`} className="text-sm text-brand-medium-brown hover:underline font-body block mb-4">
            &larr; Course Overview
          </Link>
          <h2 className="font-heading font-bold text-brand-dark-brown text-sm mb-4 truncate">
            {course.title}
          </h2>

          <nav className="space-y-3">
            {course.modules.map((mod, idx) => (
              <div key={mod.id}>
                <div className="text-xs font-accent font-bold text-brand-medium-gray uppercase tracking-wider mb-1">
                  {String(idx + 1).padStart(2, '0')} — {mod.title}
                </div>
                <ul className="space-y-0.5 ml-2">
                  {mod.lessons.map((lesson) => {
                    const isActive = mod.id === currentModuleSlug && lesson.slug === currentLessonSlug;
                    return (
                      <li key={lesson.slug}>
                        <Link
                          href={`/courses/${courseSlug}/learn/${mod.id}/${lesson.slug}`}
                          className={`
                            block text-sm py-1.5 px-2 rounded font-body transition-colors
                            ${isActive
                              ? 'bg-brand-gold/20 text-brand-dark-brown font-bold'
                              : 'text-brand-dark-gray hover:bg-brand-light-gray'
                            }
                          `}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {lesson.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
