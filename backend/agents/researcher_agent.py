import requests
import os
from typing import Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils import logger

class ResearcherAgent(BaseAgent):
    """Agent responsible for web research using Tavily API"""
    
    def __init__(self):
        super().__init__("Researcher")
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
    
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Perform web research on the given topic"""
        topic = state.get("topic", "")
        is_deep = state.get("is_deep", False)
        
        logger.info(f"[{self.name}] Starting research on topic: {topic}")
        
        if not self.tavily_api_key:
            raise Exception("TAVILY_API_KEY not configured")
        
        # Perform search
        search_query = f"comprehensive information about {topic}" if is_deep else f"overview of {topic}"
        search_results = self._perform_tavily_search(search_query)
        
        # Process results
        context = ""
        sources = []
        images = []
        
        if "results" in search_results:
            for result in search_results["results"]:
                context += f"\n\nTitle: {result.get('title', 'Unknown')}\nContent: {result.get('content', '')}\n"
                sources.append({
                    "title": result.get('title', 'Unknown'),
                    "uri": result.get('url', '#')
                })
        
        # Extract images
        if "images" in search_results:
            images = search_results["images"]
        
        logger.info(f"[{self.name}] Collected {len(sources)} sources and {len(images)} images")
        
        # Update state
        state["context"] = context
        state["sources"] = sources
        state["images"] = images
        state["search_results"] = search_results
        
        return state
    
    def _perform_tavily_search(self, query: str) -> Dict[str, Any]:
        """Perform search using Tavily API"""
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": self.tavily_api_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": True,
            "include_images": True,  # Include images for visual assets
            "include_raw_content": False,
            "max_results": 5
        }
        
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"[{self.name}] Tavily search failed: {str(e)}")
            raise Exception(f"Search failed: {str(e)}")