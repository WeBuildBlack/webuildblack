import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-near-black text-white py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-brand-gold font-accent font-bold text-sm uppercase tracking-widest mb-4">
            Educate. Empower. Employ.
          </p>
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">
            Learn to Build the Future
          </h1>
          <p className="text-lg md:text-xl text-brand-light-gray max-w-2xl mx-auto mb-8 font-body">
            Hands-on technical courses from We Build Black. Master AI engineering, web development, and more — at your own pace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/courses" className="btn-primary text-lg px-8 py-4">
              Browse Courses
            </Link>
            <Link href="/auth/signup" className="btn-outline text-lg px-8 py-4">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 md:py-24 bg-brand-off-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center text-brand-dark-brown mb-12">
            Why Learn with WBB?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-brand-gold/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-medium-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-bold text-brand-dark-brown mb-2">Industry-Ready Skills</h3>
              <p className="text-brand-dark-gray font-body">
                Courses designed by engineers who&apos;ve worked at top companies. Learn what employers actually need.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-brand-gold/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-medium-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-bold text-brand-dark-brown mb-2">Community-Powered</h3>
              <p className="text-brand-dark-gray font-body">
                Join 2,000+ members on Slack. Get help, share wins, and connect with mentors who look like you.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-brand-gold/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-medium-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-bold text-brand-dark-brown mb-2">Free for Members</h3>
              <p className="text-brand-dark-gray font-body">
                WBB Slack members get every course for free. Just verify your membership and start learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Course */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand-dark-brown rounded-2xl overflow-hidden md:flex">
            <div className="p-8 md:p-12 md:flex-1">
              <span className="inline-block bg-brand-gold text-brand-near-black text-xs font-accent font-bold px-3 py-1 rounded-full mb-4">
                NEW COURSE
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                AI Engineering for Web Developers
              </h2>
              <p className="text-brand-light-gray font-body mb-6">
                Build real AI features with OpenAI, Claude, embeddings, RAG, and agents. 10 modules, 50 hours of hands-on learning — with a build project in every module.
              </p>
              <ul className="text-brand-warm-brown font-body space-y-2 mb-8">
                <li>&#10003; LLM APIs, prompt engineering, function calling</li>
                <li>&#10003; Embeddings, vector databases, RAG pipelines</li>
                <li>&#10003; AI agents and full-stack capstone project</li>
                <li>&#10003; Deployment, caching, safety, and monitoring</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <Link href="/courses/ai-engineering-for-web-devs" className="btn-primary">
                  View Course — $49
                </Link>
                <p className="text-brand-medium-gray text-sm mt-2 sm:mt-3">
                  Free for WBB Slack members
                </p>
              </div>
            </div>
            <div className="hidden md:flex md:w-80 bg-brand-dark-olive items-center justify-center p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">&#129302;</div>
                <p className="text-brand-warm-brown font-heading font-bold text-xl">10 Modules</p>
                <p className="text-brand-medium-gray font-body">~50 hours</p>
                <p className="text-brand-medium-gray font-body mt-1">Intermediate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-brand-medium-brown">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to Level Up?
          </h2>
          <p className="text-lg text-white/80 font-body mb-8">
            Create a free account and start learning today. WBB members unlock all courses at no cost.
          </p>
          <Link href="/auth/signup" className="inline-flex items-center justify-center px-8 py-4 bg-brand-gold text-brand-near-black font-accent font-bold rounded-lg hover:brightness-110 transition-all text-lg">
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
