import { ResearchResult, ChatMessage } from "../types";
import { getLLMProvider } from "./llmProvider";
import { GoogleGenAI } from "@google/genai";
import { config } from "./config";

/**
 * RAG / Document Analysis
 */
export const analyzeDocument = async (fileBase64: string, mimeType: string): Promise<ResearchResult> => {
  try {
    // 1. Preferred: Multimodal Gemini (if key exists)
    // This allows analyzing images, PDFs with charts, etc.
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

    // 2. Fallback: Text-based LLMs (Groq / Hugging Face)
    // These models cannot see images or read binary PDFs natively via API usually.
    // We decode base64 to text (works for .txt, .csv, .md, .json, .code).
    if (mimeType.startsWith('text/') || mimeType.includes('csv') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) {
       const llm = getLLMProvider();
       let decodedContent = "";
       try {
         decodedContent = atob(fileBase64);
       } catch (e) {
         throw new Error("Could not decode file content. Please upload a plain text or CSV file for this provider.");
       }

       // Truncate to avoid context limits (approx 30k chars is safe for most models)
       const truncatedContent = decodedContent.substring(0, 30000); 
       
       const report = await llm.generate({
         prompt: `Analyze this document content:\n\n${truncatedContent}...\n\n(Content truncated for analysis)`,
         systemInstruction: "You are an Expert Data Analyst. Provide a detailed summary and insight report based on the file content provided."
       });
       
       return { 
         report, 
         sources: [{ title: "Uploaded Text File", uri: "#local-file" }], 
         images: [] 
       };
    }

    throw new Error("Current Provider (Groq/HF) supports Text/CSV files only. Please add a Google API Key for PDF/Image analysis.");

  } catch (error: any) {
    console.error("Doc analysis failed:", error);
    return {
      report: `**Analysis Error**\n\nCould not process document: ${error.message}`,
      sources: [],
      images: []
    };
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
    
    // Ensure context isn't massive
    const safeContext = context.substring(0, 20000);

    const prompt = `REFERENCE CONTEXT:\n${safeContext}\n\nCHAT HISTORY:\n${conversation}\n\nUSER QUESTION: ${question}`;
    
    return await llm.generate({
      prompt,
      systemInstruction: "You are JARVIS. Answer the user's question accurately based *only* on the provided Reference Context. If the answer is not in the context, state that."
    });
  } catch (error) {
    console.error("Chat failed:", error);
    throw error;
  }
};