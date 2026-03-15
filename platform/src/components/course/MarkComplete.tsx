'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  isCompleted: boolean;
}

export default function MarkComplete({ courseSlug, moduleSlug, lessonSlug, isCompleted: initialCompleted }: Props) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fullLessonSlug = `${moduleSlug}/${lessonSlug}`;

  const handleToggle = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    if (completed) {
      await supabase
        .from('progress')
        .delete()
        .eq('user_id', user.id)
        .eq('course_slug', courseSlug)
        .eq('lesson_slug', fullLessonSlug);
      setCompleted(false);
    } else {
      await supabase
        .from('progress')
        .upsert({
          user_id: user.id,
          course_slug: courseSlug,
          lesson_slug: fullLessonSlug,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,course_slug,lesson_slug',
        });
      setCompleted(true);
    }

    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        inline-flex items-center gap-2 px-6 py-3 rounded-lg font-accent font-bold transition-all
        ${completed
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-brand-off-white text-brand-dark-gray hover:bg-brand-light-gray'
        }
        disabled:opacity-50
      `}
    >
      {completed ? (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Completed
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
          </svg>
          Mark as Complete
        </>
      )}
    </button>
  );
}
