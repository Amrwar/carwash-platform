import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper';
import { I18nProvider } from '@/i18n/context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'Car Wash Manager',
  description: 'Track car wash entries, payments, and generate reports',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} antialiased min-h-screen bg-gray-50`}>
        <I18nProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </I18nProvider>
      </body>
    </html>
  );
}
