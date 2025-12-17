
import { KnowledgeFile, KnowledgeChunk } from '../types';
import { embedContentLocal } from './localEmbeddings';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Vector Database Service (IndexedDB-backed)
 * 
 * This provides a persistent vector store using IndexedDB for storage.
 * Features:
 * - 50MB+ storage capacity (vs 5MB localStorage limit)
 * - True persistence across browser sessions
 * - Async operations (non-blocking)
 * - Cosine similarity search for k-NN retrieval
 * - Local embeddings using all-MiniLM-L6-v2 (runs in browser)
 */

// --- Chunking Configuration ---
const CHUNK_SIZE = 500;      // Target characters per chunk
const CHUNK_OVERLAP = 100;   // Overlap between consecutive chunks

/**
 * Improved chunking with overlap for better RAG retrieval
 */
export const chunkTextWithOverlap = (text: string): string[] => {
  const chunks: string[] = [];

  // First, split by paragraphs to preserve semantic boundaries
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If paragraph is small, add to current chunk
    if (paragraph.length <= CHUNK_SIZE) {
      if ((currentChunk.length + paragraph.length) <= CHUNK_SIZE) {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      } else {
        // Push current chunk and start new one
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      }
    } else {
      // Large paragraph: split by sentences with overlap
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // Split into sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      let sentenceChunk = "";

      for (const sentence of sentences) {
        if ((sentenceChunk.length + sentence.length) <= CHUNK_SIZE) {
          sentenceChunk += sentence;
        } else {
          if (sentenceChunk.trim()) {
            chunks.push(sentenceChunk.trim());
            // Start new chunk with overlap from end of previous
            const overlapText = sentenceChunk.slice(-CHUNK_OVERLAP);
            sentenceChunk = overlapText + sentence;
          } else {
            // Sentence itself is too long, just add it
            chunks.push(sentence.trim());
            sentenceChunk = "";
          }
        }
      }

      if (sentenceChunk.trim()) {
        currentChunk = sentenceChunk;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 10); // Filter out tiny chunks
};

// --- IndexedDB Schema ---
interface VectorDBSchema extends DBSchema {
  files: {
    key: string;
    value: KnowledgeFile;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'assessment-forge-vectordb';
const DB_VERSION = 1;

export class VectorStore {
  private db: IDBPDatabase<VectorDBSchema> | null = null;
  private filesCache: Map<string, KnowledgeFile> = new Map();
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize() {
    try {
      this.db = await openDB<VectorDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create object store for files
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('by-date', 'uploadDate');
        },
      });

      // Load all files into cache for quick access
      const allFiles = await this.db.getAll('files');
      allFiles.forEach(f => this.filesCache.set(f.id, f));

      console.log(`[VectorDB] Initialized with ${allFiles.length} files from IndexedDB`);
    } catch (e) {
      console.error('[VectorDB] Failed to initialize IndexedDB:', e);
      // Fallback to in-memory only
    }
  }

  // Ensure DB is ready before operations
  private async ensureReady() {
    await this.initPromise;
  }

  // --- Index Management ---

  public async getFiles(): Promise<KnowledgeFile[]> {
    await this.ensureReady();
    return Array.from(this.filesCache.values());
  }

  // Synchronous version for UI compatibility
  public getFilesSync(): KnowledgeFile[] {
    return Array.from(this.filesCache.values());
  }

  // Get storage usage statistics
  public getStorageStats(): { usedBytes: number; usedMB: number; maxMB: number; percentUsed: number } {
    let totalBytes = 0;

    this.filesCache.forEach(file => {
      // Estimate size: content + embeddings (each embedding is ~768 floats * 8 bytes)
      const contentSize = new Blob([file.content || '']).size;
      const embeddingSize = (file.chunks || []).reduce((acc, chunk) => {
        return acc + (chunk.embedding?.length || 0) * 8; // 8 bytes per float64
      }, 0);
      totalBytes += contentSize + embeddingSize;
    });

    const usedMB = totalBytes / (1024 * 1024);
    const maxMB = 50; // IndexedDB allows ~50MB minimum, often more

    return {
      usedBytes: totalBytes,
      usedMB: Math.round(usedMB * 100) / 100,
      maxMB,
      percentUsed: Math.min(100, (usedMB / maxMB) * 100)
    };
  }

  public async getFile(id: string): Promise<KnowledgeFile | undefined> {
    await this.ensureReady();
    return this.filesCache.get(id);
  }

  public async ensureDefault(id: string, name: string, content: string) {
    await this.ensureReady();

    if (this.filesCache.has(id)) {
      return;
    }

    console.log(`[VectorDB] Initializing default knowledge base: ${name}...`);
    await this.addDocument(id, name, content, 'application/vnd.assessment-forge.default-rules');
  }

  public async addDocument(fileId: string, name: string, content: string, type: string): Promise<KnowledgeFile> {
    await this.ensureReady();

    // 1. Chunking with overlap
    const textChunks = chunkTextWithOverlap(content);
    const chunks: KnowledgeChunk[] = [];

    console.log(`[VectorDB] Processing ${name}: ${textChunks.length} chunks`);

    // 2. Embedding (Vectorization)
    for (let i = 0; i < textChunks.length; i++) {
      const text = textChunks[i];

      // Rate limiting
      await new Promise(r => setTimeout(r, 100));

      try {
        const vector = await embedContentLocal(text);
        if (vector && vector.length > 0) {
          chunks.push({ text, embedding: vector });
        } else {
          chunks.push({ text, embedding: [] });
        }
      } catch (e) {
        console.warn(`[VectorDB] Failed to embed chunk ${i + 1}/${textChunks.length}:`, e);
        chunks.push({ text, embedding: [] });
      }
    }

    const newFile: KnowledgeFile = {
      id: fileId,
      name,
      content,
      type,
      uploadDate: Date.now(),
      chunks,
      isEmbedded: chunks.some(c => c.embedding.length > 0)
    };

    // Save to IndexedDB
    if (this.db) {
      await this.db.put('files', newFile);
    }

    // Update cache
    this.filesCache.set(fileId, newFile);

    console.log(`[VectorDB] Added document: ${name} (${chunks.length} chunks, ${chunks.filter(c => c.embedding.length > 0).length} embedded)`);

    return newFile;
  }

  public async removeDocument(id: string) {
    await this.ensureReady();

    if (this.db) {
      await this.db.delete('files', id);
    }
    this.filesCache.delete(id);

    console.log(`[VectorDB] Removed document: ${id}`);
  }

  // --- Similarity Search (Cosine Similarity) ---

  public async similaritySearch(query: string, fileId?: string, k: number = 3): Promise<string> {
    await this.ensureReady();

    console.log(`[VectorDB] Similarity search for fileId: ${fileId}`);

    const queryVector = await embedContentLocal(query);
    if (!queryVector || queryVector.length === 0) {
      console.warn('[VectorDB] Failed to embed query, returning empty');
      return "";
    }

    let searchPool: KnowledgeChunk[] = [];
    let fallbackContent = "";

    if (fileId) {
      const file = this.filesCache.get(fileId);
      console.log(`[VectorDB] Found file in cache: ${file?.name}, chunks: ${file?.chunks?.length || 0}`);

      if (file?.chunks) {
        searchPool = file.chunks;
      }

      // Store fallback content (first 3000 chars) in case embeddings are empty
      if (file?.content) {
        fallbackContent = file.content.substring(0, 3000);
      }
    } else {
      // Global search
      this.filesCache.forEach(f => {
        if (f.chunks) searchPool.push(...f.chunks);
      });
    }

    // Filter out chunks without embeddings
    const validChunks = searchPool.filter(c => c.embedding && c.embedding.length > 0);
    console.log(`[VectorDB] Search pool: ${searchPool.length} chunks, ${validChunks.length} with embeddings`);

    // OPTIMIZATION: For small files (<=10 chunks), just return all text (no need for similarity search)
    if (validChunks.length > 0 && validChunks.length <= 10) {
      console.log(`[VectorDB] Small file detected (${validChunks.length} chunks), returning all content`);
      return validChunks.map(c => c.text).join("\n\n");
    }

    // If no valid embeddings, return fallback content (raw file text)
    if (validChunks.length === 0) {
      console.warn('[VectorDB] No embedded chunks found, returning fallback content');
      if (fallbackContent) {
        return `[Using raw document content]\n\n${fallbackContent}`;
      }
      return "";
    }

    // Calculate Cosine Similarity scores
    const scored = validChunks.map(chunk => ({
      text: chunk.text,
      score: this.cosineSimilarity(queryVector, chunk.embedding)
    }));

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);

    console.log(`[VectorDB] Top result score: ${scored[0]?.score.toFixed(4)}`);

    // Return top K chunks joined
    return scored.slice(0, k).map(s => s.text).join("\n\n");
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    const len = vecA.length;
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }

  // --- Migration: Import from localStorage if exists ---
  public async migrateFromLocalStorage() {
    await this.ensureReady();

    const LEGACY_KEY = 'af_vector_store';
    const legacyData = localStorage.getItem(LEGACY_KEY);

    if (legacyData) {
      try {
        const parsed: KnowledgeFile[] = JSON.parse(legacyData);
        console.log(`[VectorDB] Migrating ${parsed.length} files from localStorage...`);

        for (const file of parsed) {
          if (!this.filesCache.has(file.id)) {
            if (this.db) {
              await this.db.put('files', file);
            }
            this.filesCache.set(file.id, file);
          }
        }

        // Clear legacy storage after successful migration
        localStorage.removeItem(LEGACY_KEY);
        console.log('[VectorDB] Migration complete, cleared localStorage');
      } catch (e) {
        console.error('[VectorDB] Migration failed:', e);
      }
    }
  }
}

// Singleton Instance
export const vectorDb = new VectorStore();

// Run migration on load
vectorDb.migrateFromLocalStorage();

// Expose to window for debugging (browser console access)
if (typeof window !== 'undefined') {
  (window as any).vectorDb = vectorDb;
  console.log('[VectorDB] Exposed to window.vectorDb for debugging');
}
