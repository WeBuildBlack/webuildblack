'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-heading font-bold text-brand-dark-brown text-center mb-8">
          Welcome Back
        </h1>

        {/* Slack Login */}
        <button
          onClick={() => {
            const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
            const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/slack`;
            const scopes = 'identity.basic,identity.email,identity.team';
            const state = encodeURIComponent('login');
            window.location.href = `https://slack.com/oauth/v2/authorize?user_scope=${scopes}&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
          }}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#4A154B] text-white font-accent font-bold rounded-lg hover:bg-[#3a1139] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg"><path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/><path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/><path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/><path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/></svg>
          Sign in with Slack
        </button>
        <p className="text-center text-xs text-brand-medium-gray font-body">
          For WBB Slack members
        </p>

        <div className="flex items-center gap-4 my-2">
          <div className="flex-1 h-px bg-brand-light-gray"></div>
          <span className="text-sm text-brand-medium-gray font-body">or</span>
          <div className="flex-1 h-px bg-brand-light-gray"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-accent font-bold text-brand-dark-gray mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-brand-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-body"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-accent font-bold text-brand-dark-gray mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-brand-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold font-body"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-brand-dark-gray font-body mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-brand-medium-brown font-bold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
