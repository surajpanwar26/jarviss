import { ResearchResult, ChatMessage } from "../types";
import { getLLMProvider } from "./llmProvider";

/**
 * RAG / Document Analysis
 */
export const analyzeDocument = async (fileBase64: string, mimeType: string): Promise<ResearchResult> => {
  try {
    // Use backend API for document analysis
    const response = await fetch("http://localhost:8001/api/document-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_base64: fileBase64,
        mime_type: mimeType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Document analysis failed");
    }

    const result: ResearchResult = await response.json();
    return result;
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
    // Use backend API for Q&A
    const response = await fetch("http://localhost:8001/api/question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: question,
        context: context,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Q&A failed");
    }

    const result = await response.json();
    return result.answer;
  } catch (error) {
    console.error("Chat failed:", error);
    throw error;
  }
};