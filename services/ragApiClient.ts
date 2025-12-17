/**
 * RAG API Client
 * 
 * Connects to the Python RAG backend server for:
 * - PDF uploads with FREE local embeddings
 * - FAISS similarity search
 */

const RAG_API_URL = 'http://localhost:8000';

export interface RagFile {
    id: string;
    name: string;
    chunks: number;
    is_embedded: boolean;
}

export interface SearchResult {
    chunks: string[];
    file_id: string;
    file_name: string;
}

/**
 * Check if RAG backend is running
 */
export async function isRagBackendAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${RAG_API_URL}/`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get list of files from RAG backend
 */
export async function getRagFiles(): Promise<RagFile[]> {
    const response = await fetch(`${RAG_API_URL}/files`);
    if (!response.ok) {
        throw new Error('Failed to fetch files from RAG backend');
    }
    return response.json();
}

/**
 * Upload a file to the RAG backend
 */
export async function uploadToRagBackend(file: File): Promise<{
    id: string;
    name: string;
    chunks: number;
    pages: number;
}> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${RAG_API_URL}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload file');
    }

    return response.json();
}

/**
 * Search for relevant chunks using RAG backend
 */
export async function searchRag(
    query: string,
    fileId?: string,
    k: number = 5
): Promise<SearchResult> {
    const response = await fetch(`${RAG_API_URL}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
            file_id: fileId,
            k,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Search failed');
    }

    return response.json();
}

/**
 * Delete a file from RAG backend
 */
export async function deleteFromRagBackend(fileId: string): Promise<void> {
    const response = await fetch(`${RAG_API_URL}/files/${fileId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete file');
    }
}
