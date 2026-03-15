import type { Metadata } from 'next';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'WBB Learn | We Build Black',
    template: '%s | WBB Learn',
  },
  description: 'Technical education courses by We Build Black. Empowering the Black community through hands-on learning in software engineering, AI, and web development.',
  openGraph: {
    type: 'website',
    siteName: 'WBB Learn',
    title: 'WBB Learn | We Build Black',
    description: 'Technical education courses by We Build Black.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
