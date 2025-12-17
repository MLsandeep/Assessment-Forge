"""
RAG Test Script using LangChain + FAISS

This script tests the RAG pipeline with your PDF file.

OPTION 1: Uses Gemini embeddings (requires API key)
OPTION 2: Uses FREE local HuggingFace embeddings (no API cost)

Usage:
  1. Install dependencies: pip install langchain langchain-community langchain-google-genai faiss-cpu pypdf sentence-transformers
  2. Place your PDF file in the same directory or update the path
  3. Run: python scripts/test_rag_python.py
"""

import os
from pathlib import Path

# -----------------------------
# CONFIGURATION
# -----------------------------
# Set to True to use FREE local embeddings, False to use Gemini API
USE_FREE_LOCAL_EMBEDDINGS = True

# Your PDF file path
PDF_PATH = "test_data/AutoSSD_Memo.pdf"  # Update this to your file path

# Gemini API key (only needed if USE_FREE_LOCAL_EMBEDDINGS = False)
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

# -----------------------------
# IMPORTS
# -----------------------------
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# -----------------------------
# CHECK PDF EXISTS
# -----------------------------
if not Path(PDF_PATH).exists():
    print(f"❌ PDF file not found: {PDF_PATH}")
    print("Please update PDF_PATH variable or place the file in the current directory.")
    exit(1)

print(f"📄 Loading PDF: {PDF_PATH}")

# -----------------------------
# LOAD DOCUMENT
# -----------------------------
loader = PyPDFLoader(PDF_PATH)
docs = loader.load()
print(f"✅ Loaded {len(docs)} pages")

# -----------------------------
# CHUNK DOCUMENT
# -----------------------------
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100,
    length_function=len,
)
chunks = splitter.split_documents(docs)
print(f"✅ Created {len(chunks)} chunks")

# -----------------------------
# EMBEDDINGS
# -----------------------------
if USE_FREE_LOCAL_EMBEDDINGS:
    print("🆓 Using FREE local embeddings (HuggingFace all-MiniLM-L6-v2)...")
    from langchain_community.embeddings import HuggingFaceEmbeddings
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )
else:
    print("💎 Using Gemini API embeddings...")
    if not GEMINI_API_KEY:
        print("❌ GOOGLE_API_KEY not set. Please set it or use USE_FREE_LOCAL_EMBEDDINGS = True")
        exit(1)
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

# -----------------------------
# VECTORSTORE (FAISS)
# -----------------------------
print("🔄 Building FAISS vector store...")
vectorstore = FAISS.from_documents(chunks, embeddings)
print("✅ FAISS vector store created!")

# -----------------------------
# RETRIEVER
# -----------------------------
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# -----------------------------
# TEST RETRIEVAL (without LLM)
# -----------------------------
print("\n" + "="*60)
print("🔍 TESTING RETRIEVAL (no LLM)")
print("="*60)

test_query = "What is this manual talking about? What are the three similarities currently used in operation?"
print(f"\n📝 Query: {test_query}\n")

retrieved_docs = retriever.invoke(test_query)

print(f"📚 Retrieved {len(retrieved_docs)} chunks:\n")
for i, doc in enumerate(retrieved_docs, 1):
    print(f"--- Chunk {i} ---")
    print(doc.page_content[:500])  # First 500 chars
    print()

# -----------------------------
# RAG CHAIN (with LLM) - Optional
# -----------------------------
RUN_WITH_LLM = False  # Set to True if you want to test with Gemini LLM

if RUN_WITH_LLM and GEMINI_API_KEY:
    print("\n" + "="*60)
    print("🤖 TESTING RAG WITH LLM")
    print("="*60)
    
    from langchain_google_genai import ChatGoogleGenerativeAI
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
    
    prompt = ChatPromptTemplate.from_template("""
Use ONLY the following context to answer:

{context}

Question: {question}
""")
    
    llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0)
    
    rag_chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    print(f"\n📝 Query: {test_query}\n")
    answer = rag_chain.invoke(test_query)
    print(f"🤖 Answer:\n{answer}")
else:
    print("\n💡 To test with LLM, set RUN_WITH_LLM = True and provide GEMINI_API_KEY")

print("\n" + "="*60)
print("✅ RAG Test Complete!")
print("="*60)
