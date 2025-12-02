# JARVIS Research Architecture

This document outlines the end-to-end data flow of the JARVIS application, designed to mimic the `gpt-researcher` agentic workflow.

## 1. System Overview

The system is built on a **Multi-Agent Architecture** powered by Google Gemini 2.5. Unlike traditional RAG (Retrieval Augmented Generation) pipelines that perform a single search, JARVIS employs a planning and execution loop.

### Core Components
*   **Chief Agent**: Orchestrates all other agents
*   **Researcher Agent**: Executes web scraping and fact-gathering using Tavily API
*   **Image Agent**: Extracts and processes visual assets
*   **Source Agent**: Processes and validates sources
*   **Report Agent**: Synthesizes structured reports using Google Gemini
*   **AI Assistant Agent**: Handles Q&A functionality
*   **Document Analyzer Agent**: Analyzes uploaded documents
*   **UI Client**: A React-based interface that visualizes the agent's thought process in real-time

## 2. End-to-End Data Flow

### Step 1: User Input
The user selects a mode (Quick or Deep) and enters a topic (e.g., "Impact of AI on Healthcare").

### Step 2: Agent Orchestration
The Chief Agent determines the type of request and routes it to the appropriate specialized agent:

1. **Research Requests**: 
   - Researcher Agent gathers information using Tavily API
   - Image Agent extracts visual assets
   - Source Agent processes and validates sources
   - Report Agent generates the final report using Google Gemini

2. **Q&A Requests**:
   - AI Assistant Agent answers questions using the research context

3. **Document Analysis Requests**:
   - Document Analyzer Agent analyzes uploaded documents using Google Gemini

### Step 3: Data Processing
Each agent processes its specific task and updates the shared state:

*   **Text**: Accumulated into a `context` buffer
*   **Images**: Extracted and stored for visualization
*   **Sources**: Parsed, deduplicated, and validated

### Step 4: Synthesis Phase
*   **Input**: The accumulated `context` buffer + Original Topic
*   **Process**: Final call to Google Gemini 2.5 Flash for report generation
*   **Output**: A clean Markdown report

## 3. WebSocket / Event Protocol

While this preview runs client-side for immediate accessibility, the architecture follows a WebSocket-ready pattern.

**Event Schema:**
```typescript
interface AgentEvent {
  type: 'plan' | 'search' | 'thought' | 'log' | 'complete';
  message: string;
  data?: any; // Contains partial report or source objects
}
```

## 4. Document Intelligence
For local files:
1.  **Upload**: File is converted to Base64
2.  **Ingestion**: Sent directly to Google Gemini 2.5 Flash with the file mime-type
3.  **Analysis**: The model is instructed to perform *structural analysis* (Pattern recognition, Entity extraction) rather than simple summarization

## 5. Agent Communication
Agents communicate through a shared state object that contains all necessary information for each step of the process. The Chief Agent orchestrates the workflow by determining which agents to activate based on the user request type.