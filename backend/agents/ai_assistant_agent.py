import requests
import os
from typing import Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils import logger

class AIAssistantAgent(BaseAgent):
    """Agent responsible for answering questions using research context"""
    
    def __init__(self):
        super().__init__("AI Assistant")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
    
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Answer questions using the research context"""
        question = state.get("question", "")
        context = state.get("context", "")
        
        logger.info(f"[{self.name}] Answering question: {question}")
        
        if not self.google_api_key:
            raise Exception("GOOGLE_API_KEY not configured")
        
        if not question:
            logger.warning(f"[{self.name}] No question provided")
            state["answer"] = "No question provided."
            return state
        
        # Generate answer
        answer = self._generate_answer_with_gemini(question, context)
        
        logger.info(f"[{self.name}] Question answered successfully")
        
        # Update state
        state["answer"] = answer
        
        return state
    
    def _generate_answer_with_gemini(self, question: str, context: str) -> str:
        """Generate answer using Google Gemini API"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.google_api_key}"
        
        prompt = f"""You are a helpful AI assistant. Answer the following question using the provided context information.
        
Question: {question}

Context Information:
{context}

Provide a clear and concise answer based on the context. If the context doesn't contain relevant information, say so."""

        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.5,
                "maxOutputTokens": 2048
            }
        }
        
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.error(f"[{self.name}] Gemini QA failed: {str(e)}")
            raise Exception(f"Question answering failed: {str(e)}")