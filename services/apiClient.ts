import { ResearchResult, ChatMessage } from "../types";

const API_URL = "http://localhost:8001/api";

export const api = {
  health: async () => {
    try {
      // Add timeout to prevent long hanging if backend is down
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const res = await fetch(`${API_URL}/research`, { 
        method: 'OPTIONS', // Lightweight check
        signal: controller.signal 
      }).catch(() => null);
      
      clearTimeout(timeoutId);
      return res ? true : false; 
    } catch (e) {
      return false;
    }
  },

  startResearch: async (topic: string, isDeep: boolean): Promise<ResearchResult> => {
    try {
      const response = await fetch(`${API_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Strictly match Python snake_case Pydantic model
        body: JSON.stringify({ 
          topic: topic, 
          is_deep: isDeep 
        }) 
      });
      
      if (!response.ok) {
        let errorMessage = `Backend Error (${response.status})`;
        try {
           // Try to parse detailed JSON error from FastAPI
           const errorData = await response.json();
           if (errorData.detail) errorMessage = errorData.detail;
           else if (errorData.message) errorMessage = errorData.message;
        } catch (parseError) {
           // Fallback to text if JSON parse fails
           const text = await response.text();
           if (text) errorMessage = `${errorMessage}: ${text}`;
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error("Research API Error:", error);
      throw error; // Re-throw to be caught by UI
    }
  },

  chat: async (history: ChatMessage[], context: string, question: string) => {
    try {
      const response = await fetch(`${API_URL}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: question,
          context: context || ""
        })
      });
      
      if (!response.ok) {
         let errorMessage = "Q&A failed";
         try {
            const errorData = await response.json();
            if (errorData.detail) errorMessage = errorData.detail;
         } catch (e) {
            errorMessage = response.statusText;
         }
         throw new Error(errorMessage);
      }
      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error("Q&A API Error:", error);
      throw error;
    }
  }
};