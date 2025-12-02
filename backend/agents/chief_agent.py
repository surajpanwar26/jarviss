from typing import Dict, Any
from backend.agents.base_agent import BaseAgent
from backend.agents.researcher_agent import ResearcherAgent
from backend.agents.image_agent import ImageAgent
from backend.agents.source_agent import SourceAgent
from backend.agents.report_agent import ReportAgent
from backend.agents.ai_assistant_agent import AIAssistantAgent
from backend.agents.document_analyzer_agent import DocumentAnalyzerAgent
from backend.utils import logger

class ChiefAgent(BaseAgent):
    """Chief agent that orchestrates all other agents"""
    
    def __init__(self):
        super().__init__("Chief")
        self.researcher = ResearcherAgent()
        self.image_agent = ImageAgent()
        self.source_agent = SourceAgent()
        self.report_agent = ReportAgent()
        self.ai_assistant = AIAssistantAgent()
        self.document_analyzer = DocumentAnalyzerAgent()
    
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Orchestrate the research workflow"""
        logger.info(f"[{self.name}] Starting research workflow")
        
        try:
            # Check if this is a Q&A request
            if state.get("question"):
                # For Q&A, we only need the AI Assistant agent
                logger.info(f"[{self.name}] Processing Q&A request")
                state = await self.ai_assistant.execute(state)
            # Check if this is a document analysis request
            elif state.get("file_base64"):
                # For document analysis, we only need the Document Analyzer agent
                logger.info(f"[{self.name}] Processing document analysis request")
                state = await self.document_analyzer.execute(state)
            else:
                # For research requests, execute the full workflow
                logger.info(f"[{self.name}] Processing research request")
                
                # 1. Researcher Agent - Gather information
                state = await self.researcher.execute(state)
                
                # 2. Image Agent - Extract visual assets
                state = await self.image_agent.execute(state)
                
                # 3. Source Agent - Process sources
                state = await self.source_agent.execute(state)
                
                # 4. Report Agent - Generate report
                state = await self.report_agent.execute(state)
            
            logger.info(f"[{self.name}] Workflow completed successfully")
            return state
            
        except Exception as e:
            logger.error(f"[{self.name}] Workflow failed: {str(e)}")
            raise e