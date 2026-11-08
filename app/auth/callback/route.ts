import { GET as apiGet } from '@/app/api/auth/callback/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return apiGet(request);
}
