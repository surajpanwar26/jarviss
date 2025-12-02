# JARVIS Research System

An advanced, agentic web research application powered by Google Gemini, Groq, and Tavily.

## Setup Instructions

### 1. Install Dependencies
Run the following command in the project root:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (if not already present) and add your API keys:
```env
# Primary LLM (Fastest)
GROQ_API_KEY=gsk_...

# Primary Search (Best Results)
TAVILY_API_KEY=tvly-...

# Fallback / Multimodal
API_KEY=... (Google Gemini API Key)
HUGGINGFACE_API_KEY=...

# Image Search
UNSPLASH_ACCESS_KEY=...
```

### 3. Run Locally
Start the development server:
```bash
npm run dev
```

Open the link shown in your terminal (usually `http://localhost:5173`).

## Architecture
This project uses:
- **React 18** + **Vite** for the frontend.
- **Tailwind CSS** for styling (loaded via CDN).
- **LangGraph-style Agents** (running in-browser via TypeScript).
- **Google GenAI SDK** and **Groq API** for intelligence.
