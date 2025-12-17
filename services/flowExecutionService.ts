
import type { Node, Edge } from 'reactflow';
import { FlowNodeData, SystemPrompt, KnowledgeFile, AssessmentItem } from '../types';
import { generateTextItem, generateFreeform, generateItemImage, evaluateItemQuality } from './geminiService';
import { vectorDb } from './vectorDb';
import { searchRag, isRagBackendAvailable } from './ragApiClient';

interface ExecuteFlowOptions {
    nodes: Node<FlowNodeData>[];
    edges: Edge[];
    availablePrompts: SystemPrompt[];
    availableFiles: KnowledgeFile[];
    initialInputs?: Record<string, any>; // For injecting variables from Guided Mode
    onNodeStatusUpdate?: (nodeId: string, status: 'running' | 'completed' | 'error', output?: any, debugPrompt?: string) => void;
    abortSignal?: AbortSignal;
}

// Helper: Races the promise against the abort signal for immediate UI feedback
const runCancellable = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(new Error("Execution aborted by user."));

    return new Promise((resolve, reject) => {
        const onAbort = () => {
            signal.removeEventListener('abort', onAbort);
            reject(new Error("Execution aborted by user."));
        };

        signal.addEventListener('abort', onAbort);

        promise.then(
            (val) => {
                signal.removeEventListener('abort', onAbort);
                resolve(val);
            },
            (err) => {
                signal.removeEventListener('abort', onAbort);
                reject(err);
            }
        );
    });
};

export const executeFlow = async ({
    nodes,
    edges,
    availablePrompts,
    availableFiles,
    initialInputs = {},
    onNodeStatusUpdate,
    abortSignal
}: ExecuteFlowOptions): Promise<any> => {

    const runtimeOutputs = new Map<string, any>();
    let finalExportOutput = null;

    // 1. Build Dependency Graph
    const nodeMap = new Map<string, Node<FlowNodeData>>(nodes.map(n => [n.id, n]));
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(n => {
        adjacency.set(n.id, []);
        inDegree.set(n.id, 0);
    });

    edges.forEach(edge => {
        if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
            adjacency.get(edge.source)?.push(edge.target);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        }
    });

    // 2. Dynamic Parallel Execution Engine
    let activeNodes = 0;
    let hasError = false;

    return new Promise((resolve, reject) => {
        // Helper to run a single node
        const runNode = async (nodeId: string) => {
            if (hasError || abortSignal?.aborted) return;

            activeNodes++;
            const node = nodeMap.get(nodeId);

            if (!node) {
                activeNodes--;
                return;
            }

            try {
                if (onNodeStatusUpdate) onNodeStatusUpdate(node.id, 'running');

                // Gather Inputs
                const incomingEdges = edges.filter(e => e.target === node.id);
                const upstreamData: any = { ...initialInputs };

                incomingEdges.forEach(edge => {
                    const sourceOutput = runtimeOutputs.get(edge.source);
                    if (sourceOutput) {
                        Object.assign(upstreamData, sourceOutput);

                        // Try to parse freeformContent as JSON if it looks like it
                        if (sourceOutput.freeformContent && typeof sourceOutput.freeformContent === 'string') {
                            let content = sourceOutput.freeformContent.trim();
                            // Simple check for JSON-like structure
                            if (content.includes('{') && content.includes('}')) {
                                try {
                                    // Naive cleanup for markdown blocks without using backticks in source
                                    if (content.indexOf("json") > -1) {
                                        content = content.replace("json", "");
                                    }
                                    // Remove leading/trailing non-json chars (simple heuristic)
                                    const firstBrace = content.indexOf('{');
                                    const lastBrace = content.lastIndexOf('}');
                                    if (firstBrace > -1 && lastBrace > -1) {
                                        content = content.substring(firstBrace, lastBrace + 1);
                                    }

                                    const parsed = JSON.parse(content);
                                    Object.assign(upstreamData, parsed);
                                } catch (e) {
                                    // Ignore parse errors
                                }
                            }
                        }

                        // Helper keys for easier variable binding
                        if (sourceOutput.freeformContent) {
                            upstreamData['__main_content__'] = sourceOutput.freeformContent;
                        } else if (sourceOutput.question) {
                            upstreamData['__main_content__'] = sourceOutput.question;
                        } else if (sourceOutput.passage) {
                            upstreamData['__main_content__'] = sourceOutput.passage;
                        }
                    }
                });

                let output: any = null;
                let debugPrompt: string | undefined = undefined;

                // --- NODE EXECUTION LOGIC ---
                if (node.type === 'textGen') {
                    const promptId = node.data.selectedPromptId;
                    const selectedPrompt = availablePrompts.find(p => p.id === promptId);
                    let systemInstruction = selectedPrompt ? selectedPrompt.content : "You are an assessment expert.";

                    const mergedVariables = { ...node.data.promptVariables };

                    if (selectedPrompt) {
                        const requiredVars = selectedPrompt.content.match(/\{([^}]+)\}/g)?.map(m => m.slice(1, -1)) || [];
                        requiredVars.forEach(v => {
                            if (upstreamData[v]) {
                                mergedVariables[v] = String(upstreamData[v]);
                            } else if (upstreamData['__main_content__'] && (!mergedVariables[v] || mergedVariables[v].trim() === "")) {
                                mergedVariables[v] = String(upstreamData['__main_content__']);
                            }
                        });

                        Object.entries(mergedVariables).forEach(([key, value]) => {
                            // Replace {variable} with value
                            const regex = new RegExp("\\{" + key + "\\}", "g");
                            systemInstruction = systemInstruction.replace(regex, value as string);
                        });
                    }

                    let ragContext = "";
                    if (node.data.useKnowledge && node.data.knowledgeFileId) {
                        // Build a focused search query from variables, not the full prompt
                        const searchTerms: string[] = [];

                        // Extract key terms from variables
                        if (mergedVariables['topic']) searchTerms.push(mergedVariables['topic'] as string);
                        if (mergedVariables['subject']) searchTerms.push(mergedVariables['subject'] as string);
                        if (mergedVariables['skill']) searchTerms.push(mergedVariables['skill'] as string);
                        if (upstreamData.question) searchTerms.push(upstreamData.question);
                        if (upstreamData.passage) searchTerms.push(upstreamData.passage.substring(0, 200));

                        // If no specific terms, use the first 200 chars of the instruction
                        const searchQuery = searchTerms.length > 0
                            ? searchTerms.join(' ')
                            : systemInstruction.substring(0, 300);

                        console.log('[RAG] Search query:', searchQuery.substring(0, 100) + '...');

                        // Try Python RAG backend first (FREE local embeddings)
                        try {
                            const backendAvailable = await isRagBackendAvailable();
                            if (backendAvailable) {
                                console.log('[RAG] Using Python backend (FREE embeddings)');
                                const result = await runCancellable(
                                    searchRag(searchQuery, node.data.knowledgeFileId, 5),
                                    abortSignal
                                );
                                ragContext = result.chunks.join('\n\n');
                            } else {
                                // Fall back to browser-side vector DB
                                console.log('[RAG] Backend unavailable, using browser-side search');
                                ragContext = await runCancellable(
                                    vectorDb.similaritySearch(searchQuery, node.data.knowledgeFileId, 5),
                                    abortSignal
                                );
                            }
                        } catch (backendError) {
                            console.warn('[RAG] Backend error, falling back to browser:', backendError);
                            ragContext = await runCancellable(
                                vectorDb.similaritySearch(searchQuery, node.data.knowledgeFileId, 5),
                                abortSignal
                            );
                        }
                    }

                    // If RAG context is available, inject it directly into the system instruction
                    let enhancedInstruction = systemInstruction;
                    if (ragContext && ragContext.trim()) {
                        enhancedInstruction = `${systemInstruction}

---
IMPORTANT: Use the following REFERENCE MATERIAL from the knowledge base to inform your response. Base your answer on this content:

"""
${ragContext}
"""

Make sure to incorporate information from the reference material above in your response.
---`;
                    }

                    debugPrompt = enhancedInstruction;
                    if (ragContext) {
                        debugPrompt += "\n\n[RAG Context Injected(" + ragContext.length + " chars)]";
                    }

                    const topic = mergedVariables['topic'] || 'General';
                    const mode = node.data.outputMode || 'assessment';

                    if (mode === 'freeform') {
                        const generated = await runCancellable(
                            generateFreeform("You are a helpful assistant.", enhancedInstruction, ""), // Context already in instruction
                            abortSignal
                        );
                        // Merge upstream data (like imageUrl) with generated content
                        output = { ...upstreamData, ...generated };
                    } else {
                        const generated = await runCancellable(
                            generateTextItem(enhancedInstruction, { topic, skill: 'General', difficulty: 'B1', type: 'Multiple Choice' }, ""), // Context already in instruction
                            abortSignal
                        );
                        // Merge upstream data (like imageUrl) with generated content
                        output = { ...upstreamData, ...generated };
                    }

                } else if (node.type === 'imageGen') {
                    // Added imageDescription to priority list
                    const contextText = upstreamData.imageDescription || upstreamData.freeformContent || upstreamData.question || upstreamData.passage || "Assessment Item";

                    const img = await runCancellable(
                        generateItemImage("Illustration for: " + contextText.substring(0, 300)),
                        abortSignal
                    );
                    output = { ...upstreamData, imageUrl: img };

                } else if (node.type === 'quality') {
                    const itemToEval = { ...upstreamData };
                    const promptId = node.data.selectedPromptId;
                    const selectedPrompt = availablePrompts.find(p => p.id === promptId);
                    const criteria = selectedPrompt ? selectedPrompt.content : "General quality check.";

                    if (itemToEval.question || itemToEval.freeformContent) {
                        const qa = await runCancellable(
                            evaluateItemQuality(itemToEval, criteria),
                            abortSignal
                        );
                        output = { ...itemToEval, qualityScore: qa.score, qualityFeedback: qa.feedback };
                    } else {
                        output = itemToEval;
                    }

                } else if (node.type === 'export') {
                    output = upstreamData;
                    finalExportOutput = output;
                }

                // --- POST EXECUTION ---
                if (output) {
                    runtimeOutputs.set(node.id, output);
                }

                if (onNodeStatusUpdate) onNodeStatusUpdate(node.id, 'completed', output, debugPrompt);

                // Trigger Neighbors
                const neighbors = adjacency.get(nodeId) || [];
                for (const neighborId of neighbors) {
                    const currentInDegree = (inDegree.get(neighborId) || 0) - 1;
                    inDegree.set(neighborId, currentInDegree);

                    if (currentInDegree === 0) {
                        runNode(neighborId).catch(err => {
                            console.error("Failed to start neighbor node " + neighborId + ":", err);
                            // We don't reject here because runNode already handles rejection of the main promise
                        });
                    }
                }

            } catch (err) {
                hasError = true;
                if (onNodeStatusUpdate) onNodeStatusUpdate(node.id, 'error');
                reject(err);
            } finally {
                activeNodes--;
                if (activeNodes === 0 && !hasError) {
                    resolve(finalExportOutput);
                }
            }
        };

        // 3. Start Execution
        const startNodes: string[] = [];
        inDegree.forEach((degree, id) => {
            if (degree === 0) startNodes.push(id);
        });

        if (startNodes.length === 0 && nodes.length > 0) {
            // Cycle detected or no start nodes?
            reject(new Error("Invalid Flow: Cycle detected or no start node."));
            return;
        }

        if (nodes.length === 0) {
            resolve(null);
            return;
        }

        startNodes.forEach(id => runNode(id));
    });
};
