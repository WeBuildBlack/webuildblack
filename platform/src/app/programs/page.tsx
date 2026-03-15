import { getPrograms } from '@/lib/programs';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Programs',
  description: 'WBB community programs for career development and accountability.',
};

export default async function ProgramsPage() {
  const programs = await getPrograms();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-heading font-bold text-brand-dark-brown">
          Programs
        </h1>
        <p className="text-brand-dark-gray font-body mt-2 max-w-2xl">
          Structured programs for career development, interview prep, and technical growth.
          All programs are free for WBB Slack members.
        </p>
      </div>

      {programs.length === 0 ? (
        <div className="bg-brand-off-white rounded-xl p-8 text-center">
          <p className="text-brand-dark-gray font-body">
            No programs are currently available. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <Link
              key={program.slug}
              href={`/programs/${program.slug}`}
              className="border border-brand-light-gray rounded-xl p-6 bg-white hover:shadow-md transition-shadow"
            >
              <h2 className="font-heading font-bold text-brand-dark-brown text-lg mb-2">
                {program.name}
              </h2>
              <p className="text-sm text-brand-dark-gray font-body mb-4">
                {program.description}
              </p>
              <div className="flex items-center gap-3 text-xs font-accent mb-3">
                <span className="bg-brand-off-white text-brand-dark-gray px-2 py-1 rounded">
                  {program.duration_weeks} weeks
                </span>
                <span className="bg-brand-off-white text-brand-dark-gray px-2 py-1 rounded">
                  Free
                </span>
              </div>
              {program.currentCohort && (
                <div className="mt-3 pt-3 border-t border-brand-light-gray">
                  {program.currentCohort.status === 'open' ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-accent font-bold text-xs">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Registration Open
                      <span className="text-brand-medium-gray font-normal ml-1">
                        closes {new Date(program.currentCohort.application_close).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </span>
                  ) : program.currentCohort.status === 'in_progress' ? (
                    <span className="text-brand-medium-brown font-accent font-bold text-xs">
                      In Progress
                    </span>
                  ) : (
                    <span className="text-brand-medium-gray font-accent text-xs">
                      Next cohort: {new Date(program.currentCohort.application_open).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              )}
              <p className="text-brand-medium-brown font-accent font-bold text-sm mt-3">
                Learn More &rarr;
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
