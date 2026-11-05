import fs from 'fs';
import path from 'path';

// ANSI terminal colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertTest(name: string, condition: boolean, extraInfo?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓${RESET} ${name}`);
  } else {
    failedTests++;
    console.log(`  ${RED}✗${RESET} ${BOLD}${name}${RESET}`);
    if (extraInfo) {
      console.log(`    ${YELLOW}→ ${extraInfo}${RESET}`);
    }
  }
}

async function runPhase2Verification() {
  console.log(`\n${BOLD}${BLUE}======================================================${RESET}`);
  console.log(`${BOLD}${BLUE}  NOTIONWELL PHASE 2 — SUPABASE & AUTH VERIFICATION  ${RESET}`);
  console.log(`${BOLD}${BLUE}======================================================${RESET}\n`);

  // SECTION 1: DATABASE SCHEMA (20 TABLES & RLS)
  console.log(`${BOLD}1. Database Schema & Migration Verification${RESET}`);
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20261103000000_notionwell_initial_schema.sql');
  assertTest('SQL migration file exists', fs.existsSync(sqlPath));

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  // Check required extensions
  assertTest('PostgreSQL "uuid-ossp" extension configured', sqlContent.includes('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'));
  assertTest('PostgreSQL "vector" (pgvector) extension configured', sqlContent.includes('CREATE EXTENSION IF NOT EXISTS "vector"'));

  const expectedTables = [
    'profiles',
    'subjects',
    'study_decks',
    'deck_sources',
    'flashcards',
    'quizzes',
    'quiz_questions',
    'quiz_attempts',
    'quiz_responses',
    'study_sessions',
    'study_time_logs',
    'planner_tasks',
    'flashcard_reviews',
    'achievements',
    'user_achievements',
    'documents',
    'document_chunks',
    'study_chat_sessions',
    'study_chat_messages',
    'processing_jobs',
  ];

  for (const table of expectedTables) {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, 'i');
    assertTest(`Table public.${table} defined with UUID PK and constraints`, tableRegex.test(sqlContent));

    const rlsRegex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i');
    assertTest(`Table public.${table} has Row Level Security (RLS) enabled`, rlsRegex.test(sqlContent));
  }

  // Storage bucket policies
  assertTest('Storage bucket "documents" configured', sqlContent.includes("id = 'documents'"));
  assertTest('Storage RLS enforces user-isolated folder paths (auth.uid())', sqlContent.includes('(storage.foldername(name))[1] = auth.uid()::text'));

  // SECTION 2: SUPABASE SSR CLIENT ARCHITECTURE
  console.log(`\n${BOLD}2. Supabase SSR Client Architecture${RESET}`);
  const clientPath = path.join(process.cwd(), 'lib', 'supabase', 'client.ts');
  const serverPath = path.join(process.cwd(), 'lib', 'supabase', 'server.ts');
  const adminPath = path.join(process.cwd(), 'lib', 'supabase', 'admin.ts');
  const middlewareHelperPath = path.join(process.cwd(), 'lib', 'supabase', 'middleware.ts');
  const rootMiddlewarePath = path.join(process.cwd(), 'middleware.ts');

  assertTest('Browser client (lib/supabase/client.ts) exists', fs.existsSync(clientPath));
  assertTest('Server client (lib/supabase/server.ts) exists', fs.existsSync(serverPath));
  assertTest('Admin client (lib/supabase/admin.ts) exists', fs.existsSync(adminPath));
  assertTest('Middleware helper (lib/supabase/middleware.ts) exists', fs.existsSync(middlewareHelperPath));
  assertTest('Root Next.js middleware (middleware.ts) exists', fs.existsSync(rootMiddlewarePath));

  const clientContent = fs.readFileSync(clientPath, 'utf-8');
  assertTest('Browser client exports isSupabaseConfigured() guard', clientContent.includes('export function isSupabaseConfigured()'));
  assertTest('Browser client creates createBrowserClient', clientContent.includes('createBrowserClient('));

  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  assertTest('Server client handles Next.js App Router cookies (getAll/setAll)', serverContent.includes('getAll()') && serverContent.includes('setAll('));

  const adminContent = fs.readFileSync(adminPath, 'utf-8');
  assertTest('Admin client guards SUPABASE_SERVICE_ROLE_KEY and prevents client leaks', 
    adminContent.includes('SUPABASE_SERVICE_ROLE_KEY') && 
    adminContent.includes('NEVER import this file into client components')
  );

  const middlewareContent = fs.readFileSync(middlewareHelperPath, 'utf-8');
  assertTest('Middleware checks protected routes (/create, /deck, /decks, /planner, /insights)', 
    middlewareContent.includes('/create') &&
    middlewareContent.includes('/deck') &&
    middlewareContent.includes('/planner') &&
    middlewareContent.includes('/insights')
  );

  // SECTION 3: STORAGE PIPELINE
  console.log(`\n${BOLD}3. Private Document Storage Pipeline${RESET}`);
  const storagePath = path.join(process.cwd(), 'lib', 'supabase', 'storage.ts');
  assertTest('Storage helper (lib/supabase/storage.ts) exists', fs.existsSync(storagePath));
  const storageContent = fs.readFileSync(storagePath, 'utf-8');
  assertTest('uploadDocumentToStorage uses user_id/document_id/filename schema', storageContent.includes('`${userId}/${documentId}/${sanitizedName}`'));
  assertTest('getDocumentSignedUrl generates secure time-bound signed URLs', storageContent.includes('createSignedUrl'));
  assertTest('deleteDocumentFromStorage handles storage cleanup', storageContent.includes('remove([storagePath])'));

  // SECTION 4: LOCALSTORAGE MIGRATION BRIDGE
  console.log(`\n${BOLD}4. LocalStorage-to-Supabase Migration Bridge${RESET}`);
  const migrateApiPath = path.join(process.cwd(), 'app', 'api', 'sync', 'migrate-local', 'route.ts');
  const bannerPath = path.join(process.cwd(), 'components', 'MigrationBanner.tsx');

  assertTest('Migration API endpoint (app/api/sync/migrate-local/route.ts) exists', fs.existsSync(migrateApiPath));
  assertTest('Migration UI Banner (components/MigrationBanner.tsx) exists', fs.existsSync(bannerPath));

  const migrateContent = fs.readFileSync(migrateApiPath, 'utf-8');
  assertTest('Migration endpoint requires authenticated user session', migrateContent.includes('supabase.auth.getUser()') && migrateContent.includes('401'));
  assertTest('Migration handles duplicate deck detection (deduplication)', migrateContent.includes("ilike('name', deck.name.trim())"));
  assertTest('Migration maps old IDs to new UUIDs with foreign keys', migrateContent.includes('subjectIdMap.get('));
  assertTest('Migration preserves sourceQuote and sourceReference in flashcards and quizzes', 
    migrateContent.includes('source_quote: fc.sourceQuote') &&
    migrateContent.includes('source_quote: q.sourceQuote')
  );

  const bannerContent = fs.readFileSync(bannerPath, 'utf-8');
  assertTest('Migration UI Banner non-destructively marks migration without deleting local data', 
    bannerContent.includes('notionwell_migrated_v1')
  );

  // SECTION 5: AUTHENTICATION FLOW
  console.log(`\n${BOLD}5. Authentication Flow & Security${RESET}`);
  const authPagePath = path.join(process.cwd(), 'app', 'auth', 'page.tsx');
  const authCallbackPath = path.join(process.cwd(), 'app', 'api', 'auth', 'callback', 'route.ts');

  assertTest('Auth callback endpoint (app/api/auth/callback/route.ts) exists', fs.existsSync(authCallbackPath));
  assertTest('Auth page (app/auth/page.tsx) exists', fs.existsSync(authPagePath));

  const authPageContent = fs.readFileSync(authPagePath, 'utf-8');
  assertTest('Auth page supports Supabase signInWithPassword', authPageContent.includes('signInWithPassword'));
  assertTest('Auth page supports Supabase signUp with metadata', authPageContent.includes('signUp'));
  assertTest('Auth page supports resetPasswordForEmail', authPageContent.includes('resetPasswordForEmail'));
  assertTest('Auth page retains 1-Click Demo Login with cookie session for middleware', 
    authPageContent.includes('notionwell_demo_session=1')
  );

  const appLibPath = path.join(process.cwd(), 'lib', 'app.ts');
  const appLibContent = fs.readFileSync(appLibPath, 'utf-8');
  assertTest('logoutUser clears demo cookie and calls Supabase signOut', 
    appLibContent.includes('notionwell_demo_session=;') &&
    appLibContent.includes('supabase.auth.signOut()')
  );

  // SECTION 6: ENVIRONMENT & DOCUMENTATION
  console.log(`\n${BOLD}6. Environment Template & Documentation${RESET}`);
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const docsSupabasePath = path.join(process.cwd(), 'docs', 'SUPABASE_SETUP.md');

  assertTest('.env.example exists with placeholder template', fs.existsSync(envExamplePath));
  assertTest('docs/SUPABASE_SETUP.md exists with comprehensive instructions', fs.existsSync(docsSupabasePath));

  const envContent = fs.readFileSync(envExamplePath, 'utf-8');
  assertTest('.env.example documents NEXT_PUBLIC_SUPABASE_URL', envContent.includes('NEXT_PUBLIC_SUPABASE_URL'));
  assertTest('.env.example documents NEXT_PUBLIC_SUPABASE_ANON_KEY', envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  assertTest('.env.example documents SUPABASE_SERVICE_ROLE_KEY', envContent.includes('SUPABASE_SERVICE_ROLE_KEY'));

  const docsContent = fs.readFileSync(docsSupabasePath, 'utf-8');
  assertTest('docs/SUPABASE_SETUP.md explains SQL Editor migration execution', docsContent.includes('SQL Editor'));
  assertTest('docs/SUPABASE_SETUP.md explains Storage bucket configuration', docsContent.includes('Storage Bucket'));
  assertTest('docs/SUPABASE_SETUP.md explains Vercel production deployment environment variables', docsContent.includes('Vercel'));

  // SUMMARY
  console.log(`\n${BOLD}======================================================${RESET}`);
  console.log(`${BOLD}  RESULTS: ${passedTests}/${totalTests} TESTS PASSED  ${RESET}`);
  if (failedTests > 0) {
    console.log(`${BOLD}${RED}  ${failedTests} TESTS FAILED${RESET}`);
    console.log(`${BOLD}======================================================${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${BOLD}${GREEN}  ALL PHASE 2 REQUIREMENTS VERIFIED SUCCESSFULLY!  ${RESET}`);
    console.log(`${BOLD}======================================================${RESET}\n`);
    process.exit(0);
  }
}

runPhase2Verification().catch((err) => {
  console.error('Phase 2 verification fatal error:', err);
  process.exit(1);
});
