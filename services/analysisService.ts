import { ResearchResult, ChatMessage } from "../types";
import { getLLMProvider } from "./llmProvider";
import { GoogleGenAI } from "@google/genai"; // Still needed for Multimodal (File Upload) specifically

// Note: Standard LLM Providers (OpenAI/Groq) usually don't support direct PDF ingestion via base64 in the same way Gemini does.
// For Doc Analysis, we will stick to Gemini if available, or try to text-decode if using Groq (simplified for this demo).

import { config } from "./config";

/**
 * RAG / Document Analysis
 */
export const analyzeDocument = async (fileBase64: string, mimeType: string): Promise<ResearchResult> => {
  try {
    // Special Case: For PDF/Image analysis, Gemini is vastly superior to text-only LLMs like Llama3.
    // We try to use Gemini explicitly for this task if the key exists.
    if (config.googleApiKey) {
       const ai = new GoogleGenAI({ apiKey: config.googleApiKey });
       const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType, data: fileBase64 } },
            { text: "Generate a comprehensive analysis report. Structure: Executive Summary, Key Findings, Risks, Conclusion." }
          ]
        },
        config: {
          thinkingConfig: { thinkingBudget: 2048 } 
        }
      });
      return {
        report: response.text || "Analysis failed.",
        sources: [{ title: "Uploaded Document", uri: "#local-file" }],
        images: []
      };
    }

    // Fallback for Groq (Text Only - This would fail for PDFs in a real app without a PDF parser, 
    // but we'll assume text/csv for the fallback path or fail gracefully).
    if (mimeType.includes('text') || mimeType.includes('csv')) {
       const llm = getLLMProvider();
       const decoded = atob(fileBase64); // Simple decode for text files
       const report = await llm.generate({
         prompt: `Analyze this document content:\n\n${decoded.substring(0, 20000)}...`, // Truncate for token limits
         systemInstruction: "You are a Data Analyst."
       });
       return { report, sources: [{ title: "Uploaded Text", uri: "#local-file" }], images: [] };
    }

    throw new Error("Document analysis requires Gemini API Key for multimodal support.");

  } catch (error) {
    console.error("Doc analysis failed:", error);
    throw error;
  }
};

/**
 * Chat / Q&A Service
 */
export const askFollowUp = async (
  history: ChatMessage[], 
  context: string, 
  question: string
): Promise<string> => {
  try {
    const llm = getLLMProvider();
    
    // Format history for context
    const conversation = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');
    const prompt = `REFERENCE CONTEXT:\n${context}\n\nCHAT HISTORY:\n${conversation}\n\nUSER QUESTION: ${question}`;
    
    return await llm.generate({
      prompt,
      systemInstruction: "You are JARVIS. Answer based on the provided Context."
    });
  } catch (error) {
    console.error("Chat failed:", error);
    throw error;
  }
};
