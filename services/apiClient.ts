
import { ResearchResult, ChatMessage } from "../types";

const API_URL = "http://localhost:8000/api";

export const api = {
  health: async () => {
    try {
      const res = await fetch(`${API_URL}/`);
      return res.ok;
    } catch {
      return false;
    }
  },

  startResearch: async (topic: string, isDeep: boolean): Promise<ResearchResult> => {
    const response = await fetch(`${API_URL}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, is_deep: isDeep })
    });
    
    if (!response.ok) throw new Error("Backend research failed");
    return await response.json();
  },

  chat: async (history: ChatMessage[], context: string, question: string) => {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        history: history.map(h => ({ role: h.role, content: h.content })), 
        context, 
        question 
      })
    });
    
    if (!response.ok) throw new Error("Chat failed");
    const data = await response.json();
    return data.answer;
  }
};
