# JARVIS Research System (Production Grade)

An advanced, full-stack agentic research application.

## Quick Start (Frontend + Backend)

### 1. Backend Setup (Python)
Ideally, use a virtual environment.
```bash
pip install -r requirements.txt
# Ensure your .env file is populated with API keys!
python backend/server.py
```
*Server runs on http://localhost:8000*

### 2. Frontend Setup (React)
Open a new terminal:
```bash
npm install
npm run dev
```
*Frontend runs on http://localhost:5173*

## Docker Setup (Recommended for Production)

### Option 1: Single Container (All-in-One)
```bash
docker-compose up jarvis
```

### Option 2: Separate Containers (Development)
```bash
docker-compose up frontend backend
```

### Build Docker Images
```bash
docker-compose build
```

## Architecture
- **Frontend:** React + Vite + Tailwind (Calls Backend API)
- **Backend:** FastAPI + LangGraph (Handles Logic & Security)
- **Intelligence:** Groq (Llama 3), Google Gemini 2.5 Flash

## API Configuration
See **[API_GUIDE.md](./API_GUIDE.md)** for .env setup.

## Project Structure
```
├── backend/              # Python FastAPI backend
│   ├── agents/           # Multi-agent system
│   └── server.py         # Main server entry point
├── components/           # React UI components
├── pages/                # React page components
├── public/               # Static assets
├── services/             # Frontend services
├── Dockerfile            # Production Docker image
├── Dockerfile.backend    # Backend development Docker image
├── Dockerfile.frontend   # Frontend development Docker image
├── docker-compose.yml    # Docker Compose configuration
├── requirements.txt      # Python dependencies
└── package.json          # Node.js dependencies
```