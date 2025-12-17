
import { KnowledgeFile, KnowledgeChunk } from '../types';
import { embedContent, chunkText } from './geminiService';

/**
 * Vector Database Service
 * 
 * This simulates a FAISS (Facebook AI Similarity Search) IndexFlatIP (Inner Product) index.
 * It stores high-dimensional vectors and performs exhaustive k-Nearest Neighbors (k-NN) search 
 * using Cosine Similarity.
 */

const STORAGE_KEY = 'af_vector_store';

export class VectorStore {
  private files: Map<string, KnowledgeFile>;
  private isDirty: boolean;

  constructor() {
    this.files = new Map();
    this.isDirty = false;
    this.load();
  }

  // --- Persistence ---

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: KnowledgeFile[] = JSON.parse(saved);
        parsed.forEach(f => this.files.set(f.id, f));
      }
    } catch (e) {
      console.error("Failed to load Vector Store", e);
    }
  }

  public save() {
    if (!this.isDirty) return;
    try {
      const allFiles = Array.from(this.files.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allFiles));
      this.isDirty = false;
    } catch (e) {
      console.error("Vector Store Quota Exceeded. Could not persist to disk.", e);
    }
  }

  // --- Index Management ---

  public getFiles(): KnowledgeFile[] {
    return Array.from(this.files.values());
  }

  public getFile(id: string): KnowledgeFile | undefined {
    return this.files.get(id);
  }

  public async ensureDefault(id: string, name: string, content: string) {
    if (this.files.has(id)) {
        return;
    }
    
    console.log(`Initializing default knowledge base: ${name}...`);
    // Pass a distinct mime type for internal tracking
    await this.addDocument(id, name, content, 'application/vnd.assessment-forge.default-rules');
  }

  public async addDocument(fileId: string, name: string, content: string, type: string) {
    // 1. Chunking
    const textChunks = chunkText(content);
    const chunks: KnowledgeChunk[] = [];

    // 2. Embedding (Vectorization)
    // We process sequentially to be polite to the API limits
    // Even if embedding fails, we still add the file so it appears in the UI
    for (const text of textChunks) {
        // Simple rate limiting
        await new Promise(r => setTimeout(r, 100));
        
        try {
            const vector = await embedContent(text);
            if (vector && vector.length > 0) {
                chunks.push({
                    text,
                    embedding: vector
                });
            } else {
                // Add non-embedded chunk for record keeping, though it won't be searchable by vector
                chunks.push({ text, embedding: [] }); 
            }
        } catch (e) {
            console.warn("Failed to embed chunk", e);
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

    this.files.set(fileId, newFile);
    this.isDirty = true;
    this.save();
    return newFile;
  }

  public removeDocument(id: string) {
    if (this.files.has(id)) {
        this.files.delete(id);
        this.isDirty = true;
        this.save();
    }
  }

  // --- FAISS-style Search (IndexFlatIP) ---
  // Calculates Cosine Similarity between query vector and all stored vectors

  public async similaritySearch(query: string, fileId?: string, k: number = 3): Promise<string> {
    const queryVector = await embedContent(query);
    if (!queryVector || queryVector.length === 0) return "";

    let searchPool: KnowledgeChunk[] = [];

    if (fileId) {
        // Search specific file
        const file = this.files.get(fileId);
        if (file && file.chunks) {
            searchPool = file.chunks;
        }
    } else {
        // Global search (search all files)
        this.files.forEach(f => {
            if (f.chunks) searchPool.push(...f.chunks);
        });
    }

    // Filter out chunks without embeddings
    searchPool = searchPool.filter(c => c.embedding && c.embedding.length > 0);

    if (searchPool.length === 0) return "";

    // Calculate Scores (Cosine Similarity)
    const scored = searchPool.map(chunk => ({
        text: chunk.text,
        score: this.cosineSimilarity(queryVector, chunk.embedding)
    }));

    // Sort Descending
    scored.sort((a, b) => b.score - a.score);

    // Return Top K
    return scored.slice(0, k).map(s => s.text).join("\n\n");
  }

  private cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    // Assume vectors are same length
    const len = vecA.length;
    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }
}

// Singleton Instance
export const vectorDb = new VectorStore();
