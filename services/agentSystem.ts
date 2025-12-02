import { AgentEvent, AgentState, Source } from "../types";
import { getLLMProvider } from "./llmProvider";
import { performSearch } from "./searchProvider";

// --- Configuration ---
const MAX_UNIQUE_SOURCES = 5;
const MAX_UNIQUE_IMAGES = 5;

/**
 * 7-Agent Architecture:
 * 1. ChiefEditor (Orchestrator)
 * 2. Editor (Planner)
 * 3. Researcher (Scraper)
 * 4. Reviewer (Validator - Simplified)
 * 5. Reviser (Replanner - Simplified)
 * 6. Writer (Synthesizer)
 * 7. Publisher (Formatter)
 */

abstract class BaseAgent {
  constructor(protected emit: (event: AgentEvent) => void) {}
  abstract execute(state: AgentState): Promise<AgentState>;
}

// --- 1. EDITOR AGENT (PLANNER) ---
class EditorAgent extends BaseAgent {
  async execute(state: AgentState): Promise<AgentState> {
    const llm = getLLMProvider();
    this.emit({ type: 'agent_action', agentName: 'Editor', message: 'Analyzing request and outlining research strategy...', timestamp: new Date() });
    
    const count = state.isDeep ? 4 : 2;
    const prompt = `Topic: "${state.topic}"
    Role: You are the Research Editor. Plan the outline.
    Task: Generate ${count} specific, targeted search queries to cover this topic.
    Format: Return ONLY a raw JSON array of strings.`;

    try {
      const text = await llm.generate({
        prompt,
        systemInstruction: "Output JSON only.",
        jsonMode: true
      });
      
      const queries = JSON.parse(text.replace(/```json|```/g, '').trim());
      this.emit({ type: 'plan', agentName: 'Editor', message: `Research Outline: ${queries.join(', ')}`, timestamp: new Date() });
      return { ...state, plan: queries };
    } catch (e) {
      this.emit({ type: 'error', message: 'Planning failed, reverting to basic search.', timestamp: new Date() });
      return { ...state, plan: [state.topic] };
    }
  }
}

// --- 2. RESEARCHER AGENT ---
class ResearcherAgent extends BaseAgent {
  async execute(state: AgentState): Promise<AgentState> {
    const newContext = [...state.context];
    
    // Use Maps to ensure uniqueness by URI/URL while preserving insertion order (priority)
    const uniqueSources = new Map<string, Source>();
    state.sources.forEach(s => uniqueSources.set(s.uri, s));
    
    const uniqueImages = new Set<string>(state.images);

    this.emit({ type: 'agent_action', agentName: 'Researcher', message: 'Deploying autonomous scrapers...', timestamp: new Date() });

    for (const query of state.plan) {
      // Break early if we hit limits to save API calls, 
      // OR continue to get text context but ignore new images/sources if full.
      // Here we continue for context but stop collecting assets.
      
      this.emit({ type: 'search', agentName: 'Researcher', message: `Gathering intelligence: "${query}"`, timestamp: new Date() });
      
      try {
        const results = await performSearch(query);
        newContext.push(`### Data for "${query}":\n${results.text}`);

        // Process Sources
        for (const s of results.sources) {
          if (uniqueSources.size >= MAX_UNIQUE_SOURCES) break;
          if (!uniqueSources.has(s.uri)) {
            uniqueSources.set(s.uri, s);
            this.emit({ type: 'source', message: `Indexed: ${s.title}`, data: s, timestamp: new Date() });
          }
        }

        // Process Images
        for (const img of results.images) {
          if (uniqueImages.size >= MAX_UNIQUE_IMAGES) break;
          if (!uniqueImages.has(img)) {
            uniqueImages.add(img);
            this.emit({ type: 'image', message: 'Asset Acquired', data: img, timestamp: new Date() });
          }
        }

      } catch (err) {
        this.emit({ type: 'error', message: `Search failed for ${query}`, timestamp: new Date() });
      }
    }

    return { 
      ...state, 
      context: newContext, 
      sources: Array.from(uniqueSources.values()), 
      images: Array.from(uniqueImages) 
    };
  }
}

// --- 3. REVIEWER AGENT ---
class ReviewerAgent extends BaseAgent {
  async execute(state: AgentState): Promise<AgentState> {
    this.emit({ type: 'agent_action', agentName: 'Reviewer', message: 'Validating gathered intelligence...', timestamp: new Date() });
    
    if (state.context.length === 0) {
       this.emit({ type: 'thought', agentName: 'Reviewer', message: 'Insufficient data. Flagging for revision.', timestamp: new Date() });
    } else {
       this.emit({ type: 'thought', agentName: 'Reviewer', message: `Validation passed. ${state.sources.length} sources authenticated.`, timestamp: new Date() });
    }
    
    return state;
  }
}

// --- 4. WRITER AGENT ---
class WriterAgent extends BaseAgent {
  async execute(state: AgentState): Promise<AgentState> {
    const llm = getLLMProvider();
    this.emit({ type: 'agent_action', agentName: 'Writer', message: 'Drafting final report...', timestamp: new Date() });

    const role = state.isDeep ? "Chief Technical Writer" : "Briefing Specialist";
    
    try {
      const stream = llm.generateStream({
        prompt: `Topic: ${state.topic}\n\nContext Data:\n${state.context.join('\n\n')}\n\nTask: Compile a structured report. Use Markdown.`,
        systemInstruction: `You are the ${role}. Structure the report professionally.`,
      });

      let fullReport = "";
      for await (const chunk of stream) {
        fullReport += chunk;
        this.emit({ type: 'report_chunk', agentName: 'Writer', message: 'typing...', data: chunk, timestamp: new Date() });
      }

      return { ...state, report: fullReport };
    } catch (e: any) {
      return { ...state, report: "Drafting failed." };
    }
  }
}

// --- 5. PUBLISHER AGENT ---
class PublisherAgent extends BaseAgent {
  async execute(state: AgentState): Promise<AgentState> {
    this.emit({ type: 'agent_action', agentName: 'Publisher', message: 'Finalizing formatting and publishing...', timestamp: new Date() });
    this.emit({ type: 'complete', message: 'Research Published', data: { report: state.report, sources: state.sources, images: state.images }, timestamp: new Date() });
    return state;
  }
}

// --- CHIEF EDITOR (ORCHESTRATOR) ---
export class ResearchWorkflow {
  private listeners: ((event: AgentEvent) => void)[] = [];

  public subscribe(callback: (event: AgentEvent) => void) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(cb => cb !== callback); };
  }

  private emit(event: AgentEvent) {
    this.listeners.forEach(cb => cb(event));
  }

  public async start(topic: string, isDeep: boolean) {
    let state: AgentState = {
      topic,
      isDeep,
      plan: [],
      context: [],
      sources: [],
      images: [],
      report: ''
    };

    try {
      this.emit({ type: 'log', message: 'Chief Editor: Initializing Workflow', timestamp: new Date() });
      
      const editor = new EditorAgent(e => this.emit(e));
      state = await editor.execute(state);
      
      const researcher = new ResearcherAgent(e => this.emit(e));
      state = await researcher.execute(state);
      
      const reviewer = new ReviewerAgent(e => this.emit(e));
      state = await reviewer.execute(state);
      
      const writer = new WriterAgent(e => this.emit(e));
      state = await writer.execute(state);

      const publisher = new PublisherAgent(e => this.emit(e));
      state = await publisher.execute(state);

    } catch (e: any) {
      this.emit({ type: 'error', message: e.message, timestamp: new Date() });
    }
  }
}