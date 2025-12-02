
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

## Architecture
- **Frontend:** React + Vite + Tailwind (Calls Backend API)
- **Backend:** FastAPI + LangGraph (Handles Logic & Security)
- **Intelligence:** Groq (Llama 3), Google Gemini 2.5 Flash

## API Configuration
See **[API_GUIDE.md](./API_GUIDE.md)** for .env setup.
