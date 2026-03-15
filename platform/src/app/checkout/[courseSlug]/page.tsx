'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseSlug = params.courseSlug as string;
  const verifySlack = searchParams.get('verify') === 'slack';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handlePurchase = async () => {
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = `/auth/login?next=/checkout/${courseSlug}`;
      return;
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  const handleSlackVerify = () => {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/slack`;
    const state = encodeURIComponent(courseSlug);
    const scopes = 'identity.basic,identity.email,identity.team';
    const url = `https://slack.com/oauth/v2/authorize?user_scope=${scopes}&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href={`/courses/${courseSlug}`} className="text-brand-medium-brown hover:underline font-body text-sm mb-6 inline-block">
          &larr; Back to course
        </Link>

        <h1 className="text-3xl font-heading font-bold text-brand-dark-brown mb-8">
          {verifySlack ? 'Verify WBB Membership' : 'Enroll in Course'}
        </h1>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {verifySlack ? (
          <div className="space-y-6">
            <p className="text-brand-dark-gray font-body">
              WBB Slack members get this course for free. Click below to verify your membership via Slack.
            </p>
            <button
              onClick={handleSlackVerify}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#4A154B] text-white font-accent font-bold rounded-lg hover:bg-[#611f64] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Sign in with Slack
            </button>
            <p className="text-center text-sm text-brand-medium-gray font-body">
              Or <button onClick={handlePurchase} className="text-brand-medium-brown underline hover:no-underline">purchase the course</button> instead
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Redirecting to payment...' : 'Proceed to Payment'}
            </button>
            <p className="text-center text-sm text-brand-medium-gray font-body">
              WBB Slack member?{' '}
              <Link href={`/checkout/${courseSlug}?verify=slack`} className="text-brand-medium-brown underline hover:no-underline">
                Get it free
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
