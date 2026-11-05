/**
 * Notionwell RAG — Vector Store & Similarity Retrieval Layer
 * Manages document chunks, vector embeddings, and hybrid semantic-keyword similarity search.
 * Dual-persistence: Local disk store (.rag_storage/) with Supabase PostgreSQL pgvector background sync.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { chunkDocumentText } from './chunker';
import { generateEmbedding, generateBatchEmbeddings, cosineSimilarity } from './embeddings';
import { createAdminClient } from '@/lib/supabase/admin';

export interface StoredDocument {
  id: string;
  userId: string;
  deckId?: string | null;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'image' | 'notes';
  characterCount: number;
  chunkCount: number;
  createdAt: string;
}

export interface StoredChunk {
  id: string;
  documentId: string;
  userId: string;
  deckId?: string | null;
  chunkIndex: number;
  heading?: string;
  content: string;
  embedding: number[];
  createdAt: string;
}

export interface ScoredChunk {
  chunk: StoredChunk;
  documentName: string;
  similarity: number;
  keywordScore: number;
  combinedScore: number;
}

export interface VectorSearchOptions {
  userId: string;
  query: string;
  deckId?: string | null;
  documentIds?: string[];
  topK?: number;
  minSimilarity?: number;
}

// Global singleton in-memory runtime cache for instant sub-millisecond retrieval across Next.js route bundles
const globalForRAG = globalThis as unknown as {
  __notionwell_runtimeDocs?: Map<string, StoredDocument>;
  __notionwell_runtimeChunks?: Map<string, StoredChunk[]>;
  __notionwell_isLoaded?: boolean;
};

const runtimeDocuments: Map<string, StoredDocument> =
  globalForRAG.__notionwell_runtimeDocs ?? (globalForRAG.__notionwell_runtimeDocs = new Map());
const runtimeChunks: Map<string, StoredChunk[]> =
  globalForRAG.__notionwell_runtimeChunks ?? (globalForRAG.__notionwell_runtimeChunks = new Map());

// Storage directory on disk
const STORAGE_DIR = path.join(process.cwd(), '.rag_storage');
const DOCS_FILE = path.join(STORAGE_DIR, 'documents.json');
const CHUNKS_FILE = path.join(STORAGE_DIR, 'chunks.json');

/**
 * Loads documents and chunks from local disk persistence if memory cache is empty.
 */
function ensureStoreLoaded(): void {
  if (globalForRAG.__notionwell_isLoaded && runtimeDocuments.size > 0) {
    return;
  }

  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (fs.existsSync(DOCS_FILE)) {
      const raw = fs.readFileSync(DOCS_FILE, 'utf8');
      const docs: StoredDocument[] = JSON.parse(raw);
      for (const d of docs) {
        runtimeDocuments.set(d.id, d);
      }
    }

    if (fs.existsSync(CHUNKS_FILE)) {
      const raw = fs.readFileSync(CHUNKS_FILE, 'utf8');
      const chunksMap: Record<string, StoredChunk[]> = JSON.parse(raw);
      for (const [docId, chunks] of Object.entries(chunksMap)) {
        runtimeChunks.set(docId, chunks);
      }
    }

    globalForRAG.__notionwell_isLoaded = true;
    console.log(`[VectorStore] Loaded from disk: ${runtimeDocuments.size} documents, ${runtimeChunks.size} chunk sets.`);
  } catch (err: any) {
    console.warn('[VectorStore] Notice: Disk storage load skipped:', err?.message);
  }
}

/**
 * Persists current documents and chunks to local disk.
 */
function persistStoreToDisk(): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    const docsList = Array.from(runtimeDocuments.values());
    fs.writeFileSync(DOCS_FILE, JSON.stringify(docsList, null, 2), 'utf8');

    const chunksObj: Record<string, StoredChunk[]> = {};
    for (const [docId, chunks] of runtimeChunks.entries()) {
      chunksObj[docId] = chunks;
    }
    fs.writeFileSync(CHUNKS_FILE, JSON.stringify(chunksObj), 'utf8');
  } catch (err: any) {
    console.warn('[VectorStore] Notice: Disk storage write skipped:', err?.message);
  }
}

/**
 * Keyword overlap matching score (0 to 1) with special academic weighting
 */
function calculateKeywordScore(query: string, content: string, heading?: string): number {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['what', 'when', 'where', 'which', 'explain', 'tell', 'about', 'the', 'and', 'for', 'are'].includes(w));

  if (queryTerms.length === 0) return 0;

  const contentLower = content.toLowerCase();
  const headingLower = (heading || '').toLowerCase();
  let matches = 0;

  for (const term of queryTerms) {
    if (headingLower.includes(term)) {
      matches += 1.5; // Heading matches carry higher weight
    } else if (contentLower.includes(term)) {
      matches += 1.0;
    }
  }

  return Math.min(1.0, matches / queryTerms.length);
}

/**
 * Indexes a document into chunks, generates vector embeddings, and stores them.
 */
export async function indexDocumentForRAG(params: {
  documentId?: string;
  userId: string;
  deckId?: string | null;
  fileName: string;
  fileType?: 'pdf' | 'docx' | 'txt' | 'image' | 'notes';
  rawText: string;
}): Promise<{ document: StoredDocument; chunks: StoredChunk[] }> {
  ensureStoreLoaded();

  const {
    documentId = uuidv4(),
    userId,
    deckId = null,
    fileName,
    fileType = 'txt',
    rawText,
  } = params;

  // 1. Chunk document text
  const chunkDrafts = chunkDocumentText(rawText);
  if (chunkDrafts.length === 0) {
    throw new Error('Document does not contain enough extractable text to index.');
  }

  // 2. Generate vector embeddings for all chunks in batch
  const textsToEmbed = chunkDrafts.map((c) =>
    c.heading ? `${c.heading}\n\n${c.content}` : c.content
  );
  const embeddings = await generateBatchEmbeddings(textsToEmbed);

  // 3. Construct stored records
  const now = new Date().toISOString();
  const storedDoc: StoredDocument = {
    id: documentId,
    userId,
    deckId,
    fileName,
    fileType,
    characterCount: rawText.length,
    chunkCount: chunkDrafts.length,
    createdAt: now,
  };

  const storedChunks: StoredChunk[] = chunkDrafts.map((draft, idx) => ({
    id: uuidv4(),
    documentId,
    userId,
    deckId,
    chunkIndex: draft.chunkIndex,
    heading: draft.heading,
    content: draft.content,
    embedding: embeddings[idx] || [],
    createdAt: now,
  }));

  // 4. Save to runtime cache and persist to disk
  runtimeDocuments.set(documentId, storedDoc);
  runtimeChunks.set(documentId, storedChunks);
  persistStoreToDisk();

  // 5. Asynchronously persist to Supabase PostgreSQL if admin client available
  try {
    const admin = createAdminClient();
    await admin.from('documents').upsert({
      id: documentId,
      user_id: userId,
      deck_id: deckId || null,
      file_name: fileName,
      storage_path: `documents/${userId}/${documentId}`,
      mime_type: fileType,
      file_size_bytes: rawText.length,
      parsed_text: rawText.slice(0, 10000),
      is_processed: true,
    }, { onConflict: 'id' });

    const chunkInserts = storedChunks.map((c) => ({
      id: c.id,
      document_id: documentId,
      user_id: userId,
      chunk_index: c.chunkIndex,
      heading: c.heading || null,
      content: c.content,
      embedding: c.embedding.length === 768 ? c.embedding : null,
    }));
    await admin.from('document_chunks').upsert(chunkInserts, { onConflict: 'id' });
  } catch (err: any) {
    console.warn('[VectorStore] Supabase DB notice (using disk persistence):', err?.message);
  }

  return { document: storedDoc, chunks: storedChunks };
}

/**
 * Searches for the most relevant document chunks matching a user question.
 * Uses hybrid scoring: 70% semantic vector similarity + 30% keyword match.
 */
export async function searchRelevantChunks(
  options: VectorSearchOptions
): Promise<ScoredChunk[]> {
  ensureStoreLoaded();

  const {
    userId,
    query,
    deckId,
    documentIds,
    topK = 5,
    minSimilarity = 0.35,
  } = options;

  if (!query || query.trim().length === 0) return [];

  // 1. Generate query embedding vector (768-dim)
  const queryEmbedding = await generateEmbedding(query);

  // 2. Collect candidate chunks matching document filters with strict user isolation
  const candidateChunks: Array<{ chunk: StoredChunk; doc: StoredDocument }> = [];

  for (const [docId, doc] of runtimeDocuments.entries()) {
    // Strict multi-tenant isolation: document MUST belong to this user or be public shared
    const isOwner =
      doc.userId === userId ||
      doc.userId === 'shared' ||
      (doc.userId === 'default-user' && userId === 'default-user');
    if (!isOwner) continue;

    // If specific document IDs or names are requested by user, check them
    if (documentIds && documentIds.length > 0) {
      const matchesDoc = documentIds.includes(docId) || documentIds.includes(doc.fileName);
      if (!matchesDoc) continue;
    } else {
      if (deckId && doc.deckId && doc.deckId !== deckId) continue;
    }

    const chunks = runtimeChunks.get(docId) || [];
    for (const chunk of chunks) {
      candidateChunks.push({ chunk, doc });
    }
  }

  // 3. Compute vector similarities and hybrid scores
  const scoredChunks: ScoredChunk[] = [];

  for (const { chunk, doc } of candidateChunks) {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    const keywordScore = calculateKeywordScore(query, chunk.content, chunk.heading);

    // Hybrid combination: 70% vector similarity + 30% keyword relevance
    const combinedScore = similarity * 0.70 + keywordScore * 0.30;

    if (similarity >= minSimilarity || keywordScore >= 0.20 || combinedScore >= minSimilarity) {
      scoredChunks.push({
        chunk,
        documentName: doc.fileName,
        similarity,
        keywordScore,
        combinedScore,
      });
    }
  }

  // 4. Sort descending by combined score and take topK
  scoredChunks.sort((a, b) => b.combinedScore - a.combinedScore);
  console.log(`[VectorStore] search: found ${candidateChunks.length} candidate chunks across ${runtimeDocuments.size} docs. Scored matches: ${scoredChunks.length}`);

  return scoredChunks.slice(0, topK);
}

/**
 * Retrieves all stored documents belonging to a user (and optionally a deck).
 */
export function getStoredDocuments(userId: string, deckId?: string | null): StoredDocument[] {
  ensureStoreLoaded();

  if (!userId) return [];

  const list: StoredDocument[] = [];
  for (const doc of runtimeDocuments.values()) {
    const isUserMatch =
      doc.userId === userId ||
      doc.userId === 'shared' ||
      (doc.userId === 'default-user' && userId === 'default-user');

    if (isUserMatch) {
      if (!deckId || doc.deckId === deckId) {
        list.push(doc);
      }
    }
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Deletes a document and its chunks from vector store.
 * Enforces user ownership check.
 */
export function deleteStoredDocument(documentId: string, userId: string): boolean {
  ensureStoreLoaded();

  const doc = runtimeDocuments.get(documentId);
  if (!doc) return false;

  // Strict ownership check: Only owner or shared can delete
  if (doc.userId !== userId && doc.userId !== 'shared' && !(doc.userId === 'default-user' && userId === 'default-user')) {
    console.warn(`[VectorStore] Unauthorized deletion attempt: User ${userId} tried to delete Doc ${documentId} owned by ${doc.userId}`);
    return false;
  }

  runtimeDocuments.delete(documentId);
  runtimeChunks.delete(documentId);
  persistStoreToDisk();

  return true;
}

/**
 * Purges all vector store documents and chunks belonging to a user (GDPR / account deletion).
 */
export function purgeUserRAGData(userId: string): void {
  ensureStoreLoaded();
  const docIdsToDelete: string[] = [];
  for (const [id, doc] of runtimeDocuments.entries()) {
    if (doc.userId === userId) {
      docIdsToDelete.push(id);
    }
  }
  for (const id of docIdsToDelete) {
    runtimeDocuments.delete(id);
    runtimeChunks.delete(id);
  }
  if (docIdsToDelete.length > 0) {
    persistStoreToDisk();
  }
}
