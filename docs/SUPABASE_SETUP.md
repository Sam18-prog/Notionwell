# NOTIONWELL 2.0 — SUPABASE SETUP & CONFIGURATION GUIDE

**Document:** `docs/SUPABASE_SETUP.md`  
**System:** Notionwell — Turn Notes Into Knowledge  
**Phase:** Phase 2 — Supabase Backend and Authentication  
**Role:** Senior Next.js and Supabase Backend Architect  
**Date:** November 2026  

---

## 1. Overview

Notionwell 2.0 transforms the application from local browser storage into a multi-user, cloud-synchronized AI learning platform. The backend is built upon **Supabase** (PostgreSQL, Supabase Auth, Supabase Storage, and `pgvector`).

This document provides complete instructions to configure your Supabase project, execute database migrations, configure authentication, set up storage buckets, and deploy environment variables.

---

## 2. Supabase Dashboard Project Setup

1. **Create a Supabase Account & Project**:
   - Navigate to [https://supabase.com](https://supabase.com) and sign in.
   - Click **New Project**.
   - Choose your organization, project name (`Notionwell`), database password, and preferred region closest to your Vercel deployment (e.g. `US East (North Virginia)` or `EU West`).
   - Click **Create new project** and wait ~2 minutes for provisioning.

2. **Retrieve API Credentials**:
   - In the Supabase Dashboard, go to **Project Settings** (gear icon) $\to$ **API**.
   - Copy:
     - **Project URL** $\to$ `NEXT_PUBLIC_SUPABASE_URL`
     - **anon / public key** $\to$ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **service_role key** (secret) $\to$ `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

---

## 3. SQL Migrations Execution

The complete database schema, indexes, RLS policies, and storage rules are codified in:
`supabase/migrations/20261103000000_notionwell_initial_schema.sql`

### How to apply the migration:

#### Option A: Supabase Dashboard SQL Editor (Easiest)
1. In the Supabase Dashboard, click on **SQL Editor** in the left navigation.
2. Click **New Query**.
3. Copy the entire contents of [`supabase/migrations/20261103000000_notionwell_initial_schema.sql`](file:///c:/Users/deepak/OneDrive/Desktop/build_beyond_hackathon/supabase/migrations/20261103000000_notionwell_initial_schema.sql) and paste it into the editor.
4. Click **Run** (or `Cmd + Enter`).
5. Confirm that all 20 tables, extensions (`uuid-ossp`, `vector`), indexes, triggers, and RLS policies are created successfully.

#### Option B: Supabase CLI (Automated)
```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push migrations to remote database
npx supabase db push
```

---

## 4. 20-Table Database Architecture

All user-owned tables enforce `auth.uid() = user_id` Row Level Security:

| Table | Purpose | Primary Key | Key Relationships |
| :--- | :--- | :--- | :--- |
| `profiles` | Extended student profile | UUID | 1:1 with `auth.users(id)` |
| `subjects` | Subject folders (color, icon) | UUID | FK `profiles(id)` |
| `study_decks` | Master study deck containers | UUID | FK `profiles(id)`, FK `subjects(id)` |
| `deck_sources` | Ingested files/notes metadata | UUID | FK `study_decks(id)`, FK `profiles(id)` |
| `flashcards` | Flashcards with SM-2 metrics | UUID | FK `study_decks(id)`, FK `profiles(id)` |
| `quizzes` | Quiz headers | UUID | FK `study_decks(id)`, FK `profiles(id)` |
| `quiz_questions` | 4-option MCQs with explanations | UUID | FK `quizzes(id)`, FK `profiles(id)` |
| `quiz_attempts` | Full quiz attempt sessions | UUID | FK `quizzes(id)`, FK `profiles(id)` |
| `quiz_responses` | Granular question-level answers | UUID | FK `quiz_attempts(id)`, FK `quiz_questions(id)` |
| `study_sessions` | Flashcard study telemetry | UUID | FK `study_decks(id)`, FK `profiles(id)` |
| `study_time_logs` | Active stopwatch time logs | UUID | FK `profiles(id)` |
| `planner_tasks` | Calendar study tasks | UUID | FK `profiles(id)`, FK `subjects(id)`, FK `study_decks(id)` |
| `flashcard_reviews`| SM-2 review event history | UUID | FK `flashcards(id)`, FK `profiles(id)` |
| `achievements` | System achievement catalog | TEXT | Seeded: `first_step`, `quiz_whiz`, `study_marathon`, etc. |
| `user_achievements`| Unlocked student badges | UUID | FK `profiles(id)`, FK `achievements(id)` |
| `documents` | Private storage file records | UUID | FK `profiles(id)`, FK `study_decks(id)` |
| `document_chunks` | Semantic text chunks + pgvector | UUID | FK `documents(id)`, FK `profiles(id)` |
| `study_chat_sessions`| AI Tutor conversation sessions | UUID | FK `profiles(id)`, FK `study_decks(id)` |
| `study_chat_messages`| AI Tutor messages + citations | UUID | FK `study_chat_sessions(id)`, FK `profiles(id)` |
| `processing_jobs` | Async generation status jobs | UUID | FK `profiles(id)`, FK `study_decks(id)` |

---

## 5. Row Level Security (RLS) Verification

RLS is enabled on **all 20 tables**. The policies guarantee that:
- Users can only query rows where `auth.uid() = user_id`.
- Users cannot read or modify another user's decks, flashcards, or documents.
- The `storage.objects` bucket policy restricts file access to paths prefixed by the user's UUID: `(storage.foldername(name))[1] = auth.uid()::text`.

---

## 6. Authentication Configuration

1. **URL Configuration**:
   - Go to **Authentication** $\to$ **URL Configuration**.
   - Set **Site URL** to:
     - `http://localhost:3000` (for local development)
     - `https://notionwell.vercel.app` (for production)
   - Add to **Redirect URLs**:
     - `http://localhost:3000/api/auth/callback`
     - `https://notionwell.vercel.app/api/auth/callback`
     - `https://*-notionwell.vercel.app/api/auth/callback` (for Vercel preview deployments)

2. **Email Auth Provider**:
   - In **Authentication** $\to$ **Providers**, ensure **Email** is enabled.
   - For immediate testing, you may optionally toggle **Confirm email** off in development, or keep it on for production verification.

---

## 7. Storage Bucket Configuration

The migration automatically creates the private `documents` bucket. To verify in the Dashboard:
1. Go to **Storage** in the left menu.
2. Confirm the `documents` bucket exists and has **Public bucket** set to **OFF** (private).
3. Confirm the 3 storage policies (`documents_storage_user_upload`, `documents_storage_user_select`, `documents_storage_user_delete`) are active.

---

## 8. Non-Destructive LocalStorage Migration

Notionwell automatically detects existing study decks stored in the browser's `localStorage` when a user signs in to their Supabase account:
1. A sync banner (`components/MigrationBanner.tsx`) appears informing the student that local study decks were found.
2. Clicking **Sync to Cloud** sends the local subjects, decks, and tasks to `/api/sync/migrate-local`.
3. The server maps legacy IDs to new UUIDs, detects duplicates, and writes the data to Supabase.
4. Local data is **preserved** until cloud sync is verified.

---

## 9. Environment Variables Checklist

Add these variables to your Vercel Project Settings (**Settings** $\to$ **Environment Variables**) and local `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Provider Configuration
GEMINI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-2.5-flash

# Application URL
NEXT_PUBLIC_APP_URL=https://notionwell.vercel.app
```
