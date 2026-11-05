# Notionwell — Database Backup, PITR & Disaster Recovery Manual

## 1. Architectural Overview

Notionwell uses **Supabase PostgreSQL** as its authoritative cloud database, utilizing:
- **`pgvector`** for 768-dimensional semantic embeddings.
- **PostgreSQL Row Level Security (RLS)** for multi-tenant isolation.
- **Relational Integrity with Cascade Deletion** (`ON DELETE CASCADE` from `public.profiles(id)`).

---

## 2. Supabase Automated Backups

### 2.1 Daily Physical Snapshots
- Supabase automatically performs daily physical base snapshots for all managed database instances.
- Snapshots include all tables, schema definitions, indexes, extensions (`pgvector`, `uuid-ossp`), and data.
- Daily snapshots are stored encrypted at rest across multiple availability zones.

### 2.2 Point-In-Time Recovery (PITR)
For production deployments, Point-in-Time Recovery must be enabled in the Supabase Dashboard:
1. Navigate to **Database** -> **Backups** -> **Point in Time**.
2. Select **Enable PITR** (7-day or 30-day continuous WAL archiving).
3. Continuous Write-Ahead Logs (WAL) are streamed to secure object storage, enabling recovery to any specific second ($T_{restore}$) in the event of accidental data corruption or logical failure.

---

## 3. Manual Logical Backups (CLI / Runbook)

To take an immediate on-demand logical backup prior to running major schema migrations:

### Exporting Schema & Data:
```bash
# Set your Supabase DB Connection String (obtained from Dashboard -> Settings -> Database)
export DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Dump entire schema and data (compressed format)
pg_dump "$DATABASE_URL" \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges \
  --file="notionwell_backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Exporting Specific Subsystems:
```bash
# Dump flashcards, decks and study records
pg_dump "$DATABASE_URL" --table=public.decks --table=public.flashcards --table=public.flashcard_reviews > decks_backup.sql

# Dump documents and vector chunks
pg_dump "$DATABASE_URL" --table=public.documents --table=public.document_chunks > documents_backup.sql
```

---

## 4. Disaster Recovery & Restoration Procedures

### Scenario A: Restoring from a Point-In-Time (PITR)
1. Open **Supabase Dashboard** -> **Database** -> **Backups**.
2. Click **Restore from a point in time**.
3. Select the exact date and timestamp immediately preceding the disaster event.
4. Confirm project restoration. A clone will be provisioned or the primary database restored within 10–25 minutes.

### Scenario B: Restoring from a Logical SQL Dump
```bash
# Terminate existing connections and restore dump
psql "$DATABASE_URL" < "notionwell_backup_20261105.sql"
```

---

## 5. Migration Execution & Rollback Strategy

All migrations are tracked under `supabase/migrations/`:
- `20261105000000_production_hardening_and_indexes.sql`

### Rollback Runbook:
If a migration introduces performance degradation or syntax regression:
```sql
-- Drop indexes created in 20261105000000
DROP INDEX IF EXISTS public.idx_documents_user_id;
DROP INDEX IF EXISTS public.idx_documents_deck_id;
DROP INDEX IF EXISTS public.idx_document_chunks_document_id;
DROP INDEX IF EXISTS public.idx_document_chunks_user_id;
DROP INDEX IF EXISTS public.idx_exams_user_id;
DROP INDEX IF EXISTS public.idx_exam_attempts_user_id;
DROP INDEX IF EXISTS public.idx_exam_attempts_created_at;
DROP INDEX IF EXISTS public.idx_study_chat_messages_user_id;
DROP INDEX IF EXISTS public.idx_flashcard_reviews_user_card;
DROP INDEX IF EXISTS public.idx_quiz_attempts_user_id;
DROP INDEX IF EXISTS public.idx_user_achievements_user;
```
