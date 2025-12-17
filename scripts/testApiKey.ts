
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

console.log("Testing API Key from .env...");
console.log(`Key found: ${apiKey ? "YES (starts with " + apiKey.substring(0, 8) + "...)" : "NO"}`);

if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY not found in .env");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

const modelsToTest = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
];

async function testModel(modelName: string) {
    console.log(`\n--- Testing Model: ${modelName} ---`);
    try {
        const response = await client.models.generateContent({
            model: modelName,
            contents: "Hello, are you working?",
        });
        console.log(`SUCCESS: Generated response length: ${response.text?.length}`);
    } catch (error: any) {
        console.error(`FAILURE: ${error.message}`);
        if (error.message.includes('429') || error.message.includes('Quota')) {
            console.error(">>> RATE LIMIT CONFIRMED <<<");
        }
    }
}

async function runTests() {
    for (const model of modelsToTest) {
        await testModel(model);
    }
}

runTests();
