
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// For now, let's create a simple Google model without the BlockNote AI extension
// until we confirm the correct API for the installed BlockNote version
export const googleModel = createGoogleGenerativeAI({
  // pulls GOOGLE_GENERATIVE_AI_API_KEY from env
})("models/gemini-1.5-pro-latest");

// Commenting out the AI extension for now until we can verify the correct API
/*
import {
  createAIExtension,
  createBlockNoteAIClient,
} from "@blocknote/xl-ai";

export const aiClient = createBlockNoteAIClient({
  baseURL: process.env.NEXT_PUBLIC_BN_AI_PROXY ?? undefined,
  apiKey: process.env.NEXT_PUBLIC_BN_AI_PROXY_KEY ?? undefined,
});

export const aiExtension = createAIExtension({
  client: aiClient,
  defaultModel: googleModel,
});
*/
