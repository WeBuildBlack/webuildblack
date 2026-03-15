import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enrollment Confirmed',
};

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-6">&#127881;</div>
        <h1 className="text-3xl font-heading font-bold text-brand-dark-brown mb-4">
          You&apos;re In!
        </h1>
        <p className="text-brand-dark-gray font-body mb-8">
          Your enrollment is confirmed. Head to your dashboard to start learning.
        </p>
        <Link href="/dashboard" className="btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
