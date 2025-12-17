
import React, { useState, useEffect } from 'react';
import { KnowledgeFile } from '../types';
import { vectorDb } from '../services/vectorDb';
import { Upload, FileText, Trash2, FileJson, FileType, Search, Loader2, Database, Check } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface KnowledgeBankProps {
  files: KnowledgeFile[];
  onAddFile: (file: KnowledgeFile) => void;
  onDeleteFile: (id: string) => void;
}

const KnowledgeBank: React.FC<KnowledgeBankProps> = ({ files, onAddFile, onDeleteFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `\n${pageText}`;
      }
      return fullText;
    } catch (error) {
      console.error("Error parsing PDF:", error);
      throw new Error("Failed to extract text from PDF.");
    }
  };

  const processFile = async (file: File) => {
    setProcessing(true);
    setStatusMsg("Extracting text...");
    try {
      let content = '';

      if (file.type === 'application/pdf') {
        content = await extractTextFromPdf(file);
      } else {
        // Text based handling
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      setStatusMsg("Generating embeddings (Chunking & Vectorizing)...");

      // Use VectorDB to add document (which handles embedding and saving)
      const newFile = await vectorDb.addDocument(
        Date.now().toString(),
        file.name,
        content,
        file.type
      );

      onAddFile(newFile);
    } catch (error) {
      console.error(error);
      alert("Error processing file. Please ensure it is a valid text or PDF file.");
    } finally {
      setProcessing(false);
      setStatusMsg("");
    }
  };

  const handleDelete = (id: string) => {
    vectorDb.removeDocument(id);
    onDeleteFile(id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Get storage stats
  const storageStats = vectorDb.getStorageStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="text-emerald-600" />
            Knowledge Base & Vector Store
          </h2>
          <p className="text-sm text-gray-500 mt-1">Upload documents. We automatically chunk and embed them for semantic search.</p>
        </div>

        {/* Storage Usage Indicator */}
        <div className="min-w-[200px] bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-gray-600">Storage Used</span>
            <span className="text-xs font-bold text-gray-800">
              {storageStats.usedMB} MB / {storageStats.maxMB} MB
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${storageStats.percentUsed > 80
                  ? 'bg-gradient-to-r from-red-400 to-red-500'
                  : storageStats.percentUsed > 50
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                }`}
              style={{ width: `${Math.max(2, storageStats.percentUsed)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-gray-400">{files.length} files</span>
            <span className="text-[10px] text-gray-400">IndexedDB Persistent</span>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer relative overflow-hidden ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:bg-gray-50'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !processing && document.getElementById('kb-upload')?.click()}
      >
        {processing ? (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 size={32} className="text-emerald-600 animate-spin mb-2" />
            <span className="text-sm text-gray-600 font-medium">{statusMsg}</span>
          </div>
        ) : (
          <>
            <div className="bg-emerald-100 p-3 rounded-full mb-3 text-emerald-600">
              <Upload size={24} />
            </div>
            <h3 className="font-semibold text-gray-700">Click or Drag files to upload</h3>
            <p className="text-xs text-gray-400 mt-1">Supported: .txt, .md, .json, .pdf</p>
            <input
              id="kb-upload"
              type="file"
              className="hidden"
              accept=".txt,.md,.json,.csv,.pdf"
              onChange={handleFileInput}
            />
          </>
        )}
      </div>

      {/* File List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <div key={file.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
            <div className="bg-gray-100 p-2 rounded text-gray-500 relative">
              {file.name.endsWith('.json') ? <FileJson size={20} /> : file.type === 'application/pdf' ? <FileText size={20} className="text-red-500" /> : <FileType size={20} />}
              {file.isEmbedded && (
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-[2px] border border-white" title="Embedded">
                  <Check size={8} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-800 text-sm truncate" title={file.name}>{file.name}</h4>
              <p className="text-xs text-gray-400 mt-1">
                {file.chunks?.length || 0} chunks • Vectorized
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
              className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {files.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-400 text-sm">
            No files in the knowledge base.
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
        <Search className="text-blue-500 flex-shrink-0" size={20} />
        <div className="text-sm text-blue-800">
          <span className="font-semibold">Gemini File Search (RAG):</span> When you generate items in the Flow Builder, simply select a file. We will dynamically search these embeddings to find the most relevant context for your specific prompt.
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBank;
