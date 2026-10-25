import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BadgeToast from '@/components/BadgeToast';

export const metadata: Metadata = {
  title: 'Notionwell — Intelligent Spaced Repetition & Quiz Assistant',
  description: 'AI-powered flashcard and quiz generator with SM-2 spaced repetition for effective learning.',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
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
      <body className="bg-[#F6F8FC] dark:bg-[#0B1220] text-[#0F172A] dark:text-[#F8FAFC] min-h-screen transition-colors duration-200">
        <div className="min-h-screen flex flex-col lg:flex-row">
          {/* REUSABLE COLLAPSIBLE SIDEBAR */}
          <Sidebar />

          {/* MAIN CONTENT AREA — SHIFTS DYNAMICALLY NEXT TO SIDEBAR */}
          <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>

            <footer className="border-t border-[#E2E8F0] dark:border-[#263449] py-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8] bg-[#F6F8FC] dark:bg-[#0B1220]">
              <p>Notionwell &copy; {new Date().getFullYear()} — Spaced Repetition & AI Quiz Assistant</p>
            </footer>
          </div>
        </div>

        {/* GLOBAL BADGE UNLOCK TOAST NOTIFICATION */}
        <BadgeToast />
      </body>
    </html>
  );
}
