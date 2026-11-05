import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://notionwell.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth', '/privacy', '/terms'],
        disallow: [
          '/api/',
          '/assistant',
          '/exam',
          '/review',
          '/study-paths',
          '/weak-topics',
          '/connections',
          '/viva',
          '/decks',
          '/create',
          '/planner',
          '/insights',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
