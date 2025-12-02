import requests
import os
from typing import Dict, Any
from backend.agents.base_agent import BaseAgent
from backend.utils import logger

class ReportAgent(BaseAgent):
    """Agent responsible for generating reports using Gemini"""
    
    def __init__(self):
        super().__init__("Report")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
    
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate report using Google Gemini"""
        topic = state.get("topic", "")
        is_deep = state.get("is_deep", False)
        context = state.get("context", "")
        
        logger.info(f"[{self.name}] Generating {'deep' if is_deep else 'quick'} report on: {topic}")
        
        if not self.google_api_key:
            raise Exception("GOOGLE_API_KEY not configured")
        
        # Generate report
        report_content = self._generate_report_with_gemini(topic, context, is_deep)
        
        logger.info(f"[{self.name}] Report generation completed")
        
        # Update state
        state["report"] = report_content
        
        return state
    
    def _generate_report_with_gemini(self, topic: str, context: str, is_deep: bool) -> str:
        """Generate report using Google Gemini API"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.google_api_key}"
        
        if is_deep:
            prompt = f"""You are a research analyst tasked with creating a comprehensive report on "{topic}".
            
Use the following context information to create a detailed report with:
1. An executive summary
2. Detailed analysis sections
3. Key findings
4. Conclusions and recommendations

Context Information:
{context}

Provide a well-structured markdown report with appropriate headings and sections."""
        else:
            prompt = f"""You are a research analyst tasked with creating a brief overview report on "{topic}".
            
Use the following context information to create a concise report with:
1. A brief summary
2. Key points
3. Main insights

Context Information:
{context}

Provide a well-structured markdown report with appropriate headings and sections."""
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 8192 if is_deep else 4096
            }
        }
        
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.error(f"[{self.name}] Gemini generation failed: {str(e)}")
            raise Exception(f"Report generation failed: {str(e)}")