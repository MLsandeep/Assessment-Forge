"""
RAG Backend Server for Assessment Forge

This FastAPI server provides RAG capabilities using:
- HuggingFace embeddings (FREE, local)
- FAISS vector store
- PDF text extraction

Run with: uvicorn rag_server:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import uuid
import json
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

# Initialize FastAPI
app = FastAPI(
    title="Assessment Forge RAG API",
    description="RAG backend with FREE local embeddings",
    version="1.0.0"
)

# Add CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory for uploaded files and FAISS indices
UPLOAD_DIR = Path("./rag_data/uploads")
INDEX_DIR = Path("./rag_data/indices")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
INDEX_DIR.mkdir(parents=True, exist_ok=True)

# Store metadata about uploaded files
FILES_METADATA: Dict[str, Dict[str, Any]] = {}
VECTOR_STORES: Dict[str, FAISS] = {}

# Initialize embeddings (FREE local model)
print("[INFO] Loading embedding model (first time may take a moment)...")
embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={'device': 'cpu'},
    encode_kwargs={'normalize_embeddings': True}
)
print("[OK] Embedding model loaded!")

# Text splitter config (same as Python test)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100,
    length_function=len,
)


# --- Request/Response Models ---

class SearchRequest(BaseModel):
    query: str
    file_id: Optional[str] = None
    k: int = 5


class SearchResult(BaseModel):
    chunks: List[str]
    file_id: str
    file_name: str


class FileInfo(BaseModel):
    id: str
    name: str
    chunks: int
    is_embedded: bool


# --- API Endpoints ---

@app.get("/")
async def root():
    return {"status": "ok", "message": "RAG API is running"}


@app.get("/files", response_model=List[FileInfo])
async def list_files():
    """List all uploaded files"""
    return [
        FileInfo(
            id=fid,
            name=meta["name"],
            chunks=meta["chunks"],
            is_embedded=fid in VECTOR_STORES
        )
        for fid, meta in FILES_METADATA.items()
    ]


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a PDF file and create embeddings"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    file_id = str(uuid.uuid4())[:8]
    file_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    
    # Save uploaded file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    print(f"[INFO] Processing {file.filename}...")
    
    try:
        # Load PDF
        loader = PyPDFLoader(str(file_path))
        docs = loader.load()
        
        # Split into chunks
        chunks = text_splitter.split_documents(docs)
        print(f"[OK] Created {len(chunks)} chunks")
        
        # Create FAISS vector store
        vectorstore = FAISS.from_documents(chunks, embeddings)
        print(f"[OK] Created FAISS index for {file.filename}")
        
        # Save index
        vectorstore.save_local(str(INDEX_DIR / file_id))
        
        # Store in memory
        VECTOR_STORES[file_id] = vectorstore
        FILES_METADATA[file_id] = {
            "name": file.filename,
            "path": str(file_path),
            "chunks": len(chunks),
            "pages": len(docs)
        }
        
        return {
            "id": file_id,
            "name": file.filename,
            "chunks": len(chunks),
            "pages": len(docs),
            "message": "File uploaded and indexed successfully"
        }
    
    except Exception as e:
        # Clean up on failure
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@app.post("/search", response_model=SearchResult)
async def search(request: SearchRequest):
    """Search for relevant chunks using similarity search"""
    file_id = request.file_id
    
    if not file_id:
        # Search across all files if no specific file
        if not VECTOR_STORES:
            raise HTTPException(status_code=404, detail="No files uploaded. Upload a file first.")
        file_id = list(VECTOR_STORES.keys())[0]
    
    if file_id not in VECTOR_STORES:
        # Try to load from disk
        index_path = INDEX_DIR / file_id
        if index_path.exists():
            VECTOR_STORES[file_id] = FAISS.load_local(
                str(index_path), 
                embeddings,
                allow_dangerous_deserialization=True
            )
        else:
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")
    
    vectorstore = VECTOR_STORES[file_id]
    
    # Perform similarity search
    docs = vectorstore.similarity_search(request.query, k=request.k)
    
    chunks = [doc.page_content for doc in docs]
    
    print(f"[SEARCH] Query: '{request.query[:50]}...' -> {len(chunks)} chunks")
    
    return SearchResult(
        chunks=chunks,
        file_id=file_id,
        file_name=FILES_METADATA.get(file_id, {}).get("name", "Unknown")
    )


@app.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file and its index"""
    if file_id not in FILES_METADATA:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Remove from memory
    if file_id in VECTOR_STORES:
        del VECTOR_STORES[file_id]
    
    # Remove files
    meta = FILES_METADATA.pop(file_id)
    file_path = Path(meta["path"])
    if file_path.exists():
        file_path.unlink()
    
    index_path = INDEX_DIR / file_id
    if index_path.exists():
        import shutil
        shutil.rmtree(index_path)
    
    return {"message": f"Deleted {meta['name']}"}


# Load existing indices on startup
@app.on_event("startup")
async def load_existing_indices():
    """Load any existing FAISS indices from disk"""
    for index_dir in INDEX_DIR.iterdir():
        if index_dir.is_dir():
            file_id = index_dir.name
            try:
                VECTOR_STORES[file_id] = FAISS.load_local(
                    str(index_dir),
                    embeddings,
                    allow_dangerous_deserialization=True
                )
                FILES_METADATA[file_id] = {
                    "name": f"Loaded_{file_id}",
                    "chunks": 0,
                    "path": ""
                }
                print(f"[OK] Loaded existing index: {file_id}")
            except Exception as e:
                print(f"[WARN] Failed to load index {file_id}: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
