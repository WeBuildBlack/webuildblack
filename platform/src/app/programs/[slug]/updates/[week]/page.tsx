'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function WeekDetailPage({ params }: { params: { slug: string; week: string } }) {
  const supabase = createClient();
  const weekNumber = parseInt(params.week);
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<any>(null);
  const [update, setUpdate] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: prog } = await supabase
      .from('programs')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();

    if (!prog) { setLoading(false); return; }
    setProgram(prog);

    // Find the registration + cohort
    const { data: regs } = await supabase
      .from('cohort_registrations')
      .select('*, cohorts!inner(*)')
      .eq('user_id', user.id)
      .eq('cohorts.program_id', prog.id)
      .in('status', ['registered', 'active', 'completed']);

    // Prefer in_progress cohort
    const reg = regs?.find((r: any) => r.cohorts?.status === 'in_progress') || regs?.[0];
    if (!reg) { setLoading(false); return; }

    const { data: weekUpdate } = await supabase
      .from('weekly_updates')
      .select('*')
      .eq('user_id', user.id)
      .eq('cohort_id', reg.cohort_id)
      .eq('week_number', weekNumber)
      .single();

    setUpdate(weekUpdate);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-brand-light-gray rounded w-1/4" />
          <div className="h-48 bg-brand-light-gray rounded" />
        </div>
      </div>
    );
  }

  if (!update || !program) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-heading font-bold text-brand-dark-brown mb-4">
          No Update Found
        </h1>
        <Link href={`/programs/${params.slug}/updates`} className="text-brand-medium-brown font-accent font-bold">
          &larr; Back to Updates
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href={`/programs/${params.slug}/updates`} className="text-brand-medium-brown font-accent font-bold text-sm mb-6 inline-block">
        &larr; All Updates
      </Link>

      <h1 className="text-2xl font-heading font-bold text-brand-dark-brown mb-2">
        Week {weekNumber} Update
      </h1>
      <p className="text-xs text-brand-medium-gray font-body mb-6">
        Submitted {new Date(update.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        {update.updated_at !== update.submitted_at && (
          <> (edited {new Date(update.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</>
        )}
      </p>

      <div className="border border-brand-light-gray rounded-xl p-6 bg-white space-y-4">
        {(program.update_fields || []).map((field: any) => {
          const value = update.data?.[field.key];
          if (value === undefined || value === null || value === '' || value === 0) return null;

          return (
            <div key={field.key}>
              <p className="text-xs text-brand-medium-gray font-accent uppercase tracking-wide mb-1">
                {field.label}
              </p>
              {field.type === 'checkbox' ? (
                <p className="text-brand-dark-brown font-body">
                  {value ? 'Yes' : 'No'}
                </p>
              ) : field.type === 'rating' ? (
                <div className="flex gap-1">
                  {Array.from({ length: field.max || 5 }, (_, i) => (
                    <span key={i} className={`w-6 h-6 rounded text-center text-sm leading-6 font-bold ${
                      i < value ? 'bg-brand-gold text-brand-dark-brown' : 'bg-brand-light-gray text-brand-medium-gray'
                    }`}>
                      {i + 1}
                    </span>
                  ))}
                </div>
              ) : field.type === 'textarea' ? (
                <p className="text-brand-dark-brown font-body text-sm whitespace-pre-wrap">
                  {value}
                </p>
              ) : (
                <p className="text-brand-dark-brown font-body font-bold">
                  {value}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
