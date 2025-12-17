
import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
    addEdge,
    updateEdge,
    Background,
    Controls,
    Connection,
    Edge,
    Node as FlowNode,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    MiniMap,
    useReactFlow
} from 'reactflow';
import { TextGenNode, ImageGenNode, QualityNode, ExportNode } from './CustomNodes';
import { Play, RotateCcw, Bot, Image, CheckCircle, Save, AlertTriangle, AlertCircle, Download, Upload, FolderOpen, ChevronDown, X, Cpu, Square } from 'lucide-react';
import { AssessmentItem, SystemPrompt, KnowledgeFile, FlowNodeData, FlowTemplate } from '../types';
import { executeFlow } from '../services/flowExecutionService';

const nodeTypes = {
    textGen: TextGenNode,
    imageGen: ImageGenNode,
    quality: QualityNode,
    export: ExportNode,
};

// Default only Text and Export
const initialNodes: FlowNode<FlowNodeData>[] = [
    { id: '1', type: 'textGen', position: { x: 250, y: 100 }, data: { label: 'Text Generator', type: 'text', outputMode: 'assessment' } },
    { id: '2', type: 'export', position: { x: 250, y: 400 }, data: { label: 'Export', type: 'export' } },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
];

interface FlowBuilderProps {
    onItemGenerated: (item: AssessmentItem, origin?: 'guided' | 'flow') => void;
    availablePrompts: SystemPrompt[];
    availableFiles: KnowledgeFile[];
    savedFlows: FlowTemplate[];
    onSaveFlow: (template: FlowTemplate) => void;
    initialLoadFlowId?: string | null;
}

const FlowBuilderContent: React.FC<FlowBuilderProps> = ({ onItemGenerated, availablePrompts, availableFiles, savedFlows, onSaveFlow, initialLoadFlowId }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);

    // Abort Controller for stopping execution
    const abortControllerRef = useRef<AbortController | null>(null);

    // Key to force re-mount of React Flow on load
    const [flowKey, setFlowKey] = useState(0);

    // Save/Load Modal States
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [newFlowName, setNewFlowName] = useState("");

    const { setViewport, fitView } = useReactFlow();

    // --- Handlers (Prompt, Knowledge, Output) ---
    const onNodePromptChange = useCallback((nodeId: string, promptId: string) => {
        const selectedPrompt = availablePrompts.find(p => p.id === promptId);
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    const newOutputMode = selectedPrompt?.defaultMode || node.data.outputMode || 'assessment';
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            selectedPromptId: promptId,
                            outputMode: newOutputMode,
                            validationError: undefined, // Clear error on change
                            missingVariables: undefined
                        },
                    };
                }
                return node;
            })
        );
    }, [setNodes, availablePrompts]);

    const onOutputModeChange = useCallback((nodeId: string, mode: 'assessment' | 'freeform') => {
        setNodes((nds) =>
            nds.map(node => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, outputMode: mode } };
                }
                return node;
            })
        );
    }, [setNodes]);

    const onKnowledgeConfigChange = useCallback((nodeId: string, useKnowledge: boolean, fileId: string) => {
        setNodes((nds) =>
            nds.map(node => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, useKnowledge, knowledgeFileId: fileId } };
                }
                return node;
            })
        );
    }, [setNodes]);

    const onNodePromptVarChange = useCallback((nodeId: string, variable: string, value: string) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    // If the user starts typing, we assume they fixed the missing variable issue for this var
                    const newMissingVars = node.data.missingVariables?.filter(v => v !== variable);
                    const newValidationError = (newMissingVars && newMissingVars.length > 0)
                        ? `Missing Inputs: ${newMissingVars.join(', ')}`
                        : undefined;

                    return {
                        ...node,
                        data: {
                            ...node.data,
                            promptVariables: {
                                ...(node.data.promptVariables || {}),
                                [variable]: value
                            },
                            validationError: newValidationError,
                            missingVariables: newMissingVars
                        }
                    }
                }
                return node;
            })
        );
    }, [setNodes]);

    const onNodeQualityCriteriaChange = useCallback((nodeId: string, criteria: string) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, qualityCriteria: criteria } };
                }
                return node;
            })
        );
    }, [setNodes]);

    // Inject props into nodes
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.type === 'textGen') {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            prompts: availablePrompts,
                            files: availableFiles,
                            onPromptChange: onNodePromptChange,
                            onPromptVarChange: onNodePromptVarChange,
                            onOutputModeChange: onOutputModeChange,
                            onKnowledgeConfigChange: onKnowledgeConfigChange
                        }
                    };
                }
                if (node.type === 'quality') {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            prompts: availablePrompts,
                            onPromptChange: onNodePromptChange,
                            onQualityCriteriaChange: onNodeQualityCriteriaChange
                        }
                    }
                }
                return node;
            })
        );
    }, [availablePrompts, availableFiles, onNodePromptChange, onNodePromptVarChange, onOutputModeChange, onNodeQualityCriteriaChange, onKnowledgeConfigChange, setNodes]);


    // React Flow Handlers
    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
    const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)), [setEdges]);
    const onEdgeUpdateEnd = useCallback((_: any, edge: Edge) => setEdges((eds) => eds.filter((e) => e.id !== edge.id)), [setEdges]);
    const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => setEdges((eds) => eds.filter((e) => e.id !== edge.id)), [setEdges]);
    const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => { event.preventDefault(); if (window.confirm('Delete connection?')) setEdges((eds) => eds.filter((e) => e.id !== edge.id)); }, [setEdges]);
    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: FlowNode) => { event.preventDefault(); if (window.confirm(`Delete node "${node.data.label}"?`)) setNodes((nds) => nds.filter((n) => n.id !== node.id)); }, [setNodes]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type || !reactFlowInstance) return;

        const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        const newNode: FlowNode<FlowNodeData> = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            position,
            data: {
                label: `${type} node`,
                type: type as any,
                prompts: type === 'textGen' || type === 'quality' ? availablePrompts : undefined,
                files: type === 'textGen' ? availableFiles : undefined,
                outputMode: 'assessment',
                onPromptChange: onNodePromptChange,
                onPromptVarChange: onNodePromptVarChange,
                onOutputModeChange: onOutputModeChange,
                onKnowledgeConfigChange: onKnowledgeConfigChange,
                onQualityCriteriaChange: onNodeQualityCriteriaChange
            },
        };

        if (type === 'textGen') newNode.data.type = 'text';
        if (type === 'imageGen') newNode.data.type = 'image';
        if (type === 'quality') newNode.data.type = 'quality';
        if (type === 'export') newNode.data.type = 'export';

        setNodes((nds) => nds.concat(newNode));
    },
        [reactFlowInstance, setNodes, availablePrompts, availableFiles, onNodePromptChange, onNodePromptVarChange, onOutputModeChange, onKnowledgeConfigChange, onNodeQualityCriteriaChange]
    );

    // --- SAVE / LOAD LOGIC ---
    const handleSaveFlow = () => {
        if (!newFlowName.trim()) return;

        const cleanNodes = nodes.map(n => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: {
                label: n.data.label,
                type: n.data.type,
                selectedPromptId: n.data.selectedPromptId,
                outputMode: n.data.outputMode,
                useKnowledge: n.data.useKnowledge,
                knowledgeFileId: n.data.knowledgeFileId,
                promptVariables: n.data.promptVariables,
                qualityCriteria: n.data.qualityCriteria,
                status: 'idle' as const,
            }
        }));

        const template: FlowTemplate = {
            id: Date.now().toString(),
            name: newFlowName,
            description: `Created on ${new Date().toLocaleDateString()}`,
            nodes: cleanNodes as FlowNode<FlowNodeData>[],
            edges: edges.map(e => ({ ...e, selected: false, animated: true })),
            createdAt: Date.now()
        };
        onSaveFlow(template);
        setIsSaveModalOpen(false);
        setNewFlowName("");
    };

    const handleLoadFlow = (flowId: string) => {
        const template = savedFlows.find(f => f.id === flowId);
        if (template) {
            // Force re-mount of React Flow by changing key
            setFlowKey(prev => prev + 1);

            // Restore nodes with fresh handlers
            const restoredNodes = template.nodes.map(n => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: {
                    ...n.data,
                    prompts: availablePrompts,
                    files: availableFiles,
                    onPromptChange: onNodePromptChange,
                    onPromptVarChange: onNodePromptVarChange,
                    onOutputModeChange: onOutputModeChange,
                    onKnowledgeConfigChange: onKnowledgeConfigChange,
                    onQualityCriteriaChange: onNodeQualityCriteriaChange,
                    validationError: undefined,
                    missingVariables: undefined
                }
            }));

            setNodes(restoredNodes as FlowNode<FlowNodeData>[]);
            setEdges([...template.edges]);

            setIsLoadModalOpen(false); // Close modal

            setTimeout(() => {
                if (reactFlowInstance) {
                    reactFlowInstance.fitView({ padding: 0.2 });
                }
            }, 100);
        }
    };

    // Trigger load when initialLoadFlowId changes
    useEffect(() => {
        if (initialLoadFlowId) {
            handleLoadFlow(initialLoadFlowId);
        }
    }, [initialLoadFlowId]);

    // Diagnostics Test to ensure React Flow is capable of loading data
    const handleDiagnostics = () => {
        if (window.confirm("Run Diagnostics? This will clear the canvas and load a test pattern.")) {
            setFlowKey(prev => prev + 1);
            const testNodes: FlowNode<FlowNodeData>[] = [
                { id: 'd1', type: 'textGen', position: { x: 100, y: 100 }, data: { label: 'Test Text', type: 'text', outputMode: 'assessment', prompts: availablePrompts, files: availableFiles, onPromptChange: onNodePromptChange, onPromptVarChange: onNodePromptVarChange, onOutputModeChange: onOutputModeChange, onKnowledgeConfigChange: onKnowledgeConfigChange } },
                { id: 'd2', type: 'export', position: { x: 400, y: 100 }, data: { label: 'Test Export', type: 'export' } }
            ];
            const testEdges: Edge[] = [{ id: 'e-d1-d2', source: 'd1', target: 'd2', animated: true }];
            setNodes(testNodes);
            setEdges(testEdges);
            setIsLoadModalOpen(false);
            setTimeout(() => alert("Diagnostics Loaded. If you see two nodes, the engine is working."), 200);
        }
    };

    // --- VALIDATION & EXECUTION ---

    const validateGraph = (): boolean => {
        let isValid = true;
        const newNodes = nodes.map(node => {
            let error = undefined;
            let missingVars: string[] = [];

            if (node.type === 'textGen' || node.type === 'quality') {
                if (!node.data.selectedPromptId) {
                    error = "Prompt Config Required";
                    isValid = false;
                } else {
                    // Check prompt variables
                    const prompt = availablePrompts.find(p => p.id === node.data.selectedPromptId);
                    if (prompt) {
                        const requiredVars = prompt.content.match(/\{([^}]+)\}/g)?.map(m => m.slice(1, -1)) || [];
                        // Check which required vars are missing in the node's config
                        missingVars = requiredVars.filter(v => {
                            const val = node.data.promptVariables?.[v];
                            return !val || val.trim() === '';
                        });

                        // Special case: generic context variable often comes from upstream
                        missingVars = missingVars.filter(v => v !== '__main_content__');

                        // Check for incoming connections to this node
                        const hasIncomingConnection = edges.some(e => e.target === node.id);

                        // If there is an upstream connection, we assume the engine will inject context 
                        // (via __main_content__) to satisfy missing prompt variables.
                        // Therefore, we skip validation error for missing vars if connected.
                        if (hasIncomingConnection) {
                            missingVars = [];
                        }

                        if (missingVars.length > 0) {
                            error = `Missing Inputs: ${missingVars.join(', ')}`;
                            isValid = false;
                        }
                    }
                }
            }

            if (error) {
                return { ...node, data: { ...node.data, validationError: error, missingVariables: missingVars } };
            }
            return { ...node, data: { ...node.data, validationError: undefined, missingVariables: undefined } };
        });

        if (!isValid) {
            setNodes(newNodes);
            alert("Please fix the errors on the highlighted nodes before running.\n(Check for missing prompt selections or empty variable fields)");
        }

        return isValid;
    };

    const [executionError, setExecutionError] = useState<string | null>(null);

    const handleRunFlow = async () => {
        if (!validateGraph()) return;

        setIsRunning(true);
        setExecutionError(null); // Clear previous errors
        // Visual Reset
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'idle', output: undefined, debugPrompt: undefined } })));

        // Create Abort Controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // Execute Flow
            const finalOutput = await executeFlow({
                nodes: nodes as any, // Cast to any to avoid TS mismatch
                edges,
                availablePrompts,
                availableFiles,
                abortSignal: controller.signal,
                onNodeStatusUpdate: (id, status, output, debugPrompt) => {
                    setNodes(nds => nds.map(n => n.id === id ? {
                        ...n,
                        data: {
                            ...n.data,
                            status,
                            output: output !== undefined ? output : n.data.output,
                            debugPrompt: debugPrompt !== undefined ? debugPrompt : n.data.debugPrompt
                        }
                    } : n));
                }
            });

        } catch (e: any) {
            if (e.message !== "Execution aborted by user.") {
                const errorMessage = `Flow execution failed: ${e.message}`;
                setExecutionError(errorMessage);
                console.error(e);
            }
        } finally {
            setIsRunning(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    // Help Modal State
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    return (
        <div className="h-full flex flex-col gap-2">
            {/* Error Display */}
            {executionError && (
                <div id="error-log-display" className={`border px-4 py-3 rounded relative mb-2 flex items-start gap-3 ${executionError.includes('429') || executionError.includes('Quota') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700'}`} role="alert">
                    {executionError.includes('429') || executionError.includes('Quota') ? (
                        <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                    ) : (
                        <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                    )}
                    <div className="flex-1">
                        {executionError.includes('429') || executionError.includes('Quota') ? (
                            <div>
                                <strong className="font-bold block mb-1">Rate Limit Exceeded</strong>
                                <p className="text-xs opacity-90">
                                    You have exceeded the API quota for
                                    {executionError.match(/model:\s*([a-zA-Z0-9.-]+)/)?.[1] ? (
                                        <span className="font-bold mx-1">{executionError.match(/model:\s*([a-zA-Z0-9.-]+)/)?.[1]}</span>
                                    ) : (
                                        " the selected model"
                                    )}.
                                    Please wait a moment before trying again, or switch to a different model in User Settings.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <strong className="font-bold block mb-1">Execution Error</strong>
                                <span className="block sm:inline text-xs">{executionError}</span>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setExecutionError(null)} className="text-current opacity-50 hover:opacity-100 transition-opacity">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Help / Guide Modal */}
            {isHelpModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
                        <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
                            <h3 className="font-bold text-xl text-indigo-900 flex items-center gap-2">
                                <span className="bg-indigo-100 p-1.5 rounded-lg"><Bot size={20} className="text-indigo-600" /></span>
                                Flow Builder Guide
                            </h3>
                            <button onClick={() => setIsHelpModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 text-gray-700">

                            {/* Section 1: Connecting Nodes */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">1</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">Connecting Nodes</h4>
                                    <p className="text-sm leading-relaxed text-gray-600">
                                        Drag from the <span className="font-bold text-indigo-600">bottom handle</span> of one node to the <span className="font-bold text-gray-500">top handle</span> of another. This creates a data pipeline where output flows downstream.
                                    </p>
                                </div>
                            </div>

                            {/* Section 2: Prompt Chaining */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">2</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">Prompt Chaining & Variables</h4>
                                    <p className="text-sm leading-relaxed text-gray-600 mb-3">
                                        Use data from previous nodes by wrapping variable names in curly braces.
                                    </p>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{"{__main_content__}"}</span>
                                            <span className="text-gray-500">→ The entire text output of the previous node.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{"{custom_var}"}</span>
                                            <span className="text-gray-500">→ Specific JSON keys (e.g. loglines, topic).</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Output Keys */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-lg">3</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">Discovering Variables</h4>
                                    <p className="text-sm leading-relaxed text-gray-600">
                                        Look at the <span className="font-bold text-gray-700">Output Keys</span> section at the bottom of a completed node. These are the exact variable names you can use in the next node's prompt!
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <hr className="border-gray-200 my-4" />

                            {/* Section 4: Output Modes */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-lg">4</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 mb-2">Choosing Output Mode</h4>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                            <strong className="text-indigo-800 block mb-1">📝 Free Mode</strong>
                                            <p className="text-indigo-700">For stories, essays, outlines, blog posts. Text flows naturally.</p>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <strong className="text-green-800 block mb-1">📋 Item Mode</strong>
                                            <p className="text-green-700">For quizzes, MCQs with options, structured data the UI can display.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <hr className="border-gray-200 my-4" />

                            {/* Section 5: Example Flows */}
                            <div>
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="bg-pink-100 text-pink-600 text-xs px-2 py-0.5 rounded-full font-bold">EXAMPLES</span>
                                    Sample Flow Patterns
                                </h4>

                                {/* Example 1: Blog */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-3">
                                    <h5 className="font-bold text-blue-900 text-sm mb-2">🖊️ Blog Post Generator</h5>
                                    <div className="flex items-center gap-2 text-xs mb-2">
                                        <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-700">Outline (Free)</span>
                                        <span className="text-blue-400">→</span>
                                        <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-700">Writer (Free)</span>
                                        <span className="text-blue-400">→</span>
                                        <span className="bg-white px-2 py-1 rounded border border-gray-300 text-gray-600">Export</span>
                                    </div>
                                    <p className="text-xs text-blue-800">Both nodes use <strong>Free</strong> mode. Plain text flows automatically.</p>
                                </div>

                                {/* Example 2: Quiz */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                    <h5 className="font-bold text-green-900 text-sm mb-2">📚 Quiz Question Generator</h5>
                                    <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
                                        <span className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-700">Passage (Free)</span>
                                        <span className="text-green-400">→</span>
                                        <span className="bg-white px-2 py-1 rounded border border-green-300 text-green-700">MCQ (Item)</span>
                                        <span className="text-green-400">→</span>
                                        <span className="bg-white px-2 py-1 rounded border border-amber-300 text-amber-700">QA Check</span>
                                        <span className="text-green-400">→</span>
                                        <span className="bg-white px-2 py-1 rounded border border-gray-300 text-gray-600">Export</span>
                                    </div>
                                    <p className="text-xs text-green-800">The MCQ node uses <strong>Item</strong> mode to produce structured questions, options & rationale.</p>
                                </div>
                            </div>

                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setIsHelpModalOpen(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors">
                                Got it, let's build!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-96 border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-800">Save Flow Template</h3>
                        </div>
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Flow Name</label>
                        <input
                            className="w-full border border-gray-300 p-2 rounded-lg mb-4 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            placeholder="e.g. TOEFL Reading Generator"
                            value={newFlowName}
                            onChange={(e) => setNewFlowName(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleSaveFlow} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors font-medium">Save Template</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Load Modal */}
            {isLoadModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-0 rounded-xl shadow-2xl w-[500px] border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <FolderOpen size={18} className="text-indigo-600" /> Load Saved Flow
                            </h3>
                            <button onClick={() => setIsLoadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
                            {savedFlows.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                    <p>No saved flows found.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {savedFlows
                                        .filter(f => f.name !== 'TOEFL Integrated Writing (Parallel)') // Hide Parallel Flow (PARKED)
                                        .map(f => (
                                            <div key={f.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all flex justify-between items-center group">
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">{f.name}</h4>
                                                    <p className="text-xs text-gray-500">{new Date(f.createdAt).toLocaleDateString()} • {f.nodes.length} nodes</p>
                                                </div>
                                                <button
                                                    onClick={() => handleLoadFlow(f.id)}
                                                    className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-md font-medium hover:bg-indigo-100 transition-colors">
                                                    Load
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t bg-gray-50 text-right flex justify-between items-center">
                            <button
                                onClick={handleDiagnostics}
                                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                title="Load a test pattern to verify engine"
                            >
                                <Cpu size={12} /> Run Diagnostics
                            </button>
                            <button onClick={() => setIsLoadModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center justify-between text-xs text-amber-800 px-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span className="font-semibold">Playground Mode</span>
                </div>
                <button
                    onClick={() => setIsHelpModalOpen(true)}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                    <span className="bg-indigo-100 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">?</span>
                    How to Chain Prompts
                </button>
            </div>

            <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-4">
                    <div className="pb-2 border-b border-gray-200">
                        <h3 className="font-bold text-gray-700 text-sm">Nodes</h3>
                        <p className="text-xs text-gray-400">Drag to canvas</p>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-white p-2 border rounded shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-colors flex items-center gap-2" draggable onDragStart={(e) => onDragStart(e, 'textGen')}>
                            <Bot size={16} className="text-indigo-600" />
                            <span className="text-xs font-medium">Gemini Text</span>
                        </div>
                        {/* Image Gen Node (PARKED) */}
                        {/*
                        <div className="bg-white p-2 border rounded shadow-sm cursor-grab active:cursor-grabbing hover:border-pink-500 transition-colors flex items-center gap-2" draggable onDragStart={(e) => onDragStart(e, 'imageGen')}>
                            <Image size={16} className="text-pink-600" />
                            <span className="text-xs font-medium">Image Gen</span>
                        </div>
                        */}
                        <div className="bg-white p-2 border rounded shadow-sm cursor-grab active:cursor-grabbing hover:border-amber-500 transition-colors flex items-center gap-2" draggable onDragStart={(e) => onDragStart(e, 'quality')}>
                            <CheckCircle size={16} className="text-amber-600" />
                            <span className="text-xs font-medium">Quality Check</span>
                        </div>
                        <div className="bg-white p-2 border rounded shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-500 transition-colors flex items-center gap-2" draggable onDragStart={(e) => onDragStart(e, 'export')}>
                            <Save size={16} className="text-gray-600" />
                            <span className="text-xs font-medium">Export</span>
                        </div>
                    </div>

                    <div className="mt-auto border-t pt-4">
                        <button
                            onClick={() => setIsHelpModalOpen(true)}
                            className="w-full text-left text-[10px] text-gray-500 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded transition-colors"
                        >
                            <strong>Need Help?</strong><br />
                            Click here to learn about<br />
                            prompt chaining & variables.
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col h-full">
                    <div className="p-3 border-b flex justify-between items-center bg-white z-10">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsLoadModalOpen(true)}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium transition-colors bg-white"
                            >
                                <FolderOpen size={14} className="text-indigo-600" /> Load Flow
                            </button>

                            <button
                                onClick={() => setIsSaveModalOpen(true)}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium transition-colors bg-white"
                            >
                                <Save size={14} className="text-gray-500" /> Save Flow
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    // Reset with prompts injected
                                    const resetNodes = initialNodes.map(node => {
                                        if (node.type === 'textGen') {
                                            return {
                                                ...node,
                                                data: {
                                                    ...node.data,
                                                    prompts: availablePrompts,
                                                    files: availableFiles,
                                                    onPromptChange: onNodePromptChange,
                                                    onPromptVarChange: onNodePromptVarChange,
                                                    onOutputModeChange: onOutputModeChange,
                                                    onKnowledgeConfigChange: onKnowledgeConfigChange
                                                }
                                            };
                                        }
                                        return node;
                                    });
                                    setNodes(resetNodes);
                                    setEdges(initialEdges);
                                    setTimeout(() => reactFlowInstance?.fitView(), 50);
                                }}
                                className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 text-gray-600">
                                <RotateCcw size={12} /> Reset
                            </button>

                            {isRunning ? (
                                <button
                                    onClick={handleStop}
                                    className="px-3 py-1.5 text-xs bg-red-100 text-red-600 border border-red-200 rounded hover:bg-red-200 flex items-center gap-2 shadow-sm transition-all font-medium"
                                >
                                    <Square size={12} fill="currentColor" /> Stop
                                </button>
                            ) : (
                                <button
                                    onClick={handleRunFlow}
                                    className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded flex items-center gap-2 shadow-sm transition-all hover:bg-indigo-700 hover:shadow"
                                >
                                    <Play size={12} /> Execute Flow
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 outline-none relative" ref={reactFlowWrapper} tabIndex={0}>
                        <ReactFlow
                            key={flowKey}
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onEdgeUpdate={onEdgeUpdate}
                            onEdgeUpdateEnd={onEdgeUpdateEnd}
                            onEdgeDoubleClick={onEdgeDoubleClick}
                            onEdgeContextMenu={onEdgeContextMenu}
                            onNodeContextMenu={onNodeContextMenu}
                            onInit={(instance) => {
                                setReactFlowInstance(instance);
                                // Auto fit view on load
                                setTimeout(() => instance.fitView({ padding: 0.2 }), 100);
                            }}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            nodeTypes={nodeTypes}
                            defaultEdgeOptions={{
                                type: 'default',
                                deletable: true,
                                focusable: true,
                                updatable: true,
                                interactionWidth: 25,
                                animated: true,
                                style: { stroke: '#6366f1', strokeWidth: 2 }
                            }}
                            fitView
                            snapToGrid
                            deleteKeyCode={['Backspace', 'Delete']}
                        >
                            <Background color="#f1f1f1" gap={16} />
                            <Controls />
                            <MiniMap />
                        </ReactFlow>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Wrap in provider
const FlowBuilder = (props: FlowBuilderProps) => (
    <ReactFlowProvider>
        <FlowBuilderContent {...props} />
    </ReactFlowProvider>
);

export default FlowBuilder;
