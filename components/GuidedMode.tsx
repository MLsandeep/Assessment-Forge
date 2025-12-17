
import React, { useState, useEffect, useMemo } from 'react';
import { AssessmentItem, ItemSpecs, FlowTemplate, SystemPrompt, KnowledgeFile } from '../types';
import { executeFlow } from '../services/flowExecutionService';
import { Loader2, Wand2, Upload, AlertCircle, CheckCircle2, LayoutTemplate, Settings, FileText, Lock } from 'lucide-react';
import { defaultFlow } from '../data/defaultFlow';

interface GuidedModeProps {
  onItemGenerated: (item: AssessmentItem, origin?: 'guided' | 'flow') => void;
  savedFlows: FlowTemplate[];
  availablePrompts: SystemPrompt[];
  availableFiles: KnowledgeFile[];
}

// Use the ID directly from the source of truth to prevent version mismatch
const DEFAULT_FLOW_ID = defaultFlow.id;

const GuidedMode: React.FC<GuidedModeProps> = ({ onItemGenerated, savedFlows, availablePrompts, availableFiles }) => {
  const [mode, setMode] = useState<'standard' | 'workflow'>('standard');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  // --- STANDARD MODE STATE ---
  const [specs, setSpecs] = useState<ItemSpecs>({
    skill: 'Reading Comprehension',
    difficulty: 'B2',
    topic: 'Sustainable Urban Planning',
    type: 'Multiple Choice'
  });
  
  // Extra field for the Standard Flow
  const [examName, setExamName] = useState("TOEFL iBT");
  const [contextFile, setContextFile] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  // --- WORKFLOW MODE STATE ---
  // Default to the standard flow if available, else empty
  const [selectedFlowId, setSelectedFlowId] = useState<string>(() => {
      return savedFlows.some(f => f.id === DEFAULT_FLOW_ID) ? DEFAULT_FLOW_ID : "";
  });
  const [flowInputs, setFlowInputs] = useState<Record<string, string>>({});

  // Sync selectedFlowId if savedFlows changes (e.g. initial load)
  useEffect(() => {
      if (!selectedFlowId && savedFlows.some(f => f.id === DEFAULT_FLOW_ID)) {
          setSelectedFlowId(DEFAULT_FLOW_ID);
      }
  }, [savedFlows, selectedFlowId]);

  // Parse variables from the selected flow
  const flowVariables = useMemo(() => {
      if (!selectedFlowId) return [];
      const flow = savedFlows.find(f => f.id === selectedFlowId);
      if (!flow) return [];

      const downstreamNodeIds = new Set(flow.edges.map(e => e.target));
      const vars = new Set<string>();
      
      flow.nodes.forEach(node => {
          if (!downstreamNodeIds.has(node.id)) {
            if (node.type === 'textGen' && node.data.selectedPromptId) {
               const prompt = availablePrompts.find(p => p.id === node.data.selectedPromptId);
               if (prompt) {
                   const matches = prompt.content.match(/\{([^}]+)\}/g);
                   if (matches) {
                       matches.forEach(m => vars.add(m.slice(1, -1)));
                   }
               }
            }
          }
      });
      return Array.from(vars);
  }, [selectedFlowId, savedFlows, availablePrompts]);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setContextFile(event.target?.result as string);
        setFileName(file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleStandardGenerate = async () => {
    // Attempt to use the default flow
    const flow = savedFlows.find(f => f.id === DEFAULT_FLOW_ID);
    
    if (!flow) {
        // Alert the user because the button state won't show the error message when loading is false
        alert("Configuration Error: The Standard Assessment Flow (v3) was not found in your saved flows. Please try refreshing the page to restore default templates.");
        setStatus("Error: Flow not found.");
        return;
    }

    setLoading(true);
    setStatus("Initializing Standard Pipeline...");

    try {
        // Map form inputs to Flow Variables
        const standardInputs = {
            exam: examName,
            level: specs.difficulty,
            topic: specs.topic,
            word_count: '250',
            // In standard mode, we rely on the 14 Rules via RAG in the flow definition,
            // not an uploaded context file.
            __main_content__: "" 
        };

        const result = await executeFlow({
            nodes: flow.nodes.map(n => ({...n, data: {...n.data, status: 'idle'}})),
            edges: flow.edges,
            availablePrompts,
            availableFiles,
            initialInputs: standardInputs,
            onNodeStatusUpdate: (id, status) => {
                if (status === 'running') {
                    // Friendly status messages based on node type
                    const node = flow.nodes.find(n => n.id === id);
                    if (node?.data.label.includes("Passage")) setStatus("Step 1: Drafting Passage...");
                    else if (node?.data.label.includes("Item Generator")) setStatus("Step 2: Applying 14 Rules to Items...");
                    else if (node?.type === 'quality') setStatus("Step 3: Quality Assurance...");
                    else setStatus(`Processing ${node?.data.label || 'Node'}...`);
                }
            }
        });

        if (result) {
             // Pass 'flow' origin so it doesn't auto-save to Item Bank (respecting user preference)
             onItemGenerated(result, 'flow');
             setStatus("Done!");
        } else {
             setStatus("Generation completed but returned no output.");
        }

    } catch (error) {
      console.error(error);
      setStatus("Error occurred during generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowGenerate = async () => {
      const flow = savedFlows.find(f => f.id === selectedFlowId);
      if (!flow) return;

      setLoading(true);
      setStatus("Executing Workflow...");

      try {
          const result = await executeFlow({
              nodes: flow.nodes.map(n => ({...n, data: {...n.data, status: 'idle'}})), 
              edges: flow.edges,
              availablePrompts,
              availableFiles,
              initialInputs: flowInputs,
              onNodeStatusUpdate: (id, status) => {
                  if (status === 'running') setStatus(`Running node ${id}...`);
              }
          });

          if (result) {
              onItemGenerated(result, 'flow');
              setStatus("Workflow Complete!");
          } else {
              setStatus("Workflow finished but returned no output.");
          }
      } catch (err) {
          console.error(err);
          setStatus("Workflow Execution Failed.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="border-b pb-4 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wand2 className="text-indigo-600" />
            Guided Item Creator
            </h2>
            <p className="text-gray-500 mt-1">Configure your specifications and let the AI build a psychometrically sound item.</p>
        </div>
        
        {/* Mode Toggle */}
        <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
            <button 
                onClick={() => setMode('standard')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${mode === 'standard' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Settings size={14}/> Standard
            </button>
            <button 
                onClick={() => setMode('workflow')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${mode === 'workflow' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <LayoutTemplate size={14}/> Workflow
            </button>
        </div>
      </div>

      {mode === 'standard' ? (
        // --- STANDARD FORM (Now powered by Default Flow) ---
        <>
             <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg text-xs text-indigo-800 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                    <CheckCircle2 size={16} />
                    <span>Using Rules Enhanced Standard Flow</span>
                </div>
                <div className="pl-6 space-y-1 text-indigo-700 opacity-90">
                    <div className="flex items-start gap-2">
                        <span className="font-bold">1.</span>
                        <span>Generates an original passage based on your Topic.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-bold">2.</span>
                        <span>
                            Creates an item using <strong className="font-bold border-b border-indigo-300 border-dotted cursor-help" title="Using Vector Search against '14 Rules for Writing MCQs'">14 Rules for MCQ</strong> logic from the Knowledge Base.
                        </span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-bold">3.</span>
                        <span>Performs automated Quality Assurance check.</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Exam Name</label>
                    <input 
                        type="text" 
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        placeholder="e.g. TOEFL, IELTS, SAT"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Difficulty / Level</label>
                    <select 
                        value={specs.difficulty}
                        onChange={(e) => setSpecs({...specs, difficulty: e.target.value as any})}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                    >
                        <option>A1</option>
                        <option>A2</option>
                        <option>B1</option>
                        <option>B2</option>
                        <option>C1</option>
                        <option>C2</option>
                    </select>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Topic</label>
                    <input 
                        type="text" 
                        value={specs.topic}
                        onChange={(e) => setSpecs({...specs, topic: e.target.value})}
                        placeholder="e.g. Sustainable Urban Planning"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white text-gray-900"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                    <span>Context / Knowledge Base</span>
                    <span className="text-indigo-600 text-xs flex items-center font-medium">
                        <CheckCircle2 size={12} className="mr-1"/> Enforced
                    </span>
                </label>
                <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3 flex items-center gap-3">
                    <div className="bg-white p-2 rounded border border-indigo-100 text-indigo-600 shadow-sm">
                        <FileText size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">14 Rules for Writing MCQs (BYU)</h4>
                        <p className="text-xs text-indigo-700/80">Vector Knowledge Base active</p>
                    </div>
                    <div className="text-gray-400" title="Context is locked in Standard Mode">
                        <Lock size={16} />
                    </div>
                </div>
                 <p className="text-[10px] text-gray-400 text-center">
                    To use custom files, switch to <strong>Workflow Mode</strong>.
                </p>
            </div>
        </>
      ) : (
        // --- WORKFLOW MODE ---
        <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg text-sm text-indigo-800">
                <p>Select a saved flow. We will automatically detect required variables so you can run complex pipelines easily.</p>
            </div>

            <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Select Workflow</label>
                <select 
                    value={selectedFlowId}
                    onChange={(e) => setSelectedFlowId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                >
                    <option value="">-- Choose a Saved Flow --</option>
                    {savedFlows.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
            </div>

            {selectedFlowId && (
                <div className="space-y-4 border-t pt-4">
                     <h3 className="font-semibold text-gray-800">Workflow Inputs (Start Nodes)</h3>
                     {flowVariables.length === 0 ? (
                         <p className="text-sm text-gray-500 italic">No input variables needed for this flow (or they are all handled internally).</p>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {flowVariables.map(v => (
                                 <div key={v}>
                                     <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">{v}</label>
                                     <input 
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                        placeholder={`Enter ${v}...`}
                                        value={flowInputs[v] || ''}
                                        onChange={(e) => setFlowInputs({...flowInputs, [v]: e.target.value})}
                                     />
                                 </div>
                             ))}
                         </div>
                     )}
                </div>
            )}
        </div>
      )}

      <div className="pt-4 border-t">
        <button 
          onClick={mode === 'standard' ? handleStandardGenerate : handleWorkflowGenerate}
          disabled={loading || (mode === 'workflow' && !selectedFlowId)}
          className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-white transition-all
            ${loading || (mode === 'workflow' && !selectedFlowId) ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              {status}
            </>
          ) : (
            <>
              <Wand2 size={20} />
              {mode === 'standard' ? 'Generate Assessment Item' : 'Run Workflow'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GuidedMode;
