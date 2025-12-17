/**
 * RAG Test Script
 * 
 * This script tests the vector database retrieval by:
 * 1. Listing all files in IndexedDB
 * 2. Testing similarity search with a specific query
 * 
 * Run with: npx ts-node scripts/testRag.ts
 */

// Since IndexedDB is browser-only, we can't test it directly from Node.js
// Instead, this script generates test code you can paste in the browser console

console.log(`
================================================================================
RAG TEST INSTRUCTIONS
================================================================================

Since the vector database is stored in IndexedDB (browser-side), you need to 
test it in the browser console. Here's how:

1. Open http://localhost:3000 in Chrome
2. Press F12 to open Developer Tools
3. Go to the "Console" tab
4. Paste the following code:

================================================================================
`);

const testCode = `
// ===== RAG TEST SCRIPT =====
// Paste this in your browser console at http://localhost:3000

(async () => {
  // Import vectorDb from the app's module scope
  // The app exposes it via window for debugging
  const { vectorDb } = await import('/services/vectorDb.ts');
  
  console.log('\\n=== STEP 1: List all files in database ===');
  const files = vectorDb.getFilesSync();
  console.table(files.map(f => ({
    id: f.id,
    name: f.name,
    chunks: f.chunks?.length || 0,
    hasEmbeddings: f.chunks?.some(c => c.embedding?.length > 0) || false
  })));
  
  if (files.length === 0) {
    console.warn('No files found! Please upload a PDF first.');
    return;
  }
  
  // Find the SSD file
  const ssdFile = files.find(f => f.name.toLowerCase().includes('ssd'));
  console.log('\\n=== STEP 2: Found SSD file? ===', ssdFile?.name || 'NOT FOUND');
  
  if (ssdFile) {
    console.log('\\n=== STEP 3: Testing similarity search ===');
    const query = "What is this manual talking about? What are the three similarities currently used in operation?";
    console.log('Query:', query);
    
    const result = await vectorDb.similaritySearch(query, ssdFile.id, 5);
    console.log('\\n=== RESULT ===');
    console.log(result);
  }
})();
`;

console.log(testCode);

console.log(`
================================================================================

ALTERNATIVE: Check IndexedDB directly in browser:

1. Open Developer Tools (F12)
2. Go to "Application" tab
3. In the left sidebar, expand "IndexedDB"
4. Look for "assessment-forge-vectordb"
5. Click on "files" to see all stored documents

================================================================================
`);
