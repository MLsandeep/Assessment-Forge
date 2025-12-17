import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
dotenv.config({ path: '.env.local' });
process.env.MOCK_AI = 'true'; // Uncomment to use mock AI responses

// Mock browser APIs if needed
// Mock localStorage
const localStorageMock = {
    getItem: (key: string) => {
        if (key === 'af_api_key') return process.env.GEMINI_API_KEY || 'test-key';
        if (key === 'af_model') return 'gemini-2.0-flash';
        if (key === 'af_image_model') return 'gemini-2.5-flash-image';
        return null;
    },
    setItem: () => { },
    removeItem: () => { },
    clear: () => { }
};
(global as any).localStorage = localStorageMock;
(global as any).window = { localStorage: localStorageMock }; // Mock window

// Define types locally since we can't import them easily with dynamic imports mixed with static types
// or just use 'any' for simplicity in this test script
// But we can import types statically as they are erased at runtime
import type { Node, Edge } from 'reactflow';

async function runTest() {
    console.log("Starting Parallel Flow Test...");

    // Dynamic imports to ensure mocks are set before modules load
    const { executeFlow } = await import('../services/flowExecutionService');
    const { toeflFlow } = await import('../data/toeflFlow');
    const { initialPrompts } = await import('../data/initialPrompts');

    console.log("Flow ID:", toeflFlow.id);
    console.log("Nodes:", toeflFlow.nodes.map(n => n.id).join(', '));

    try {
        const result = await executeFlow({
            nodes: toeflFlow.nodes,
            edges: toeflFlow.edges,
            availablePrompts: initialPrompts,
            availableFiles: [],
            initialInputs: {},
            onNodeStatusUpdate: (id, status, output, debug) => {
                console.log(`[${new Date().toISOString()}] Node ${id}: ${status}`);
                if (status === 'error') {
                    console.error(`!!! Node ${id} FAILED !!!`);
                }
                if (status === 'completed') {
                    // console.log(`Output preview:`, output ? JSON.stringify(output).substring(0, 50) + "..." : "null");
                }
            }
        });

        console.log("Flow Execution Completed Successfully!");
        console.log("Final Result:", JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Flow Execution Failed with Error:", error);
    }
}

runTest();
