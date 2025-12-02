import { ResearchResult, ChatMessage } from "../types";

const API_URL = "http://localhost:8000/api";

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
        const text = await response.text();
        let errorDetail = response.statusText;
        try {
            const json = JSON.parse(text);
            errorDetail = json.detail || text;
        } catch (e) { errorDetail = text; }
        
        throw new Error(`Backend Error (${response.status}): ${errorDetail}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error("Research API Error:", error);
      throw error;
    }
  },

  chat: async (history: ChatMessage[], context: string, question: string) => {
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: history.map(h => ({ role: h.role, content: h.content })), 
          context: context || "", 
          question: question 
        })
      });
      
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ detail: response.statusText }));
         throw new Error(errorData.detail || "Chat failed");
      }
      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error("Chat API Error:", error);
      throw error;
    }
  }
};
