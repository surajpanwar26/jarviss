
export interface Source {
  title?: string;
  uri: string;
}

export interface ResearchResult {
  report: string;
  sources: Source[];
  images?: string[];
}

export enum ResearchStatus {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  SEARCHING = 'SEARCHING',
  SYNTHESIZING = 'SYNTHESIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type PageView = 'HOME' | 'QUICK_RESULT' | 'DEEP_RESULT' | 'DOC_ANALYSIS';

export type AgentEventType = 'plan' | 'search' | 'image' | 'source' | 'log' | 'error' | 'complete' | 'thought' | 'agent_action' | 'report_chunk';

export interface AgentEvent {
  type: AgentEventType;
  agentName?: string; // 'Planner' | 'Researcher' | 'Writer'
  message?: string;
  data?: any;
  timestamp: Date;
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'system' | 'thought';
  agent?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// LangGraph-style State Object
export interface AgentState {
  topic: string;
  isDeep: boolean;
  plan: string[];
  context: string[];
  sources: Source[];
  images: string[];
  report: string;
}
