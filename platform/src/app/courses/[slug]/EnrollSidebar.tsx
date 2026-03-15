'use client';

import { useState } from 'react';
import Link from 'next/link';

interface EnrollSidebarProps {
  slug: string;
  priceCents?: number;
  difficulty: string;
  estimatedHours: number;
  moduleCount: number;
  lessonCount: number;
  isLoggedIn: boolean;
  isWbbMember: boolean;
  isEnrolled: boolean;
  firstLessonUrl?: string;
}

export default function EnrollSidebar({
  slug,
  priceCents,
  difficulty,
  estimatedHours,
  moduleCount,
  lessonCount,
  isLoggedIn,
  isWbbMember,
  isEnrolled,
  firstLessonUrl,
}: EnrollSidebarProps) {
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAutoEnroll = async () => {
    setEnrolling(true);
    setError(null);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug: slug }),
      });
      if (res.ok) {
        window.location.href = firstLessonUrl || `/dashboard`;
      } else {
        const data = await res.json();
        setError(data.error || 'Enrollment failed. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="sticky top-20 bg-white border border-brand-light-gray rounded-xl p-6 shadow-sm">
      {isEnrolled ? (
        <>
          <div className="text-center mb-6">
            <span className="text-2xl font-heading font-bold text-green-700">
              Enrolled
            </span>
          </div>
          <Link
            href={firstLessonUrl || `/dashboard`}
            className="btn-primary w-full text-center"
          >
            Continue Learning
          </Link>
        </>
      ) : isWbbMember ? (
        <>
          <div className="text-center mb-6">
            <span className="text-2xl font-heading font-bold text-green-700">
              Free
            </span>
            <p className="text-sm text-brand-medium-gray font-body mt-1">
              WBB member access
            </p>
          </div>
          <button
            onClick={handleAutoEnroll}
            disabled={enrolling}
            className="btn-primary w-full"
          >
            {enrolling ? 'Enrolling...' : 'Start Learning (Free)'}
          </button>
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </>
      ) : priceCents ? (
        <>
          <div className="text-center mb-6">
            <span className="text-4xl font-heading font-bold text-brand-dark-brown">
              ${(priceCents / 100).toFixed(0)}
            </span>
            <p className="text-sm text-brand-medium-gray font-body mt-1">
              one-time purchase
            </p>
          </div>
          <Link
            href={isLoggedIn ? `/checkout/${slug}` : `/auth/login?next=/checkout/${slug}`}
            className="btn-primary w-full text-center mb-3"
          >
            Enroll Now
          </Link>
          <Link
            href={isLoggedIn ? `/checkout/${slug}?verify=slack` : `/auth/login?next=/checkout/${slug}?verify=slack`}
            className="btn-outline w-full text-center text-sm"
          >
            I&apos;m a WBB Member (Free)
          </Link>
        </>
      ) : (
        <>
          <div className="text-center mb-6">
            <span className="text-4xl font-heading font-bold text-green-700">
              Free
            </span>
          </div>
          {isLoggedIn ? (
            <>
              <button
                onClick={handleAutoEnroll}
                disabled={enrolling}
                className="btn-primary w-full"
              >
                {enrolling ? 'Enrolling...' : 'Enroll for Free'}
              </button>
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </>
          ) : (
            <Link
              href={`/auth/signup?next=/courses/${slug}`}
              className="btn-primary w-full text-center"
            >
              Sign Up to Enroll
            </Link>
          )}
        </>
      )}

      <div className="mt-6 pt-6 border-t border-brand-light-gray space-y-3 text-sm font-body text-brand-dark-gray">
        <div className="flex justify-between">
          <span>Difficulty</span>
          <span className="font-bold">{difficulty}</span>
        </div>
        <div className="flex justify-between">
          <span>Duration</span>
          <span className="font-bold">{estimatedHours} hours</span>
        </div>
        <div className="flex justify-between">
          <span>Modules</span>
          <span className="font-bold">{moduleCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Lessons</span>
          <span className="font-bold">{lessonCount}</span>
        </div>
      </div>
    </div>
  );
}
