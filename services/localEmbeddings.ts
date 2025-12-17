/**
 * Local Embedding Service using Transformers.js
 * 
 * Uses all-MiniLM-L6-v2 model which runs entirely in the browser.
 * - Model size: ~22MB (cached after first download)
 * - Embedding dimension: 384
 * - Offline capable after first use
 */

import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js environment
env.allowLocalModels = false;  // Don't look for local models
env.useBrowserCache = true;    // Cache in browser
// Use the quantized model from HuggingFace CDN

// Model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Singleton pipeline instance (using any to avoid type conflicts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null;
let isLoading = false;
let loadError: Error | null = null;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 2;

/**
 * Get or initialize the embedding pipeline
 */
async function getEmbeddingPipeline(): Promise<any> {
    if (embeddingPipeline) {
        return embeddingPipeline;
    }

    if (loadError && loadAttempts >= MAX_LOAD_ATTEMPTS) {
        throw loadError;
    }

    if (isLoading) {
        // Wait for loading to complete
        while (isLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (embeddingPipeline) return embeddingPipeline;
        if (loadError) throw loadError;
    }

    isLoading = true;
    loadAttempts++;
    console.log(`[Embeddings] Loading MiniLM model (attempt ${loadAttempts})...`);

    try {
        embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME, {
            quantized: true,
            progress_callback: (progress: any) => {
                if (progress.status === 'downloading') {
                    console.log(`[Embeddings] Downloading: ${progress.file} (${Math.round(progress.progress || 0)}%)`);
                }
            }
        });
        console.log('[Embeddings] MiniLM model loaded successfully!');
        loadError = null;
        return embeddingPipeline;
    } catch (error) {
        loadError = error as Error;
        console.error('[Embeddings] Failed to load model:', error);
        throw error;
    } finally {
        isLoading = false;
    }
}

/**
 * Generate embeddings for text using local MiniLM model
 * Falls back to Gemini API if local model fails to load
 * 
 * @param text - Text to embed
 * @returns Embedding vector (384-dim local, 768-dim Gemini)
 */
export async function embedContentLocal(text: string): Promise<number[]> {
    if (!text || !text.trim()) {
        return [];
    }

    try {
        const pipe = await getEmbeddingPipeline();

        // Generate embedding
        const output = await pipe(text, {
            pooling: 'mean',
            normalize: true,
        });

        // Convert to regular array
        const embedding = Array.from(output.data as Float32Array);

        return embedding;
    } catch (error) {
        console.warn('[Embeddings] Local model failed, falling back to Gemini API...');

        // Fallback to Gemini embeddings
        try {
            const { embedContent } = await import('./geminiService');
            return await embedContent(text);
        } catch (geminiError) {
            console.error('[Embeddings] Gemini fallback also failed:', geminiError);
            return [];
        }
    }
}

/**
 * Check if the embedding model is loaded
 */
export function isEmbeddingModelReady(): boolean {
    return embeddingPipeline !== null;
}

/**
 * Preload the embedding model (call on app startup)
 */
export async function preloadEmbeddingModel(): Promise<boolean> {
    try {
        await getEmbeddingPipeline();
        return true;
    } catch {
        return false;
    }
}
