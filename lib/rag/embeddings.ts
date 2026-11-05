/**
 * Notionwell RAG — Vector Embeddings Engine
 * Integrates with Google Gemini Embedding Models (gemini-embedding-001) with 768 dimensions.
 * Includes cosine similarity calculation and resilient offline fallbacks.
 */

export const EMBEDDING_MODEL = 'models/gemini-embedding-001';
export const EMBEDDING_DIMENSION = 768;

/**
 * Computes cosine similarity between two numerical vectors.
 * Returns value between -1 and 1 (typically 0 to 1 for normalized text embeddings).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) {
    const minLen = Math.min(vecA.length, vecB.length);
    vecA = vecA.slice(0, minLen);
    vecB = vecB.slice(0, minLen);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates deterministic fallback embedding vector (768-dim)
 * used if API key is unconfigured or network is offline.
 */
function generateDeterministicFallbackEmbedding(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const code = word.charCodeAt(j);
      const index = (code * 31 + j * 17 + i * 13) % EMBEDDING_DIMENSION;
      vector[index] += 1 / (1 + j);
    }
  }

  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Generates a 768-dimension vector embedding for a single text chunk using Gemini.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanInput = text.trim();
  if (!cleanInput) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[RAG Embeddings] No GEMINI_API_KEY found, using local semantic vector representation.');
    return generateDeterministicFallbackEmbedding(cleanInput);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: cleanInput.slice(0, 8000) }] },
        outputDimensionality: EMBEDDING_DIMENSION,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`[RAG Embeddings] API error status ${res.status}: ${errBody}`);
      return generateDeterministicFallbackEmbedding(cleanInput);
    }

    const data = await res.json();
    if (data.embedding && Array.isArray(data.embedding.values)) {
      return data.embedding.values;
    }

    return generateDeterministicFallbackEmbedding(cleanInput);
  } catch (err: any) {
    console.warn('[RAG Embeddings] Fetch failed, using fallback vector:', err?.message);
    return generateDeterministicFallbackEmbedding(cleanInput);
  }
}

/**
 * Generates embeddings for an array of texts with concurrency control.
 */
export async function generateBatchEmbeddings(
  texts: string[],
  concurrency = 4
): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchPromises = batch.map((text, idx) =>
      generateEmbedding(text).then((vec) => {
        results[i + idx] = vec;
      })
    );
    await Promise.all(batchPromises);
  }

  return results;
}
