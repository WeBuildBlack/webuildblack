'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header className="bg-brand-near-black sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg viewBox="0 0 40 40" className="w-8 h-8" aria-hidden="true">
              <polygon points="20,2 38,20 20,38 2,20" fill="#7D4E21" />
              <polygon points="20,6 34,20 20,34 6,20" fill="#AE8156" />
              <polygon points="20,10 30,20 20,30 10,20" fill="#2C170B" />
            </svg>
            <span className="text-white font-heading font-bold text-lg">
              WBB <span className="text-brand-gold">Learn</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/courses" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body">
              Courses
            </Link>
            <Link href="/programs" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body">
              Programs
            </Link>
            <a href="https://webuildblack.com" target="_blank" rel="noopener noreferrer" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body">
              WBB Home
            </a>
            {user ? (
              <>
                <Link href="/dashboard" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body">
                  Dashboard
                </Link>
                <button onClick={handleSignOut} className="text-brand-light-gray hover:text-brand-gold transition-colors font-body">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body">
                  Log In
                </Link>
                <Link href="/auth/signup" className="btn-primary text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-brand-dark-gray">
            <div className="flex flex-col gap-3 pt-4">
              <Link href="/courses" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body px-2" onClick={() => setMenuOpen(false)}>
                Courses
              </Link>
              <Link href="/programs" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body px-2" onClick={() => setMenuOpen(false)}>
                Programs
              </Link>
              <a href="https://webuildblack.com" target="_blank" rel="noopener noreferrer" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body px-2">
                WBB Home
              </a>
              {user ? (
                <>
                  <Link href="/dashboard" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body px-2" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={handleSignOut} className="text-left text-brand-light-gray hover:text-brand-gold transition-colors font-body px-2">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="text-brand-light-gray hover:text-brand-gold transition-colors font-body px-2" onClick={() => setMenuOpen(false)}>
                    Log In
                  </Link>
                  <Link href="/auth/signup" className="btn-primary text-sm mx-2 text-center" onClick={() => setMenuOpen(false)}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
