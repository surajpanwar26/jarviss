import { GoogleGenAI } from "@google/genai";
import { AgentEvent, Source } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

/**
 * JARVIS Research Agent
 * Implements a simplified LangGraph-style workflow:
 * 1. Planning (Decompose query)
 * 2. Execution (Search & Scrape)
 * 3. Synthesis (Write Report)
 */
export class ResearchAgent {
  private listeners: ((event: AgentEvent) => void)[] = [];
  private sources: Source[] = [];
  private images: string[] = [];
  private context: string[] = [];

  constructor() {}

  public subscribe(callback: (event: AgentEvent) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private emit(type: AgentEvent['type'], message: string, data?: any) {
    const event: AgentEvent = {
      type,
      message,
      data,
      timestamp: new Date(),
    };
    this.listeners.forEach(cb => cb(event));
  }

  /**
   * Main Entry Point
   */
  public async startResearch(topic: string, isDeep: boolean = false) {
    this.sources = [];
    this.images = [];
    this.context = [];

    try {
      this.emit('log', `Initializing JARVIS Agent Protocol...`);
      
      // Step 1: Planning
      this.emit('plan', 'Generating research plan...');
      const searchQueries = await this.generatePlan(topic, isDeep);
      this.emit('thought', `Plan accepted. Queries: ${searchQueries.join(', ')}`);

      // Step 2: Execution (Searching)
      for (const query of searchQueries) {
        this.emit('search', `Agent executing search: "${query}"`);
        await this.executeSearchStep(query);
      }

      // Step 3: Synthesis
      this.emit('log', 'Aggregating data nodes...');
      const report = await this.writeReport(topic, this.context.join('\n\n'), isDeep);
      
      this.emit('complete', 'Research Task Completed', {
        report,
        sources: this.sources,
        images: this.images
      });

    } catch (error: any) {
      console.error(error);
      this.emit('error', `Agent Failure: ${error.message}`);
    }
  }

  /**
   * Agent: Planner
   * Generates a list of search queries based on the topic.
   */
  private async generatePlan(topic: string, isDeep: boolean): Promise<string[]> {
    const prompt = `You are a Research Planner Agent.
    Topic: "${topic}"
    Task: Generate ${isDeep ? '4' : '2'} specific, unique search queries to gather comprehensive information on this topic.
    Format: Return ONLY a raw JSON array of strings. Example: ["query1", "query2"]`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    try {
      const text = response.text || "[]";
      // Sanitize potential markdown code blocks
      const jsonStr = text.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      this.emit('thought', 'Plan generation fallback: Using original topic.');
      return [topic];
    }
  }

  /**
   * Agent: Researcher (Scraper)
   * Uses Google Search Tool to scrape data.
   */
  private async executeSearchStep(query: string) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Find detailed information about: "${query}". Return a comprehensive summary and cited sources.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      
      // Process Grounding (Sources)
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            const source: Source = {
              title: chunk.web.title,
              uri: chunk.web.uri,
            };
            // Avoid duplicates
            if (!this.sources.some(s => s.uri === source.uri)) {
              this.sources.push(source);
              this.emit('source', `Source Found: ${source.title}`, source);
            }
          }
        });
      }

      // Extract Images (Markdown format from model response)
      const imgRegex = /!\[.*?\]\((.*?)\)/g;
      let match;
      while ((match = imgRegex.exec(text)) !== null) {
        this.images.push(match[1]);
        this.emit('image', 'Image asset extracted', match[1]);
      }

      // Add to context
      this.context.push(`### Results for "${query}":\n${text}`);
      this.emit('thought', `Processed data for query: "${query}"`);

    } catch (error) {
      this.emit('log', `Search step failed for "${query}" - Continuing...`);
    }
  }

  /**
   * Agent: Writer
   * Compiles the final report.
   */
  private async writeReport(topic: string, context: string, isDeep: boolean): Promise<string> {
    this.emit('log', 'Writer Agent: Synthesizing final report...');
    
    const systemInstruction = isDeep 
      ? `You are JARVIS, an autonomous research system. 
         Write a comprehensive, deep-dive technical report based ONLY on the provided Context. 
         Structure: Executive Summary, Detailed Analysis (broken by sub-topics), Key Findings, and Conclusion. 
         Use Markdown formatting. Include relevant images from context if available.`
      : `You are JARVIS. Write a quick briefing report based on the Context. Keep it concise.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Topic: ${topic}\n\nContext Data Scraped:\n${context}\n\nTask: Write the final report.`,
      config: {
        systemInstruction: systemInstruction,
        // Use thinking for deep research to structure the report better
        thinkingConfig: isDeep ? { thinkingBudget: 1024 } : undefined,
      }
    });

    return response.text || "Failed to generate report.";
  }
}