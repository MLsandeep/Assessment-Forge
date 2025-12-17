import { FlowTemplate, FlowNodeData } from '../types';
import { Node, Edge } from 'reactflow';

const nodes: Node<FlowNodeData>[] = [
    {
        id: 'node-context',
        type: 'textGen',
        position: { x: 250, y: 0 },
        data: {
            label: '1. Context Generator (JSON)',
            type: 'text',
            outputMode: 'freeform', // Outputs JSON string
            selectedPromptId: 'toefl-context-gen',
            promptVariables: {
                topic: 'The impact of social media on communication skills'
            }
        }
    },
    {
        id: 'node-essay',
        type: 'textGen',
        position: { x: 0, y: 350 },
        data: {
            label: '2. Essay Generator',
            type: 'text',
            outputMode: 'freeform',
            selectedPromptId: 'toefl-essay-gen',
            // 'essayContext' will be injected from node-context output
        }
    },
    {
        id: 'node-image',
        type: 'imageGen',
        position: { x: 500, y: 350 },
        data: {
            label: '2. Image Generator',
            type: 'image',
            // 'imageDescription' will be injected from node-context output and used by priority logic
        }
    },
    {
        id: 'node-item',
        type: 'textGen',
        position: { x: 250, y: 700 },
        data: {
            label: '3. Integrated Item Generator',
            type: 'text',
            outputMode: 'assessment',
            selectedPromptId: 'toefl-integrated-item',
            // Will receive outputs from both essay and image nodes (and transitively from context)
        }
    },
    {
        id: 'node-export',
        type: 'export',
        position: { x: 250, y: 1000 },
        data: {
            label: 'Final Output',
            type: 'export'
        }
    }
];

const edges: Edge[] = [
    { id: 'e1-2', source: 'node-context', target: 'node-essay', animated: true },
    { id: 'e1-3', source: 'node-context', target: 'node-image', animated: true },
    { id: 'e2-4', source: 'node-essay', target: 'node-item', animated: true },
    { id: 'e3-4', source: 'node-image', target: 'node-item', animated: true },
    { id: 'e4-5', source: 'node-item', target: 'node-export', animated: true },
];

export const toeflFlow: FlowTemplate = {
    id: 'toefl-integrated-flow-v1',
    name: 'TOEFL Integrated Writing (Parallel)',
    description: 'Generates essay and image context in parallel, then combines them into an integrated task.',
    nodes,
    edges,
    createdAt: Date.now()
};
