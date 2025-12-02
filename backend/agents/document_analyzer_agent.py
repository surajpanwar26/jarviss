import requests
import os
from typing import Dict, Any
from .base_agent import BaseAgent
from ..utils import logger

class DocumentAnalyzerAgent(BaseAgent):
    """Agent responsible for analyzing documents using Google Gemini"""
    
    def __init__(self):
        super().__init__("Document Analyzer")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
    
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze document using Google Gemini"""
        file_base64 = state.get("file_base64", "")
        mime_type = state.get("mime_type", "text/plain")
        
        logger.info(f"[{self.name}] Analyzing document with MIME type: {mime_type}")
        
        if not self.google_api_key:
            raise Exception("GOOGLE_API_KEY not configured")
        
        if not file_base64:
            raise Exception("No document content provided")
        
        # Analyze document using Google Gemini
        analysis_result = self._analyze_document_with_gemini(file_base64, mime_type)
        
        logger.info(f"[{self.name}] Document analysis completed")
        
        # Update state
        state["report"] = analysis_result
        state["sources"] = [{"title": "Uploaded Document", "uri": "#local-file"}]
        state["images"] = []
        
        return state
    
    def _analyze_document_with_gemini(self, file_base64: str, mime_type: str) -> str:
        """Analyze document using Google Gemini API"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.google_api_key}"
        
        payload = {
            "contents": [{
                "parts": [
                    {"inlineData": {"mimeType": mime_type, "data": file_base64}},
                    {"text": "Generate a comprehensive analysis report. Structure: Executive Summary, Key Findings, Risks, Conclusion."}
                ]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 8192
            }
        }
        
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.error(f"[{self.name}] Gemini document analysis failed: {str(e)}")
            raise Exception(f"Document analysis failed: {str(e)}")