
import { GoogleGenAI, Chat } from "@google/genai";
import { GroundingChunk, GameTurnData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

// Mizzou Coordinates (University of Missouri, Columbia)
const MIZZOU_LAT = 38.9404;
const MIZZOU_LNG = -92.3277;

const SYSTEM_INSTRUCTION = `
You are a Spanish Quest Guide at the **University of Missouri (Mizzou)**.
You do NOT chat. You output strict JSON data for the game interface.

**GAME CONFIGURATION:**
- **Location:** University of Missouri Campus (Columbia, MO).
- **Focus:** "Se Impersonal" (Signs/Rules) and "Se Accidental" (Mishaps).

**YOUR TASK:**
1. Select a specific Mizzou landmark.
2. Create a two-step challenge:
   - Step A: An English question about the situation/rule (Context).
   - Step B: A Spanish "Se" grammar fill-in-the-blank that matches that context.
3. Return the data as a raw JSON object.

**GRAMMAR RULES:**
1. **Se Impersonal (Signs/Rules):** "Se necesita", "Se prohíbe", "Se vende", "Aquí se estudia", "Se sacan fotos".
2. **Se Accidental (Mishaps):** "Se me olvidó (I forgot)", "Se le cayó (He dropped)", "Se nos perdió (We lost)".

**JSON FORMAT:**
You must return ONLY a JSON object. Do not wrap in markdown.
{
  "locationName": "Name of the place",
  "locationType": "One keyword for image search: 'library', 'gym', 'pizza', 'hospital', 'park', 'store', 'coffee', 'pool', 'lab', 'stadium'",
  "englishQuestion": "An open-ended question in English about the rule or situation here (e.g., 'We are in the library. What is the most important rule?')",
  "spanishConcept": "The target context in Spanish (e.g., 'Precisely. Strict silence is required here.')",
  "question": "The fill-in-the-blank sentence including the verb hint in parens (e.g., 'Aquí _____ (exigir) silencio.')",
  "options": ["Option A", "Option B", "Option C"],
  "correctAnswer": "The correct option string",
  "explanation": "Brief grammar explanation.",
  "isGameOver": boolean (true only after 10 turns)
}

**TURN MANAGEMENT (10 Stops):**
- Turn 1: Ellis Library (Se Impersonal - Silence).
- Turn 2: Mizzou Rec Complex (Se Accidental - Dropping weights).
- Turn 3: The Columns / Francis Quadrangle (Se Impersonal - Taking photos / 'Se sacan fotos').
- Turn 4: Shakespeare's Pizza (Se Accidental - Spilling food/drink).
- Turn 5: The Mizzou Store (Se Impersonal - Selling books / 'Se venden').
- Turn 6: University Hospital (Se Impersonal - Speaking softly / 'Se habla bajo').
- Turn 7: Geology Building / Museum (Se Impersonal - Do not touch / 'Se prohíbe tocar').
- Turn 8: Tiger Grotto (Se Impersonal - Swimming / 'Se nada').
- Turn 9: Chemistry/Science Lab (Se Impersonal - Safety / 'Se protegen los ojos').
- Turn 10: Memorial Stadium (Se Impersonal - Cheering / 'Se grita MIZ-ZOU').
`;

let chatSession: Chat | null = null;

export const initChat = async (lat?: number, lng?: number) => {
  // IGNORE user lat/lng to force Mizzou experience
  const retrievalConfig = {
    retrievalConfig: {
      latLng: {
        latitude: MIZZOU_LAT,
        longitude: MIZZOU_LNG
      }
    }
  };

  // IMPORTANT: Removed responseMimeType and responseSchema to fix "unsupported" error with Maps
  chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleMaps: {} }],
      toolConfig: retrievalConfig,
    },
  });

  return chatSession;
};

export const sendMessage = async (message: string): Promise<{ turnData: GameTurnData; groundingChunks?: GroundingChunk[] }> => {
  if (!chatSession) {
    throw new Error("Chat session not initialized");
  }

  try {
    const result = await chatSession.sendMessage({ message });
    
    // CLEAN UP RESPONSE: The model might return Markdown ```json ... ```
    let text = result.text || "{}";
    text = text.replace(/```json\n?|\n?```/g, "").trim();

    let turnData: GameTurnData;
    try {
        turnData = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse AI JSON. Raw text:", text);
        turnData = {
            locationName: "Connection Error",
            locationType: "park",
            englishQuestion: "Something went wrong. Can you reload?",
            spanishConcept: "Error",
            question: "Try refreshing the page.",
            options: ["Reload"],
            correctAnswer: "Reload",
            explanation: "JSON Parse Error",
            isGameOver: false
        };
    }

    const candidate = result.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

    return { turnData, groundingChunks };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Generates a transitional "Bridge" sentence.
 * It acknowledges what the user typed in English (Phase 1) and pivots to the required grammar context (Phase 2).
 */
export const generateBridgeResponse = async (userInput: string, targetContext: string): Promise<string> => {
    try {
        const bridgePrompt = `
            You are a helpful Spanish tutor in a game context.
            Target Grammar Context: "${targetContext}"
            User's Input: "${userInput}"
            
            Task: Create a 1-sentence conversational bridge.
            1. Acknowledge the user's input politely (even if it's slightly off).
            2. Smoothly pivot to the Target Grammar Context.
            
            Example:
            User: "We can walk around."
            Target: "Se sacan fotos" (Photos are taken).
            Response: "Yes, walking is great, but this spot is actually most famous for taking photos."
            
            Output only the response text.
        `;
        
        // We use a fresh single-turn generation for this, no need for game history context
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: bridgePrompt
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Bridge generation error:", error);
        return targetContext; // Fallback to original context if AI fails
    }
};
