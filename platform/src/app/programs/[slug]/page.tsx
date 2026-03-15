'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

interface Program {
  id: string;
  slug: string;
  name: string;
  description: string;
  duration_weeks: number;
  capacity_per_cohort: number;
  schedule: any;
  registration_fields: any[];
  update_fields: any[];
}

interface Cohort {
  id: string;
  slug: string;
  name: string;
  start_date: string;
  end_date: string;
  application_open: string;
  application_close: string;
  capacity: number;
  status: string;
  registration_count?: number;
}

interface Registration {
  id: string;
  cohort_id: string;
  pod: string | null;
  registration_data: any;
  status: string;
}

export default function ProgramDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(prof);
    }

    // Get program
    const { data: prog } = await supabase
      .from('programs')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();

    if (!prog) {
      setLoading(false);
      return;
    }
    setProgram(prog);

    // Get cohorts
    const { data: cohortData } = await supabase
      .from('cohorts')
      .select('*')
      .eq('program_id', prog.id)
      .neq('status', 'completed')
      .order('start_date', { ascending: true });

    // Get registration counts
    const cohortsWithCounts: Cohort[] = [];
    for (const c of cohortData || []) {
      const { count } = await supabase
        .from('cohort_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('cohort_id', c.id)
        .neq('status', 'withdrawn');
      cohortsWithCounts.push({ ...c, registration_count: count || 0 });
    }
    setCohorts(cohortsWithCounts);

    // Check registration
    if (user && cohortData && cohortData.length > 0) {
      const { data: reg } = await supabase
        .from('cohort_registrations')
        .select('*')
        .eq('user_id', user.id)
        .in('cohort_id', cohortData.map((c: any) => c.id))
        .neq('status', 'withdrawn')
        .limit(1)
        .single();

      if (reg) setRegistration(reg);
    }

    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await fetch(`/api/programs/${params.slug}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_data: formData }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setSubmitting(false);
      return;
    }

    setSuccess(`Registered for ${data.cohort.name}! The cohort kicks off ${new Date(data.cohort.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`);
    setRegistration(data.registration);
    setSubmitting(false);
  }

  const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || ''}&user_scope=identity.basic,identity.email,identity.team&redirect_uri=${encodeURIComponent((process.env.NEXT_PUBLIC_APP_URL || '') + '/api/auth/slack')}&state=program-register:${params.slug}`;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-light-gray rounded w-1/3" />
          <div className="h-4 bg-brand-light-gray rounded w-2/3" />
          <div className="h-64 bg-brand-light-gray rounded" />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-heading font-bold text-brand-dark-brown mb-4">
          Program Not Found
        </h1>
        <Link href="/programs" className="text-brand-medium-brown font-accent font-bold">
          &larr; Back to Programs
        </Link>
      </div>
    );
  }

  const openCohort = cohorts.find((c) => c.status === 'open');
  const inProgressCohort = cohorts.find((c) => c.status === 'in_progress');
  const activeCohort = openCohort || inProgressCohort || cohorts[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/programs" className="text-brand-medium-brown font-accent font-bold text-sm mb-6 inline-block">
        &larr; All Programs
      </Link>

      <h1 className="text-3xl font-heading font-bold text-brand-dark-brown mb-3">
        {program.name}
      </h1>
      <p className="text-brand-dark-gray font-body mb-6 text-lg">
        {program.description}
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <span className="bg-brand-off-white text-brand-dark-gray font-accent text-sm px-3 py-1 rounded">
          {program.duration_weeks} weeks
        </span>
        <span className="bg-brand-off-white text-brand-dark-gray font-accent text-sm px-3 py-1 rounded">
          Free for WBB members
        </span>
        {program.capacity_per_cohort && (
          <span className="bg-brand-off-white text-brand-dark-gray font-accent text-sm px-3 py-1 rounded">
            {program.capacity_per_cohort} spots per cohort
          </span>
        )}
      </div>

      {/* Cohort Info */}
      {activeCohort && (
        <div className="bg-brand-off-white rounded-xl p-6 mb-8">
          <h2 className="font-heading font-bold text-brand-dark-brown mb-3">
            {activeCohort.name}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-body">
            <div>
              <p className="text-brand-medium-gray">Registration</p>
              <p className="text-brand-dark-brown font-bold">
                {new Date(activeCohort.application_open).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &ndash; {new Date(activeCohort.application_close).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-brand-medium-gray">Kickoff</p>
              <p className="text-brand-dark-brown font-bold">
                {new Date(activeCohort.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-brand-medium-gray">Status</p>
              <p className="font-bold">
                {activeCohort.status === 'open' ? (
                  <span className="text-green-700">Registration Open</span>
                ) : activeCohort.status === 'in_progress' ? (
                  <span className="text-brand-medium-brown">In Progress</span>
                ) : (
                  <span className="text-brand-medium-gray">Upcoming</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-brand-medium-gray">Spots</p>
              <p className="text-brand-dark-brown font-bold">
                {activeCohort.registration_count !== undefined
                  ? `${activeCohort.registration_count} / ${activeCohort.capacity}`
                  : activeCohort.capacity}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Registration / Status */}
      {registration ? (
        <div className="border-2 border-green-200 bg-green-50 rounded-xl p-6 mb-8">
          <h2 className="font-heading font-bold text-green-800 mb-2">
            You're Registered
          </h2>
          {registration.pod && (
            <p className="text-green-700 font-body text-sm mb-1">
              Pod: <span className="font-bold">{registration.pod}</span>
            </p>
          )}
          <p className="text-green-700 font-body text-sm mb-4">
            Status: <span className="font-bold capitalize">{registration.status}</span>
          </p>
          {(registration.status === 'active' && inProgressCohort) && (
            <Link
              href={`/programs/${params.slug}/updates`}
              className="btn-primary text-sm"
            >
              Submit Weekly Update
            </Link>
          )}
        </div>
      ) : openCohort ? (
        <div className="border border-brand-light-gray rounded-xl p-6 mb-8">
          <h2 className="font-heading font-bold text-brand-dark-brown mb-4">
            Register for {openCohort.name}
          </h2>

          {!user ? (
            <div className="text-center py-4">
              <p className="text-brand-dark-gray font-body mb-4">
                Sign in with your WBB Slack account to register.
              </p>
              <a
                href={slackOAuthUrl}
                className="inline-flex items-center gap-2 bg-[#4A154B] text-white font-accent font-bold px-6 py-3 rounded-lg hover:bg-[#3a1039] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.124a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.522h-6.313z"/>
                </svg>
                Sign in with Slack
              </a>
            </div>
          ) : !profile?.is_wbb_member ? (
            <div className="text-center py-4">
              <p className="text-brand-dark-gray font-body mb-4">
                Programs are available to WBB Slack members. Connect your Slack account to verify membership.
              </p>
              <a
                href={slackOAuthUrl}
                className="inline-flex items-center gap-2 bg-[#4A154B] text-white font-accent font-bold px-6 py-3 rounded-lg hover:bg-[#3a1039] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.124a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.522h-6.313z"/>
                </svg>
                Verify WBB Membership
              </a>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-body">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm font-body">
                  {success}
                </div>
              )}
              {!success && (
                <form onSubmit={handleRegister} className="space-y-4">
                  {program.registration_fields.map((field: any) => (
                    <div key={field.key}>
                      <label className="block text-sm font-accent font-bold text-brand-dark-brown mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          required={field.required}
                          className="w-full border border-brand-light-gray rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map((opt: any) => {
                            const value = typeof opt === 'string' ? opt : opt.value;
                            const label = typeof opt === 'string' ? opt : opt.label;
                            return (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          required={field.required}
                          rows={3}
                          className="w-full border border-brand-light-gray rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        />
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          required={field.required}
                          className="w-full border border-brand-light-gray rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        />
                      )}
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Registering...' : 'Register'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Schedule Info */}
      {program.schedule?.cadence && (
        <div className="mb-8">
          <h2 className="font-heading font-bold text-brand-dark-brown mb-3">
            Cohort Schedule
          </h2>
          <p className="text-brand-dark-gray font-body text-sm mb-3">
            {program.name} runs {program.schedule.cadence.length}x per year:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {program.schedule.cadence.map((entry: any) => (
              <div key={entry.season} className="bg-brand-off-white rounded-lg p-4">
                <p className="font-accent font-bold text-brand-dark-brown capitalize">
                  {entry.season}
                </p>
                <p className="text-sm text-brand-medium-gray font-body">
                  Kickoff: {entry.kickoff}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
