'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function WeeklyUpdatesPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [program, setProgram] = useState<any>(null);
  const [cohort, setCohort] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get program
    const { data: prog } = await supabase
      .from('programs')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();

    if (!prog) { setLoading(false); return; }
    setProgram(prog);

    // Get user's active registration with cohort
    const { data: regs } = await supabase
      .from('cohort_registrations')
      .select('*, cohorts!inner(*)')
      .eq('user_id', user.id)
      .eq('cohorts.program_id', prog.id)
      .in('status', ['registered', 'active']);

    // Prefer registration for in_progress cohort
    const reg = regs?.find((r: any) => r.cohorts?.status === 'in_progress') || regs?.[0];
    if (!reg) { setLoading(false); return; }

    setRegistration(reg);
    setCohort(reg.cohorts);

    // Calculate current week
    const start = new Date(reg.cohorts.start_date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.max(0, Math.min(Math.floor(diffDays / 7), prog.duration_weeks));
    setCurrentWeek(week);

    // Get updates
    const { data: existingUpdates } = await supabase
      .from('weekly_updates')
      .select('*')
      .eq('user_id', user.id)
      .eq('cohort_id', reg.cohort_id)
      .order('week_number', { ascending: true });

    setUpdates(existingUpdates || []);

    // Pre-fill form if current week already has data
    const currentUpdate = (existingUpdates || []).find((u: any) => u.week_number === week);
    if (currentUpdate) {
      setFormData(currentUpdate.data || {});
    } else {
      // Set defaults from update_fields
      const defaults: Record<string, any> = {};
      for (const field of prog.update_fields || []) {
        if (field.default !== undefined) {
          defaults[field.key] = field.default;
        }
      }
      setFormData(defaults);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const res = await fetch(`/api/programs/${params.slug}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_number: currentWeek, data: formData }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setSuccess('Weekly update saved!');
    // Update local state
    const existing = updates.findIndex((u) => u.week_number === currentWeek);
    if (existing >= 0) {
      const updated = [...updates];
      updated[existing] = result.update;
      setUpdates(updated);
    } else {
      setUpdates([...updates, result.update]);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-light-gray rounded w-1/3" />
          <div className="h-64 bg-brand-light-gray rounded" />
        </div>
      </div>
    );
  }

  if (!program || !registration || !cohort) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-heading font-bold text-brand-dark-brown mb-4">
          No Active Registration
        </h1>
        <p className="text-brand-dark-gray font-body mb-4">
          You need an active registration for an in-progress cohort to submit weekly updates.
        </p>
        <Link href={`/programs/${params.slug}`} className="text-brand-medium-brown font-accent font-bold">
          &larr; Back to Program
        </Link>
      </div>
    );
  }

  const weeksLogged = updates.length;
  const podMeetingsAttended = updates.filter((u) => u.data?.pod_meeting_attended).length;
  const hasCurrentWeekUpdate = updates.some((u) => u.week_number === currentWeek);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href={`/programs/${params.slug}`} className="text-brand-medium-brown font-accent font-bold text-sm mb-6 inline-block">
        &larr; {program.name}
      </Link>

      <h1 className="text-2xl font-heading font-bold text-brand-dark-brown mb-2">
        Weekly Updates
      </h1>
      <p className="text-brand-dark-gray font-body text-sm mb-6">
        {cohort.name}
        {registration.pod && <> &middot; Pod: <span className="font-bold">{registration.pod}</span></>}
      </p>

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-brand-off-white rounded-lg p-4 text-center">
          <p className="text-2xl font-heading font-bold text-brand-dark-brown">{weeksLogged}</p>
          <p className="text-xs text-brand-medium-gray font-body">/ {program.duration_weeks} weeks logged</p>
        </div>
        <div className="bg-brand-off-white rounded-lg p-4 text-center">
          <p className="text-2xl font-heading font-bold text-brand-dark-brown">{podMeetingsAttended}</p>
          <p className="text-xs text-brand-medium-gray font-body">pod meetings attended</p>
        </div>
        <div className="bg-brand-off-white rounded-lg p-4 text-center">
          <p className="text-2xl font-heading font-bold text-brand-dark-brown">Week {currentWeek}</p>
          <p className="text-xs text-brand-medium-gray font-body">current week</p>
        </div>
      </div>

      {/* Current Week Form */}
      {cohort.status === 'in_progress' && (
        <div className="border border-brand-light-gray rounded-xl p-6 mb-8 bg-white">
          <h2 className="font-heading font-bold text-brand-dark-brown mb-1">
            Week {currentWeek} Update
          </h2>
          <p className="text-xs text-brand-medium-gray font-body mb-4">
            {hasCurrentWeekUpdate ? 'Edit your submission' : 'Log your progress for this week'}
          </p>

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

          <form onSubmit={handleSubmit} className="space-y-4">
            {(program.update_fields || []).map((field: any) => (
              <div key={field.key}>
                <label className="block text-sm font-accent font-bold text-brand-dark-brown mb-1">
                  {field.label}
                </label>
                {field.type === 'number' ? (
                  <input
                    type="number"
                    min={field.min || 0}
                    value={formData[field.key] ?? field.default ?? 0}
                    onChange={(e) => setFormData({ ...formData, [field.key]: parseInt(e.target.value) || 0 })}
                    className="w-full border border-brand-light-gray rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  />
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData[field.key] || false}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                      className="w-4 h-4 text-brand-gold rounded focus:ring-brand-gold"
                    />
                    <span className="text-sm text-brand-dark-gray font-body">Yes</span>
                  </label>
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full border border-brand-light-gray rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  >
                    <option value="">Select...</option>
                    {(field.options || []).map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'rating' ? (
                  <div className="flex gap-2">
                    {Array.from({ length: (field.max || 5) - (field.min || 1) + 1 }, (_, i) => (field.min || 1) + i).map((val: number) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, [field.key]: val })}
                        className={`w-10 h-10 rounded-lg font-accent font-bold text-sm transition-colors ${
                          formData[field.key] === val
                            ? 'bg-brand-gold text-brand-dark-brown'
                            : 'bg-brand-off-white text-brand-medium-gray hover:bg-brand-light-gray'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    rows={3}
                    className="w-full border border-brand-light-gray rounded-lg px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
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
              {submitting ? 'Saving...' : hasCurrentWeekUpdate ? 'Update' : 'Submit'}
            </button>
          </form>
        </div>
      )}

      {/* Timeline of past updates */}
      {updates.length > 0 && (
        <div>
          <h2 className="font-heading font-bold text-brand-dark-brown mb-4">
            Update History
          </h2>
          <div className="space-y-3">
            {[...updates].reverse().map((update) => (
              <Link
                key={update.id}
                href={`/programs/${params.slug}/updates/${update.week_number}`}
                className="block border border-brand-light-gray rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="font-accent font-bold text-brand-dark-brown text-sm">
                    Week {update.week_number}
                  </span>
                  <span className="text-xs text-brand-medium-gray font-body">
                    {new Date(update.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-brand-dark-gray font-body">
                  {update.data?.dsa_problems > 0 && <span>{update.data.dsa_problems} DSA</span>}
                  {update.data?.applications_sent > 0 && <span>{update.data.applications_sent} apps</span>}
                  {update.data?.mock_interviews > 0 && <span>{update.data.mock_interviews} mocks</span>}
                  {update.data?.confidence && <span>Confidence: {update.data.confidence}/5</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
