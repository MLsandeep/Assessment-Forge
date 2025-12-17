
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AssessmentItem, ItemSpecs } from "../types";

// Helper to get the AI client with dynamic key
const getAIClient = () => {
  const localKey = localStorage.getItem('af_api_key');
  const apiKey = localKey || process.env.API_KEY;

  if (!apiKey) {
    console.error("No API Key found in localStorage or environment");
  }

  return new GoogleGenAI({ apiKey: apiKey || '' });
};

// Helper to get the selected model
const getModel = () => {
  return localStorage.getItem('af_model') || "gemini-2.5-flash";
};

// Helper to strip Markdown code blocks if present
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json/, "").replace(/```$/, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```/, "").replace(/```$/, "");
  }
  return clean;
};

// Safe UUID generator
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// --- EMBEDDING UTILS (Used by vectorDb) ---

const EMBEDDING_MODEL = "text-embedding-004";

// Simple chunking: splits by double newline or max 800 characters
export const chunkText = (text: string): string[] => {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];

  for (const p of paragraphs) {
    if (p.length > 800) {
      // Very naive split for long paragraphs
      const sentences = p.match(/[^.!?]+[.!?]+/g) || [p];
      let currentChunk = "";
      for (const s of sentences) {
        if ((currentChunk + s).length > 800) {
          chunks.push(currentChunk.trim());
          currentChunk = s;
        } else {
          currentChunk += s;
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
    } else if (p.trim().length > 0) {
      chunks.push(p.trim());
    }
  }
  return chunks;
};

export const embedContent = async (text: string): Promise<number[]> => {
  if (!text || !text.trim()) return [];

  try {
    const ai = getAIClient();
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text
    });

    // Access the embedding property from the response
    // Using embeddings array as per type definition error suggestion
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error("Embedding error:", error);
    return [];
  }
};

// --- GENERATION SERVICES ---

export const generateTextItem = async (
  systemPrompt: string,
  specs: ItemSpecs,
  contextData: string = ""
): Promise<AssessmentItem> => {
  if (process.env.MOCK_AI === 'true') {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: 'mock-item-' + Date.now(),
      type: 'Multiple Choice',
      question: 'Mock Question',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
      rationale: 'Mock Rationale',
      difficulty: 'B1',
      topic: 'Mock Topic',
      skill: 'Mock Skill'
    };
  }
  const model = getModel();

  // Dynamic Schema Construction
  // Only include 'rationale' field if the system prompt explicitly mentions it.
  // This prevents the model from hallucinating or forcing a rationale when not needed.
  const includeRationale = systemPrompt.toLowerCase().includes("rationale");

  const schemaProperties: Record<string, Schema> = {
    question: { type: Type.STRING, description: "The stem of the question." },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of possible answers. Usually 4 options.",
    },
    correctAnswer: {
      type: Type.INTEGER,
      description: "The zero-based index of the correct option.",
    },
    passage: {
      type: Type.STRING,
      description: "An optional reading passage or context if required by the specs.",
    },
  };

  if (includeRationale) {
    schemaProperties["rationale"] = {
      type: Type.STRING,
      description: "Explanation for why the correct answer is correct and others are wrong.",
    };
  }

  const dynamicSchema: Schema = {
    type: Type.OBJECT,
    properties: schemaProperties,
    required: ["question", "options", "correctAnswer"],
  };

  const userPrompt = `
    Generate a ${specs.difficulty} level ${specs.type} assessment item about "${specs.topic}".
    Target Skill: ${specs.skill}.
    
    ${contextData ? `REFERENCE MATERIAL (Use this to ground your response):\n"""\n${contextData}\n"""\n` : ""}
    
    Ensure the item is psychometrically sound, free of bias, and has a clear correct answer.
  `;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: dynamicSchema,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text generated");

    const json = JSON.parse(cleanJson(text));
    return {
      id: generateId(),
      type: specs.type,
      topic: specs.topic,
      difficulty: specs.difficulty,
      skill: specs.skill,
      ...json,
    };
  } catch (error) {
    console.error("Error generating text item:", error);
    throw error;
  }
};


export const generateFreeform = async (
  systemPrompt: string,
  userInstruction: string,
  contextData: string = ""
): Promise<AssessmentItem> => {
  if (process.env.MOCK_AI === 'true') {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: 'mock-id-' + Date.now(),
      type: 'Freeform',
      question: 'Mock Content',
      options: [],
      correctAnswer: 0,
      rationale: '',
      freeformContent: JSON.stringify({
        essayContext: "Mock Essay Context",
        imageDescription: "Mock Image Description",
        content: "Mock Content"
      })
    };
  }

  const model = getModel();
  const prompt = `
    ${userInstruction}
    
    ${contextData ? `REFERENCE MATERIAL (Use this to ground your response):\n"""\n${contextData}\n"""\n` : ""}
  `;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return {
      id: generateId(),
      type: 'Freeform',
      question: undefined, // Was 'Generated Content', causing ExportNode to treat it as structured item
      options: [],
      correctAnswer: 0,
      rationale: '',
      freeformContent: response.text || "No content generated."
    };
  } catch (error) {
    console.error("Error generating freeform content:", error);
    throw error;
  }
};

// Helper to get the selected image model
const getImageModel = () => {
  return localStorage.getItem('af_image_model') || "gemini-2.5-flash-image";
};

export const generateItemImage = async (prompt: string): Promise<string> => {
  if (process.env.MOCK_AI === 'true') {
    await new Promise(resolve => setTimeout(resolve, 500));
    return "https://via.placeholder.com/1024x1024.png?text=Mock+Image";
  }

  // Use the selected image model
  const model = getImageModel();

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data found in response");
  } catch (error: any) {
    console.error("Image generation failed:", error);
    // Return the error message so it can be seen in the debug UI
    return `ERROR: ${error.message || error}`;
  }
};

export const evaluateItemQuality = async (item: AssessmentItem, criteria?: string): Promise<{ score: number; feedback: string }> => {
  const model = getModel();

  const prompt = `
    Analyze the following content for quality, alignment, and flaws.
    
    ${criteria ? `Specific Evaluation Criteria: ${criteria}` : ""}
    
    Item:
    ${JSON.stringify(item, null, 2)}
    
    Output a JSON object with:
    - score: integer 0-100
    - feedback: string (concise actionable feedback)
  `;

  const QA_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING }
    },
    required: ["score", "feedback"]
  };

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: QA_SCHEMA
      }
    });

    const text = response.text;
    if (!text) return { score: 0, feedback: "Error parsing QA response" };

    return JSON.parse(cleanJson(text));
  } catch (error) {
    console.error("Error evaluating quality:", error);
    return { score: 0, feedback: "Failed to evaluate quality." };
  }
};
