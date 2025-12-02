from typing import Dict, List, Any
from backend.agents.base_agent import BaseAgent
from backend.utils import logger

class SourceAgent(BaseAgent):
    """Agent responsible for processing and validating sources"""
    
    def __init__(self):
        super().__init__("Source")
    
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Process and validate sources"""
        logger.info(f"[{self.name}] Processing sources")
        
        # Get sources from state
        sources = state.get("sources", [])
        
        # Deduplicate sources
        unique_sources = []
        seen_uris = set()
        
        for source in sources:
            uri = source.get("uri", "")
            if uri not in seen_uris:
                unique_sources.append(source)
                seen_uris.add(uri)
        
        logger.info(f"[{self.name}] Processed {len(unique_sources)} unique sources")
        
        # Update state
        state["sources"] = unique_sources
        
        return state