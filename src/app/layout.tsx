import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/layout/Layout';

export const metadata: Metadata = {
  title: 'CycleTrack',
  description: 'Privater Zyklus-Tracker',
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Prevent zooming usually for PWA feel
  },
  themeColor: '#FF6B9D',
};

import { Toaster } from 'sonner';
import UpdateNotification from '@/components/UpdateNotification';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <UpdateNotification />
        <Toaster position="top-center" />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
