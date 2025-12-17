
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppMode, AssessmentItem, SystemPrompt, KnowledgeFile, FlowTemplate } from './types';
import GuidedMode from './components/GuidedMode';
import FlowBuilder from './components/FlowBuilder';
import ResultsView from './components/ResultsView';
import Library from './components/Library';
import PromptLibrary from './components/PromptLibrary';
import KnowledgeBank from './components/KnowledgeBank';
import SavedFlowsList from './components/SavedFlowsList';
import UserSettings from './components/UserSettings';
import { Layers, Zap, Database, MessageSquare, FileText, LayoutTemplate, User } from 'lucide-react';
import { vectorDb } from './services/vectorDb';
import { initialPrompts } from './data/initialPrompts';
import { defaultFlow } from './data/defaultFlow';
import { toeflFlow } from './data/toeflFlow';
import { defaultRulesContent } from './data/defaultRules';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.GUIDED);
  const [generatedItem, setGeneratedItem] = useState<AssessmentItem | null>(null);

  // Used to load a specific flow into the builder
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  // --- STATE WITH PERSISTENCE INITIALIZATION ---

  const [libraryItems, setLibraryItems] = useState<AssessmentItem[]>(() => {
    const saved = localStorage.getItem('af_library');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedFlows, setSavedFlows] = useState<FlowTemplate[]>(() => {
    const saved = localStorage.getItem('af_flows');
    let parsedFlows: FlowTemplate[] = saved ? JSON.parse(saved) : [];

    // CRITICAL FIX: Always remove the old version of the default flow and prepend the new one.
    // We also clean up previous versions (v1, v2) to avoid duplicates or stale data in the UI.
    const oldDefaultIds = ['standard-assessment-flow', 'standard-assessment-flow-v2', 'toefl-integrated-flow-v1'];
    parsedFlows = parsedFlows.filter(f => f.id !== defaultFlow.id && f.id !== toeflFlow.id && !oldDefaultIds.includes(f.id));

    return [defaultFlow, toeflFlow, ...parsedFlows];
  });

  // Knowledge Files are managed by vectorDb, but we keep a state sync for UI
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);

  const [prompts, setPrompts] = useState<SystemPrompt[]>(() => {
    const saved = localStorage.getItem('af_prompts');
    let parsed: SystemPrompt[] = saved ? JSON.parse(saved) : [];

    // Force update of core/initial prompts to ensure code changes (like prompt refinements) are applied
    const coreIds = new Set(initialPrompts.map(p => p.id));
    parsed = parsed.filter(p => !coreIds.has(p.id));
    return [...initialPrompts, ...parsed];
  });

  const topRef = useRef<HTMLDivElement>(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    // 1. Sync UI with VectorDB on load
    setKnowledgeFiles(vectorDb.getFiles());

    // 2. Ensure default knowledge base (14 Rules PDF) exists
    const initDefaultKB = async () => {
      try {
        await vectorDb.ensureDefault(
          'default-rules-pdf',
          '14 Rules for Writing MCQs (BYU)',
          defaultRulesContent
        );
        // Refresh state after potential ingestion
        setKnowledgeFiles(vectorDb.getFiles());
      } catch (err) {
        console.error("Failed to initialize default knowledge base:", err);
      }
    };

    initDefaultKB();
  }, []);

  // --- PERSISTENCE EFFECTS ---

  useEffect(() => {
    localStorage.setItem('af_library', JSON.stringify(libraryItems));
  }, [libraryItems]);

  useEffect(() => {
    localStorage.setItem('af_flows', JSON.stringify(savedFlows));
  }, [savedFlows]);

  useEffect(() => {
    localStorage.setItem('af_prompts', JSON.stringify(prompts));
  }, [prompts]);

  // Scroll to top when a new item is generated
  useEffect(() => {
    if (generatedItem && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generatedItem]);


  // --- HANDLERS ---

  // Updated to accept origin: 'guided' | 'flow'
  const handleItemGenerated = (item: AssessmentItem, origin: 'guided' | 'flow' = 'guided') => {
    const newItem = { ...item, createdAt: Date.now() };

    // VALIDATION LOGIC:
    const isValidItem = (newItem.question && newItem.question.trim().length > 0) ||
      (newItem.freeformContent && newItem.freeformContent.trim().length > 0);

    // Auto-save ONLY if it comes from the Standard Guided form.
    // Workflows (even inside Guided mode) should not auto-save to keep the bank clean.
    if (isValidItem && mode === AppMode.GUIDED && origin === 'guided') {
      setLibraryItems(prev => [newItem, ...prev]);
    }

    // Always show the result
    setGeneratedItem(newItem);
  };

  const handleManualSave = (item: AssessmentItem) => {
    setLibraryItems(prev => {
      // Check duplicates
      if (prev.some(i => i.id === item.id)) return prev;
      return [item, ...prev];
    });
  };

  const handleLibrarySelect = (item: AssessmentItem) => {
    setGeneratedItem(item);
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteLibraryItem = useCallback((id: string) => {
    setLibraryItems(prev => prev.filter(i => i.id !== id));

    // If we deleted the currently viewed item, clear the view
    if (generatedItem && generatedItem.id === id) {
      setGeneratedItem(null);
    }
  }, [generatedItem]);

  const handleUpdateLibraryItem = (updatedItem: AssessmentItem) => {
    setLibraryItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    if (generatedItem?.id === updatedItem.id) setGeneratedItem(updatedItem);
  };

  // --- IMPORT HANDLERS ---

  const handleImportLibrary = (items: AssessmentItem[]) => {
    // Merge with existing, avoiding duplicates by ID
    setLibraryItems(prev => {
      const currentIds = new Set(prev.map(i => i.id));
      const newItems = items.filter(i => !currentIds.has(i.id));
      return [...newItems, ...prev];
    });
  };

  const handleImportFlows = (flows: FlowTemplate[]) => {
    setSavedFlows(prev => {
      const currentIds = new Set(prev.map(f => f.id));
      const newFlows = flows.filter(f => !currentIds.has(f.id));
      return [...newFlows, ...prev];
    });
  };

  // --- PROMPT & KNOWLEDGE HANDLERS ---

  const handleAddPrompt = (prompt: SystemPrompt) => {
    setPrompts(prev => [...prev, prompt]);
  };

  const handleUpdatePrompt = (updatedPrompt: SystemPrompt) => {
    setPrompts(prev => prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p));
  };

  const handleDeletePrompt = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
  };

  const handleAddFile = (file: KnowledgeFile) => {
    setKnowledgeFiles(vectorDb.getFiles());
  };

  const handleDeleteFile = (id: string) => {
    setKnowledgeFiles(vectorDb.getFiles());
  };

  const handleSaveFlow = (flow: FlowTemplate) => {
    setSavedFlows(prev => {
      const exists = prev.some(f => f.id === flow.id);
      if (exists) return prev.map(f => f.id === flow.id ? flow : f);
      return [...prev, flow];
    });
  };

  const handleDeleteFlow = (flowId: string) => {
    if (window.confirm("Are you sure you want to delete this flow template?")) {
      setSavedFlows(prev => prev.filter(f => f.id !== flowId));
    }
  };

  const handleLoadFlow = (flowId: string) => {
    setActiveFlowId(flowId);
    setMode(AppMode.FLOW);
    setGeneratedItem(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-20 bg-gray-900 text-white flex flex-col items-center py-6 z-50">
        <div className="mb-8">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-xl font-bold">AF</div>
        </div>

        <nav className="flex-1 space-y-4 w-full px-2">
          <button
            onClick={() => { setMode(AppMode.GUIDED); setGeneratedItem(null); }}
            className={`w-full p-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${mode === AppMode.GUIDED ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Zap size={24} />
            <span className="text-[10px]">Guided</span>
          </button>

          <button
            onClick={() => { setMode(AppMode.FLOW); setGeneratedItem(null); setActiveFlowId(null); }}
            className={`w-full p-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${mode === AppMode.FLOW ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Layers size={24} />
            <span className="text-[10px]">Builder</span>
          </button>

          <button
            onClick={() => { setMode(AppMode.FLOW_LIBRARY); setGeneratedItem(null); }}
            className={`w-full p-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${mode === AppMode.FLOW_LIBRARY ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <LayoutTemplate size={24} />
            <span className="text-[10px] text-center leading-3">My Flows</span>
          </button>

          <div className="w-full border-t border-gray-800 my-2"></div>

          <button
            onClick={() => { setMode(AppMode.PROMPT_LIBRARY); setGeneratedItem(null); }}
            className={`w-full p-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${mode === AppMode.PROMPT_LIBRARY ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <MessageSquare size={24} />
            <span className="text-[10px] text-center">Prompts</span>
          </button>

          <button
            onClick={() => { setMode(AppMode.KNOWLEDGE_BASE); setGeneratedItem(null); }}
            className={`w-full p-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${mode === AppMode.KNOWLEDGE_BASE ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <FileText size={24} />
            <span className="text-[10px] text-center">Knowledge</span>
          </button>

          <button
            onClick={() => { setMode(AppMode.ITEM_BANK); setGeneratedItem(null); }}
            className={`w-full p-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${mode === AppMode.ITEM_BANK ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Database size={24} />
            <span className="text-[10px] text-center">Item Bank</span>
          </button>

          <div className="w-full border-t border-gray-800 my-2"></div>

          <button
            onClick={() => { setMode(AppMode.USER_SETTINGS); setGeneratedItem(null); }}
            className={`w-full p-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${mode === AppMode.USER_SETTINGS ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <User size={24} />
            <span className="text-[10px] text-center">User</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pl-20 min-h-screen">
        <header ref={topRef} className="bg-white border-b px-8 py-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Assessment Forge</h1>
            <p className="text-xs text-gray-500">AI-Powered Item Authoring</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">v1.7.0</span>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {generatedItem && (
            <div className="mb-12">
              <ResultsView
                item={generatedItem}
                onBack={() => setGeneratedItem(null)}
                onSaveToLibrary={handleManualSave}
                isSaved={libraryItems.some(i => i.id === generatedItem.id)}
              />
            </div>
          )}

          {/* Hide dashboard content when viewing a result */}
          {!generatedItem && (
            <div className="grid grid-cols-1 gap-8">
              {mode === AppMode.GUIDED && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <GuidedMode
                    onItemGenerated={handleItemGenerated}
                    savedFlows={savedFlows}
                    availablePrompts={prompts}
                    availableFiles={knowledgeFiles}
                  />
                </div>
              )}

              {mode === AppMode.FLOW && (
                <div className="h-[750px] animate-in slide-in-from-bottom-4 duration-500">
                  <FlowBuilder
                    onItemGenerated={handleItemGenerated}
                    availablePrompts={prompts}
                    availableFiles={knowledgeFiles}
                    savedFlows={savedFlows}
                    onSaveFlow={handleSaveFlow}
                    initialLoadFlowId={activeFlowId}
                  />
                </div>
              )}

              {mode === AppMode.FLOW_LIBRARY && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <SavedFlowsList
                    flows={savedFlows}
                    onDeleteFlow={handleDeleteFlow}
                    onLoadFlow={handleLoadFlow}
                    onImportFlows={handleImportFlows}
                  />
                </div>
              )}

              {mode === AppMode.PROMPT_LIBRARY && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <PromptLibrary
                    prompts={prompts}
                    onAddPrompt={handleAddPrompt}
                    onUpdatePrompt={handleUpdatePrompt}
                    onDeletePrompt={handleDeletePrompt}
                  />
                </div>
              )}

              {mode === AppMode.KNOWLEDGE_BASE && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <KnowledgeBank
                    files={knowledgeFiles}
                    onAddFile={handleAddFile}
                    onDeleteFile={handleDeleteFile}
                  />
                </div>
              )}

              {mode === AppMode.ITEM_BANK && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <Library
                    items={libraryItems}
                    onSelectItem={handleLibrarySelect}
                    onDeleteItem={handleDeleteLibraryItem}
                    onUpdateItem={handleUpdateLibraryItem}
                    onImportItems={handleImportLibrary}
                  />
                </div>
              )}

              {mode === AppMode.USER_SETTINGS && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <UserSettings />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
