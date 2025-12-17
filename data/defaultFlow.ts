
import { FlowTemplate, FlowNodeData } from '../types';
import { Node, Edge } from 'reactflow';

const nodes: Node<FlowNodeData>[] = [
  {
    id: 'node-1',
    type: 'textGen',
    position: { x: 250, y: 0 },
    data: {
      label: '1. Passage Generator',
      type: 'text',
      outputMode: 'freeform',
      selectedPromptId: 'prompt-gen-passage',
      promptVariables: {
        exam: 'TOEFL iBT',
        level: 'B2',
        word_count: '250'
      }
    }
  },
  {
    id: 'node-2',
    type: 'textGen',
    position: { x: 250, y: 350 },
    data: {
      label: '2. Item Generator (Rules Enhanced)',
      type: 'text',
      outputMode: 'assessment',
      selectedPromptId: 'prompt-gen-mcq',
      promptVariables: {
        exam: 'TOEFL iBT'
      },
      // Uses the "14 Rules" PDF to guide question generation
      useKnowledge: true,
      knowledgeFileId: 'default-rules-pdf'
    }
  },
  {
    id: 'node-3',
    type: 'quality',
    position: { x: 250, y: 700 },
    data: {
      label: '3. Quality Check',
      type: 'quality',
      // Explicitly select the standard QA prompt to pass validation
      selectedPromptId: 'prompt-quality-check'
    }
  },
  {
    id: 'node-4',
    type: 'export',
    position: { x: 250, y: 950 },
    data: {
      label: 'Final Output',
      type: 'export'
    }
  }
];

const edges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
  { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true },
  { id: 'e3-4', source: 'node-3', target: 'node-4', animated: true },
];

export const defaultFlow: FlowTemplate = {
  id: 'standard-assessment-flow-v3', // Incremented version to ensure it replaces old cache
  name: 'Standard Assessment Flow',
  description: 'Generates passage and questions, using the "14 Rules for MCQs" knowledge base to ensure best practices.',
  nodes,
  edges,
  createdAt: Date.now()
};
