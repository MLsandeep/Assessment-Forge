
import { Node, Edge } from 'reactflow';

export enum AppMode {
  GUIDED = 'guided',
  FLOW = 'flow',
  FLOW_LIBRARY = 'flow_library',
  ITEM_BANK = 'item_bank',
  USER_SETTINGS = 'user_settings',
  PROMPT_LIBRARY = 'prompts',
  KNOWLEDGE_BASE = 'knowledge',
}

export interface AssessmentItem {
  id: string;
  passage?: string;
  question?: string;
  options?: string[];
  correctAnswer?: number; // Index of correct option
  rationale?: string;
  skill?: string;
  difficulty?: string;
  imageUrl?: string;
  qualityScore?: number;
  qualityFeedback?: string;
  topic?: string;
  createdAt?: number;
  
  // New field for generic output
  type?: 'Multiple Choice' | 'True/False' | 'Short Answer' | 'Freeform';
  freeformContent?: string;
}

export interface ItemSpecs {
  skill: string;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Beginner' | 'Intermediate' | 'Advanced';
  topic: string;
  type: 'Multiple Choice' | 'True/False' | 'Short Answer' | 'Freeform';
}

export interface GenerationConfig {
  systemPrompt: string;
  specs: ItemSpecs;
  contextData?: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  description: string;
  defaultMode?: 'assessment' | 'freeform'; // Auto-selects mode when chosen
}

export interface KnowledgeChunk {
  text: string;
  embedding: number[];
}

export interface KnowledgeFile {
  id: string;
  name: string;
  content: string;
  type: string;
  uploadDate: number;
  chunks?: KnowledgeChunk[]; // Stores RAG chunks
  isEmbedded?: boolean; 
}

export interface FlowNodeData {
  label: string;
  type: 'text' | 'image' | 'knowledge' | 'quality' | 'export';
  config?: any;
  status?: 'idle' | 'running' | 'completed' | 'error';
  output?: any;
  
  // For TextGenNode
  prompts?: SystemPrompt[];
  selectedPromptId?: string;
  outputMode?: 'assessment' | 'freeform'; // Toggle between strict JSON item or free text
  onPromptChange?: (nodeId: string, promptId: string) => void;
  onOutputModeChange?: (nodeId: string, mode: 'assessment' | 'freeform') => void;
  
  // Knowledge / RAG Configuration
  useKnowledge?: boolean;
  knowledgeFileId?: string;
  files?: KnowledgeFile[]; // Available files to select from
  onKnowledgeConfigChange?: (nodeId: string, useKnowledge: boolean, fileId: string) => void;

  // Dynamic variables for prompts (e.g. {topic}, {tone}) - Internal to node
  promptVariables?: Record<string, string>;
  onPromptVarChange?: (nodeId: string, variable: string, value: string) => void;
  
  // Debugging
  debugPrompt?: string; // Stores the final interpolated prompt sent to AI

  // For QualityNode
  qualityCriteria?: string;
  onQualityCriteriaChange?: (nodeId: string, criteria: string) => void;

  // Validation
  validationError?: string;
  missingVariables?: string[]; // List of variable names that are empty
}

export interface FlowTemplate {
    id: string;
    name: string;
    description: string;
    nodes: Node<FlowNodeData>[];
    edges: Edge[];
    createdAt: number;
}
