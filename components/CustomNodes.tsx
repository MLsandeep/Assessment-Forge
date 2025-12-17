
import React, { memo, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { Bot, Image, FileText, CheckCircle, Save, Settings2, Eye, EyeOff, Copy, Database, ChevronDown, Maximize2, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { FlowNodeData } from '../types';

interface NodeWrapperProps {
    children: React.ReactNode;
    color: string;
    title: string;
    icon: any;
    selected?: boolean;
    status?: string;
    widthClass?: string;
    style?: React.CSSProperties;
    validationError?: string;
}

const NodeWrapper = ({ children, color, title, icon: Icon, selected, status, widthClass = "w-64", style, validationError }: NodeWrapperProps) => (
    <div
        className={`shadow-lg rounded-lg border-2 bg-white flex flex-col ${widthClass} ${validationError ? 'border-red-500 ring-2 ring-red-200' : selected ? 'border-blue-500' : 'border-gray-200'
            }`}
        style={{ ...style, minHeight: '100%' }}
    >
        <div className={`p-2 border-b flex items-center gap-2 ${validationError ? 'bg-red-500' : color} text-white rounded-t-md flex-shrink-0 transition-colors duration-300`}>
            <Icon size={16} />
            <span className="font-semibold text-xs uppercase tracking-wider truncate">{title}</span>
            {status === 'running' && <span className="ml-auto animate-pulse text-xs">●</span>}
            {status === 'completed' && <span className="ml-auto text-green-200">✓</span>}
            {validationError && <AlertCircle size={16} className="ml-auto text-white animate-pulse" />}
        </div>

        {validationError && (
            <div className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 border-b border-red-100 flex items-center gap-1">
                <AlertCircle size={10} /> {validationError}
            </div>
        )}

        <div className="p-3 text-left flex-1 flex flex-col min-h-0">
            {children}
        </div>
    </div>
);

// Helper for rendering clean text from Markdown
const SimpleMarkdownRenderer = ({ content, compact = false }: { content: string, compact?: boolean }) => {
    if (!content) return null;

    const parseBold = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const parseLine = (line: string, index: number) => {
        // Headers - hiding hashtags
        if (line.startsWith('### ')) return <h3 key={index} className={`${compact ? 'text-[11px] font-bold mt-2 mb-1' : 'text-lg font-bold mt-4 mb-2'} text-gray-800`}>{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={index} className={`${compact ? 'text-[12px] font-bold mt-2 mb-1 border-b border-gray-200' : 'text-xl font-bold mt-6 mb-3 border-b pb-1'} text-gray-900`}>{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={index} className={`${compact ? 'text-[13px] font-bold mt-3 mb-1' : 'text-2xl font-bold mt-8 mb-4'} text-gray-900`}>{line.slice(2)}</h1>;
        if (line.startsWith('---')) return <hr key={index} className={`${compact ? 'my-2' : 'my-4'} border-gray-200`} />;

        // Lists
        if (line.trim().match(/^[\*\-]\s/)) {
            return (
                <div key={index} className={`flex gap-2 ${compact ? 'ml-1 mb-0.5' : 'ml-2 mb-1'}`}>
                    <span className="text-gray-400 mt-[2px]">•</span>
                    <span className="flex-1">{parseBold(line.trim().substring(2))}</span>
                </div>
            );
        }

        // Empty lines
        if (!line.trim()) return <div key={index} className={compact ? 'h-1' : 'h-2'} />;

        return <p key={index} className={`${compact ? 'mb-1 leading-snug' : 'mb-2 leading-relaxed'} text-gray-700`}>{parseBold(line)}</p>;
    };

    return <div className="font-serif">{content.split('\n').map((line, i) => parseLine(line, i))}</div>;
};

export const TextGenNode = memo(({ id, data, selected }: NodeProps<FlowNodeData>) => {
    const [showDebug, setShowDebug] = useState(false);
    const selectedPrompt = data.prompts?.find(p => p.id === data.selectedPromptId);

    const variables = useMemo(() => {
        if (!selectedPrompt?.content) return [];
        const matches = selectedPrompt.content.match(/\{([^}]+)\}/g);
        if (!matches) return [];
        return Array.from(new Set(matches.map(m => m.slice(1, -1))));
    }, [selectedPrompt?.content]);

    return (
        <>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
            <NodeWrapper color="bg-indigo-600" title="Gemini Text Power" icon={Bot} selected={selected} status={data.status} validationError={data.validationError}>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Output Type</span>
                    <div className="flex bg-gray-100 rounded p-0.5">
                        <button
                            onClick={() => data.onOutputModeChange && data.onOutputModeChange(id, 'assessment')}
                            className={`text-[9px] px-1.5 py-0.5 rounded ${!data.outputMode || data.outputMode === 'assessment' ? 'bg-white shadow text-indigo-700 font-medium' : 'text-gray-400'}`}
                        >
                            Item
                        </button>
                        <button
                            onClick={() => data.onOutputModeChange && data.onOutputModeChange(id, 'freeform')}
                            className={`text-[9px] px-1.5 py-0.5 rounded ${data.outputMode === 'freeform' ? 'bg-white shadow text-indigo-700 font-medium' : 'text-gray-400'}`}
                        >
                            Free
                        </button>
                    </div>
                </div>

                <div className="mb-2">
                    <label className={`text-[9px] font-bold uppercase flex items-center justify-between ${!data.selectedPromptId ? 'text-red-500' : 'text-gray-500'}`}>
                        System Prompt
                        {!data.selectedPromptId && <AlertCircle size={10} />}
                    </label>
                    <select
                        className={`nodrag w-full text-[10px] mt-1 border rounded p-1 bg-white text-gray-900 focus:ring-1 outline-none ${!data.selectedPromptId ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                        value={data.selectedPromptId || ''}
                        onChange={(e) => data.onPromptChange && data.onPromptChange(id, e.target.value)}
                    >
                        <option value="">Select Prompt Template...</option>
                        {data.prompts?.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-3 bg-indigo-50 p-2 rounded border border-indigo-100">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[9px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                            <Database size={8} /> Use File Search
                        </label>
                        <input
                            type="checkbox"
                            checked={data.useKnowledge || false}
                            onChange={(e) => data.onKnowledgeConfigChange && data.onKnowledgeConfigChange(id, e.target.checked, data.knowledgeFileId || '')}
                            className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                    </div>

                    {data.useKnowledge && (
                        <select
                            className="nodrag w-full text-[10px] border border-gray-300 rounded p-1 bg-white text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={data.knowledgeFileId || ''}
                            onChange={(e) => data.onKnowledgeConfigChange && data.onKnowledgeConfigChange(id, true, e.target.value)}
                        >
                            <option value="">Select a file...</option>
                            {data.files?.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {variables.length > 0 && (
                    <div className="mb-2 space-y-1">
                        <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Internal Variables</p>
                        {variables.map(v => {
                            const isMissing = data.missingVariables?.includes(v);
                            return (
                                <div key={v} className="relative">
                                    <input
                                        type="text"
                                        className={`nodrag w-full text-[10px] border rounded p-1 bg-white text-gray-900 focus:ring-1 outline-none ${isMissing ? 'border-red-400 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                                        placeholder={`{${v}}`}
                                        value={data.promptVariables?.[v] || ''}
                                        onChange={(e) => data.onPromptVarChange && data.onPromptVarChange(id, v, e.target.value)}
                                    />
                                    {isMissing && (
                                        <span className="absolute right-2 top-1.5 text-red-500 text-[9px] font-bold pointer-events-none">Req</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex justify-between items-center text-[9px] text-gray-400 mt-2">
                    <div className="flex items-center gap-1">
                        <Settings2 size={10} />
                        {data.outputMode === 'freeform' ? 'Mode: Freeform' : 'Mode: Strict JSON'}
                    </div>
                    {data.debugPrompt && (
                        <button onClick={() => setShowDebug(!showDebug)} className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors" title="Verify Data Flow">
                            {showDebug ? <EyeOff size={12} /> : <Eye size={12} />}
                            <span className="text-[9px] font-bold">DEBUG</span>
                        </button>
                    )}
                </div>

                {showDebug && data.debugPrompt && (
                    <div className="mt-2 text-[9px] bg-gray-50 p-2 border border-indigo-100 rounded text-gray-600">
                        <strong className="block text-indigo-700 mb-1 border-b border-indigo-200 pb-1">Sent to AI (Verified):</strong>
                        <div className="max-h-60 overflow-y-auto whitespace-pre-wrap p-1 bg-white border border-gray-100 rounded text-[9px] font-mono scrollbar-thin scrollbar-thumb-gray-300">
                            {data.debugPrompt}
                        </div>
                    </div>
                )}

                {/* Output Preview for JSON keys */}
                {data.output && typeof data.output === 'object' && !data.output.question && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Output Keys</p>
                        <div className="flex flex-wrap gap-1">
                            {Object.keys(data.output).filter(k => !['freeformContent', 'id', 'type', 'options', 'correctAnswer', 'rationale', 'question'].includes(k)).map(k => (
                                <span key={k} className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">
                                    {k}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </NodeWrapper>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-600" />
        </>
    );
});

export const ImageGenNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
    return (
        <>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
            <NodeWrapper color="bg-pink-600" title="Image Power" icon={Image} selected={selected} status={data.status} validationError={data.validationError}>
                <p className="text-xs text-gray-600 mb-2">Generates supporting visuals.</p>
                <div className="text-[10px] bg-gray-100 p-1 rounded mb-2">
                    Model: {localStorage.getItem('af_image_model') || 'Default Image Model'}
                </div>
                {data.output?.imageUrl ? (
                    data.output.imageUrl.startsWith('ERROR:') ? (
                        <div className="bg-red-50 border border-red-200 rounded p-2 text-[10px] text-red-600 break-words">
                            <strong>Generation Failed:</strong><br />
                            {data.output.imageUrl.replace('ERROR:', '')}
                        </div>
                    ) : (
                        <div className="rounded overflow-hidden border border-gray-200">
                            <img src={data.output.imageUrl} alt="Generated" className="w-full h-auto object-cover" />
                        </div>
                    )
                ) : (
                    <div className="h-24 bg-gray-50 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-[10px]">
                        {data.status === 'running' ? 'Generating...' : 'No Image'}
                    </div>
                )}
            </NodeWrapper>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-pink-600" />
        </>
    );
});

export const QualityNode = memo(({ id, data, selected }: NodeProps<FlowNodeData>) => {
    const selectedPrompt = data.prompts?.find(p => p.id === data.selectedPromptId);

    return (
        <>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
            <NodeWrapper color="bg-amber-500" title="Quality Assurance" icon={CheckCircle} selected={selected} status={data.status} validationError={data.validationError}>
                <div className="mb-2">
                    <label className={`text-[9px] font-bold uppercase mb-1 flex items-center justify-between ${!data.selectedPromptId ? 'text-red-500' : 'text-gray-500'}`}>
                        QA Persona / Instructions
                        {!data.selectedPromptId && <AlertCircle size={10} />}
                    </label>
                    <select
                        className={`nodrag w-full text-[10px] border rounded p-1 bg-white text-gray-900 focus:ring-1 outline-none ${!data.selectedPromptId ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'}`}
                        value={data.selectedPromptId || ''}
                        onChange={(e) => data.onPromptChange && data.onPromptChange(id, e.target.value)}
                    >
                        <option value="">-- Select QA Prompt --</option>
                        {data.prompts?.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {selectedPrompt && (
                        <p className="text-[9px] text-gray-500 mt-1 italic truncate">{selectedPrompt.description}</p>
                    )}
                </div>

                {data.output && (
                    <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-amber-800 uppercase flex items-center gap-1">
                                <AlertTriangle size={10} /> Assessment Report
                            </span>
                            <span className={`text-xs font-bold ${data.output.qualityScore > 80 ? 'text-green-600' : 'text-amber-600'}`}>
                                {data.output.qualityScore}/100
                            </span>
                        </div>
                        <div className="max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-200">
                            <p className="text-[10px] text-amber-800 leading-relaxed">{data.output.qualityFeedback}</p>
                        </div>
                    </div>
                )}
            </NodeWrapper>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500" />
        </>
    );
});

export const ExportNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
    const [expanded, setExpanded] = useState(false);

    // Helper function to render a structured Assessment Item
    const renderStructuredItem = (item: any, isExpanded: boolean) => {
        return (
            <div className={`space-y-3 text-left ${isExpanded ? 'text-base' : 'text-xs'}`}>
                {/* Image (if present) */}
                {item.imageUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <img src={item.imageUrl} alt="Generated Visual" className="w-full h-auto object-cover max-h-64" />
                    </div>
                )}

                {/* Passage (if present) */}
                {item.passage && (
                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <strong className="block text-[10px] uppercase text-gray-400 mb-1">Passage Context</strong>
                        <div className={`font-serif text-gray-700 leading-relaxed ${!isExpanded ? 'max-h-24 overflow-y-auto' : ''}`}>
                            {item.passage}
                        </div>
                    </div>
                )}

                {/* Question */}
                <div>
                    <strong className={`block font-bold text-gray-900 mb-2 ${isExpanded ? 'text-lg' : 'text-sm'}`}>
                        {item.question}
                    </strong>

                    {/* Options */}
                    {Array.isArray(item.options) && (
                        <div className="space-y-1.5">
                            {item.options.map((opt: string, idx: number) => {
                                const isCorrect = idx === item.correctAnswer;
                                return (
                                    <div key={idx} className={`flex items-start gap-2 p-2 rounded border ${isCorrect
                                        ? 'bg-green-50 border-green-200 text-green-900'
                                        : 'bg-white border-transparent hover:border-gray-200'
                                        }`}>
                                        <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border ${isCorrect ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-gray-50'
                                            }`}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className={isCorrect ? 'font-medium' : 'text-gray-600'}>{opt}</span>
                                        {isCorrect && <CheckCircle size={14} className="text-green-600 mt-0.5 ml-auto" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Rationale */}
                {item.rationale && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-100 text-blue-900">
                        <strong className="block text-[10px] uppercase text-blue-400 mb-1">Rationale</strong>
                        <p className="leading-snug">{item.rationale}</p>
                    </div>
                )}

                {/* QA Feedback */}
                {(item.qualityScore !== undefined || item.qualityFeedback) && (
                    <div className={`p-3 rounded border ${item.qualityScore > 80 ? 'bg-green-50 border-green-100 text-green-900' :
                            item.qualityScore > 50 ? 'bg-amber-50 border-amber-100 text-amber-900' :
                                'bg-red-50 border-red-100 text-red-900'
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                            <strong className="text-[10px] uppercase opacity-60">QA Review</strong>
                            {item.qualityScore !== undefined && (
                                <span className="text-xs font-bold">IQS: {item.qualityScore}/100</span>
                            )}
                        </div>
                        {item.qualityFeedback && (
                            <p className="text-sm leading-snug">{item.qualityFeedback}</p>
                        )}
                    </div>
                )}

                {/* Metadata Footer */}
                <div className="pt-2 border-t flex flex-wrap gap-2 text-[10px] text-gray-400">
                    {item.difficulty && <span>Level: {item.difficulty}</span>}
                    {item.skill && <span>• Skill: {item.skill}</span>}
                    {item.topic && <span>• Topic: {item.topic}</span>}
                </div>
            </div>
        );
    };

    const renderContent = (isExpanded: boolean) => {
        if (!data.output) return <div className="text-gray-400 italic text-xs h-full flex items-center justify-center">Waiting for output...</div>;

        // 1. Structured Assessment Item (PRIORITY CHECK)
        // If it has a question, it's likely a structured item, even if it also has freeform content from upstream
        if (typeof data.output === 'object' && data.output.question) {
            return renderStructuredItem(data.output, isExpanded);
        }

        // 2. Freeform Content Object
        if (typeof data.output === 'object' && data.output.freeformContent) {
            return <SimpleMarkdownRenderer content={data.output.freeformContent} compact={!isExpanded} />;
        }

        // 3. Fallback: String or Raw JSON
        const textContent = typeof data.output === 'string'
            ? data.output
            : JSON.stringify(data.output, null, 2);

        return <SimpleMarkdownRenderer content={textContent} compact={!isExpanded} />;
    };

    return (
        <>
            <NodeResizer minWidth={300} minHeight={200} isVisible={selected} />
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
            {/* NodeWrapper style set to 100% to fill the Resizer container */}
            <NodeWrapper color="bg-gray-700" title="Final Export" icon={Save} selected={selected} status={data.status} widthClass="w-full" style={{ width: '100%', height: '100%', minHeight: '200px' }} validationError={data.validationError}>
                <div className="relative flex-1 flex flex-col min-h-0">
                    {data.output && (
                        <button
                            onClick={() => setExpanded(true)}
                            className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow border hover:bg-gray-50 text-gray-600 z-10 transition-transform hover:scale-110"
                            title="Expand View"
                        >
                            <Maximize2 size={12} />
                        </button>
                    )}

                    <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 p-1">
                        {renderContent(false)}
                    </div>
                </div>
            </NodeWrapper>

            {/* Expanded Modal */}
            {expanded && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <FileText size={20} className="text-indigo-600" />
                                Generated Output
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    const text = typeof data.output === 'string' ? data.output : data.output.freeformContent || JSON.stringify(data.output, null, 2);
                                    navigator.clipboard.writeText(text);
                                }} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500" title="Copy to Clipboard">
                                    <Copy size={18} />
                                </button>
                                <button onClick={() => setExpanded(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 overflow-y-auto bg-white">
                            <div className="prose max-w-none">
                                {renderContent(true)}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});
