
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  createAIExtension,
  createBlockNoteAIClient,
} from "@blocknote/xl-ai";

// 1) normalise client settings ──
export const googleModel = createGoogleGenerativeAI({
  // pulls GOOGLE_GENERATIVE_AI_API_KEY from env
})("models/gemini-1.5-pro-latest");

// 2) optional: tunnel through the proxy shipped with @blocknote/xl-ai-server
export const aiClient = createBlockNoteAIClient({
  // if you're *not* proxying leave these out
  baseURL: process.env.NEXT_PUBLIC_BN_AI_PROXY ?? undefined,
  apiKey: process.env.NEXT_PUBLIC_BN_AI_PROXY_KEY ?? undefined,
});

// 3) turn it into an editor extension
export const aiExtension = createAIExtension({
  client: aiClient,       // gives us retry, streaming, cost calc…
  defaultModel: googleModel,
});
