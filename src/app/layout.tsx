import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const outfit = Outfit({
  variable: '--font-display',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ApexCRM | Premium Lead Management & Facebook Lead Ads Sync',
  description: 'Automate your Facebook Lead Ads capture, pipeline routing, round-robin assignments, and follow-up reminders in one premium SaaS dashboard.',
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full font-sans antialiased bg-brand-bg text-brand-dark">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
