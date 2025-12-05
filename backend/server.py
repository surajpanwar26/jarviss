from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import List, Optional
import logging
import asyncio
from dotenv import load_dotenv
from datetime import datetime
from pymongo import MongoClient
import time
import urllib.parse
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection with retry logic
MONGODB_URI = os.getenv("MONGODB_URI")
mongo_client = None
db = None
users_collection = None
activity_collection = None

if MONGODB_URI:
    max_retries = 3
    retry_delay = 5
    
    # Handle both SRV and standard URI formats
    encoded_uri = MONGODB_URI  # Use as-is for multi-host URIs
    
    # Only parse and encode if it's a simple URI (not multi-host)
    if "," not in MONGODB_URI and "@" in MONGODB_URI:
        try:
            parsed_uri = urllib.parse.urlparse(MONGODB_URI)
            username = parsed_uri.username
            password = parsed_uri.password
            
            # Reconstruct URI with encoded credentials
            if username and password:
                encoded_username = urllib.parse.quote_plus(username)
                encoded_password = urllib.parse.quote_plus(password)
                new_netloc = f"{encoded_username}:{encoded_password}@{parsed_uri.hostname}"
                if parsed_uri.port:
                    new_netloc += f":{parsed_uri.port}"
                encoded_uri = urllib.parse.urlunparse((
                    parsed_uri.scheme,
                    new_netloc,
                    parsed_uri.path,
                    parsed_uri.params,
                    parsed_uri.query,
                    parsed_uri.fragment
                ))
                
        except Exception as e:
            logger.warning(f"Failed to encode MongoDB URI: {e}")
            encoded_uri = MONGODB_URI
    
    # Check if SSL is disabled in the URI
    use_ssl = "ssl=false" not in MONGODB_URI.lower()
    
    for attempt in range(max_retries):
        try:
            if use_ssl:
                mongo_client = MongoClient(
                    encoded_uri,
                    serverSelectionTimeoutMS=10000,
                    connectTimeoutMS=20000,
                    socketTimeoutMS=20000,
                    maxPoolSize=50,
                    minPoolSize=5,
                    tls=True,
                    tlsAllowInvalidCertificates=True,
                    tlsAllowInvalidHostnames=True
                )
            else:
                mongo_client = MongoClient(
                    encoded_uri,
                    serverSelectionTimeoutMS=10000,
                    connectTimeoutMS=20000,
                    socketTimeoutMS=20000,
                    maxPoolSize=50,
                    minPoolSize=5
                )
            # Test the connection
            mongo_client.admin.command('ping')
            db = mongo_client["jarvis_database"]
            users_collection = db["users"]
            activity_collection = db["activity_logs"]
            
            # Create indexes for better performance
            users_collection.create_index("userId", unique=True)
            activity_collection.create_index("userId")
            activity_collection.create_index("timestamp")
            
            logger.info("Connected to MongoDB successfully")
            break
        except Exception as e:
            logger.error(f"Attempt {attempt + 1} failed to connect to MongoDB: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error("Failed to connect to MongoDB after all retries")
                mongo_client = None
else:
    logger.warning("MONGODB_URI not found in environment variables")

# Initialize the FastAPI app
app = FastAPI(title="JARVIS Research System API")

# Add Session Middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET_KEY", "your-session-secret-key-change-in-production"))

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://jarvis-frontend-bheu.onrender.com", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import agents
from backend.agents.chief_agent import ChiefAgent

# Import auth routes
from backend.auth import router as auth_router
app.include_router(auth_router, prefix="/api")

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

# Pydantic models for LLM
class LLMRequest(BaseModel):
    prompt: str
    system_instruction: Optional[str] = None
    json_mode: Optional[bool] = False
    thinking_budget: Optional[int] = None
    is_report: Optional[bool] = False

# Pydantic models for MongoDB
class User(BaseModel):
    userId: str
    lastActive: datetime
    preferences: Optional[dict] = None

class ActivityLog(BaseModel):
    userId: str
    timestamp: datetime
    actionType: str  # 'QUICK_SEARCH', 'DEEP_RESEARCH', 'DOC_ANALYSIS'
    query: Optional[str] = None
    documentName: Optional[str] = None
    documentFormat: Optional[str] = None
    metadata: Optional[dict] = None

@app.get("/")
async def root():
    return {"message": "JARVIS Research System Backend is running"}

@app.get("/health")
async def health_check():
    import os
    
    # Check if required API keys are present
    google_key = bool(os.getenv("GOOGLE_API_KEY"))
    groq_key = bool(os.getenv("GROQ_API_KEY"))
    tavily_key = bool(os.getenv("TAVILY_API_KEY"))
    
    return {
        "status": "healthy" if all([google_key, groq_key, tavily_key]) else "degraded",
        "api_keys": {
            "google": google_key,
            "groq": groq_key,
            "tavily": tavily_key
        },
        "mongodb": mongo_client is not None
    }

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

@app.post("/api/llm/generate")
async def generate_llm_content(request: LLMRequest):
    """Endpoint to generate content using LLM via backend"""
    try:
        logger.info(f"Received LLM generation request")
        
        # Import and initialize the LLM provider
        import os
        from backend.agents.report_agent import ReportAgent
        
        # Use the ReportAgent's method to generate content
        # This ensures we're using the same backend logic
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
        
        # Create a minimal report agent just for LLM calls
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={google_api_key}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": request.prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 8192 if request.is_report else 4096
            }
        }
        
        if request.system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": request.system_instruction}]}
        
        import requests
        response = requests.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result["candidates"][0]["content"]["parts"][0]["text"]
        
        return {"content": content}
        
    except Exception as e:
        logger.error(f"LLM generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")

@app.post("/api/logs")
async def log_activity(activity: ActivityLog):
    """Endpoint to log user activity to MongoDB"""
    if mongo_client is None or db is None or users_collection is None or activity_collection is None:
        logger.warning("MongoDB client not initialized")
        return {"message": "MongoDB not connected"}
    
    try:
        # Update user's last active time
        user_data = {
            "userId": activity.userId,
            "lastActive": activity.timestamp
        }
        
        users_collection.update_one(
            {"userId": activity.userId},
            {"$set": user_data},
            upsert=True
        )
        
        # Insert activity log
        activity_dict = activity.dict()
        result = activity_collection.insert_one(activity_dict)
        
        logger.info(f"Logged activity for user {activity.userId} with action {activity.actionType}")
        return {"message": "Activity logged successfully", "id": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to log activity: {str(e)}")

@app.get("/api/user-history/{user_id}")
async def get_user_history(user_id: str):
    """Endpoint to retrieve user activity history from MongoDB"""
    if mongo_client is None or activity_collection is None:
        logger.warning("MongoDB client not initialized")
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    
    try:
        # Query activity logs for the user, sorted by timestamp descending
        cursor = activity_collection.find({"userId": user_id}).sort("timestamp", -1)
        logs = []
        for doc in cursor:
            # Convert ObjectId to string for JSON serialization
            doc["_id"] = str(doc["_id"])
            logs.append(doc)
        
        return {"logs": logs}
    except Exception as e:
        logger.error(f"Failed to retrieve user history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user history: {str(e)}")

@app.options("/api/research")
async def research_options():
    return {"message": "API endpoint for research requests"}

if __name__ == "__main__":
    import uvicorn
    import os
    # Render.com requires binding to PORT environment variable
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run("backend.server:app", host="0.0.0.0", port=port, reload=False)

