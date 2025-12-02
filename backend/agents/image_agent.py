from typing import Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils import logger

class ImageAgent(BaseAgent):
    """Agent responsible for extracting and processing visual assets"""
    
    def __init__(self):
        super().__init__("Image")
    
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Extract images from research results"""
        logger.info(f"[{self.name}] Extracting visual assets")
        
        # Extract images from the search results
        search_results = state.get("search_results", {})
        images = []
        
        # Get images from Tavily search results
        if "images" in search_results:
            images.extend(search_results["images"])
        
        logger.info(f"[{self.name}] Extracted {len(images)} images")
        
        # Update state
        state["images"] = images
        
        return state