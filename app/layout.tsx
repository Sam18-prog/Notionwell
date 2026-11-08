import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import BadgeToast from '@/components/BadgeToast';
import SupabaseAuthSync from '@/components/SupabaseAuthSync';

const inter = { variable: '--font-sans' };
const outfit = { variable: '--font-heading' };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://notionwell.vercel.app'),
  title: {
    default: 'Notionwell — From Notes to Knowledge | AI Study Platform',
    template: '%s | Notionwell',
  },
  description: 'AI-powered learning platform with multimodal document extraction, pgvector RAG study assistant, SM-2 spaced repetition, realistic exam simulation, and viva voce preparation.',
  keywords: [
    'AI study assistant',
    'spaced repetition',
    'SM-2 flashcards',
    'RAG learning',
    'exam simulator',
    'viva voce practice',
    'active recall',
    'college study tool',
  ],
  authors: [{ name: 'Notionwell Team' }],
  creator: 'Notionwell',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://notionwell.vercel.app',
    title: 'Notionwell — From Notes to Knowledge',
    description: 'Transform lecture notes and textbooks into interactive flashcards, practice quizzes, AI exams, and oral viva prep with grounded citations.',
    siteName: 'Notionwell',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Notionwell Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Notionwell — From Notes to Knowledge',
    description: 'AI-powered study platform with RAG assistant, exam simulation, and SM-2 spaced repetition.',
    images: ['/logo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('notionwell_theme_v1') || localStorage.getItem('studypack_theme_v1');
                  if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-[#F6F8FC] dark:bg-[#0B1220] text-[#0F172A] dark:text-[#F8FAFC] min-h-screen transition-colors duration-200`}>
        <SupabaseAuthSync />
        <AppShell>{children}</AppShell>

        {/* GLOBAL BADGE UNLOCK TOAST NOTIFICATION */}
        <BadgeToast />
      </body>
    </html>
  );
}
