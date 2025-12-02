from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import List, Optional
import logging
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the FastAPI app
app = FastAPI(title="JARVIS Research System API")

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str
    is_deep: bool

class QuestionRequest(BaseModel):
    question: str
    context: str

class DocumentAnalysisRequest(BaseModel):
    file_base64: str
    mime_type: str

class Source(BaseModel):
    title: Optional[str] = None
    uri: str

class ResearchResult(BaseModel):
    report: str
    sources: List[Source]
    images: Optional[List[str]] = None
    
class QuestionResult(BaseModel):
    answer: str

# Import agents
from agents.chief_agent import ChiefAgent

@app.get("/")
async def root():
    return {"message": "JARVIS Research System Backend is running"}

@app.get("/api/research")
async def research_options():
    return {"message": "API endpoint for research requests"}

async def perform_research(topic: str, is_deep: bool):
    """Perform research using the agent architecture"""
    try:
        logger.info(f"Starting research on topic: {topic}, deep: {is_deep}")
        
        # Initialize chief agent
        chief_agent = ChiefAgent()
        
        # Create initial state
        state = {
            "topic": topic,
            "is_deep": is_deep,
            "context": "",
            "sources": [],
            "images": [],
            "report": ""
        }
        
        # Execute the research workflow
        final_state = await chief_agent.execute(state)
        
        # Return result
        return ResearchResult(
            report=final_state["report"],
            sources=[Source(**source) for source in final_state["sources"]],
            images=final_state["images"]
        )
        
    except Exception as e:
        logger.error(f"Research error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Research failed: {str(e)}")

async def answer_question(question: str, context: str):
    """Answer a question using the AI Assistant agent"""
    try:
        logger.info(f"Answering question: {question}")
        
        # Initialize chief agent
        chief_agent = ChiefAgent()
        
        # Create state for Q&A
        state = {
            "question": question,
            "context": context,
            "answer": ""
        }
        
        # Execute the Q&A workflow
        final_state = await chief_agent.execute(state)
        
        # Return result
        return QuestionResult(answer=final_state["answer"])
        
    except Exception as e:
        logger.error(f"Q&A error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Q&A failed: {str(e)}")

async def analyze_document(file_base64: str, mime_type: str):
    """Analyze a document using the Document Analyzer agent"""
    try:
        logger.info(f"Analyzing document with MIME type: {mime_type}")
        
        # Initialize chief agent
        chief_agent = ChiefAgent()
        
        # Create state for document analysis
        state = {
            "file_base64": file_base64,
            "mime_type": mime_type,
            "report": "",
            "sources": [],
            "images": []
        }
        
        # Execute the document analysis workflow
        final_state = await chief_agent.execute(state)
        
        # Return result
        return ResearchResult(
            report=final_state["report"],
            sources=final_state["sources"],
            images=final_state["images"]
        )
        
    except Exception as e:
        logger.error(f"Document analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document analysis failed: {str(e)}")

@app.post("/api/research")
async def start_research(request: ResearchRequest):
    """Endpoint to start research process"""
    try:
        logger.info(f"Received research request: {request.topic}")
        result = await perform_research(request.topic, request.is_deep)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Research failed: {str(e)}")

@app.post("/api/question")
async def ask_question(request: QuestionRequest):
    """Endpoint to ask questions about research context"""
    try:
        logger.info(f"Received question: {request.question}")
        result = await answer_question(request.question, request.context)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Q&A failed: {str(e)}")

@app.post("/api/document-analysis")
async def document_analysis(request: DocumentAnalysisRequest):
    """Endpoint to analyze documents"""
    try:
        logger.info(f"Received document analysis request with MIME type: {request.mime_type}")
        result = await analyze_document(request.file_base64, request.mime_type)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document analysis failed: {str(e)}")

@app.options("/api/research")
async def research_options():
    return {"message": "API endpoint for research requests"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

# Export the app for uvicorn
app = app