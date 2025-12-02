# JARVIS Research Architecture

This document outlines the end-to-end data flow of the JARVIS application, designed to mimic the `gpt-researcher` agentic workflow.

## 1. System Overview

The system is built on a **Multi-Agent Architecture** powered by Google Gemini 2.5. Unlike traditional RAG (Retrieval Augmented Generation) pipelines that perform a single search, JARVIS employs a planning and execution loop.

### Core Components
*   **Planner Agent**: Decomposes user topics into specific research sub-tasks.
*   **Researcher Agent**: Executes web scraping and fact-gathering.
*   **Writer Agent**: Synthesizes structured reports from gathered contexts.
*   **UI Client**: A React-based interface that visualizes the agent's thought process in real-time.

## 2. End-to-End Data Flow

### Step 1: User Input
The user selects a mode (Quick or Deep) and enters a topic (e.g., "Impact of AI on Healthcare").

### Step 2: Planning Phase (The "Brain")
*   **Input**: User Topic.
*   **Process**: The `ResearchAgent` sends the topic to Gemini Flash with a system instruction to act as a Project Planner.
*   **Output**: A JSON array of search queries.
    *   *Example*: `["AI in healthcare statistics 2024", "Regulatory challenges of medical AI", "Cost reduction AI hospitals"]`

### Step 3: Execution Phase (The "Hands")
The system iterates through the generated plan. For each query:
1.  **Tool Call**: The agent invokes the `googleSearch` tool provided by the Gemini SDK.
2.  **Scraping**: Google's infrastructure performs the crawl and returns:
    *   `text`: A summarized snippet of the content.
    *   `groundingChunks`: Metadata containing Source Title and URI.
3.  **Data Extraction**:
    *   **Text**: Accumulated into a `context` buffer.
    *   **Images**: Extracted via Regex (`![alt](url)`) from the markdown response.
    *   **Sources**: Parsed from `groundingChunks` and deduped.
4.  **Streaming**: Events (`search`, `thought`, `source`) are emitted to the UI to update the "Agent Operations" log.

### Step 4: Synthesis Phase (The "Voice")
*   **Input**: The accumulated `context` buffer (raw text from all searches) + Original Topic.
*   **Process**: A final call to Gemini 2.5 Flash (with `thinkingConfig` enabled for Deep mode).
*   **Prompt**: "Write a comprehensive technical report based *only* on the following context..."
*   **Output**: A clean Markdown report.

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
1.  **Upload**: File is converted to Base64.
2.  **Ingestion**: Sent directly to Gemini 2.5 Flash with the file mime-type.
3.  **Analysis**: The model is instructed to perform *structural analysis* (Pattern recognition, Entity extraction) rather than simple summarization.
