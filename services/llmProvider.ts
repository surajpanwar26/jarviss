import { GoogleGenAI } from "@google/genai";
import { config, hasKey } from "./config";

// --- Types ---
interface GenerationParams {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
}

interface LLMProvider {
  generate(params: GenerationParams): Promise<string>;
  generateStream(params: GenerationParams): AsyncGenerator<string, void, unknown>;
}

// --- 1. GROQ Implementation (Primary) ---
class GroqProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions";
  private model = "llama3-70b-8192";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(params: GenerationParams): Promise<string> {
    const messages = [
      { role: "system", content: params.systemInstruction || "You are a helpful assistant." },
      { role: "user", content: params.prompt }
    ];

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        response_format: params.jsonMode ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) throw new Error(`Groq API Error: ${response.statusText}`);
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  async *generateStream(params: GenerationParams): AsyncGenerator<string, void, unknown> {
    const messages = [
      { role: "system", content: params.systemInstruction || "You are a helpful assistant." },
      { role: "user", content: params.prompt }
    ];

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        stream: true
      })
    });

    if (!response.body) throw new Error("No response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      buffer += chunk;
      
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.replace("data: ", "").trim();
          if (dataStr === "[DONE]") return;
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Ignore parse errors for partial chunks
          }
        }
      }
    }
  }
}

// --- 2. Google Gemini Implementation (Fallback) ---
class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI;
  private model = "gemini-2.5-flash";

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate(params: GenerationParams): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: params.jsonMode ? "application/json" : "text/plain"
      }
    });
    return response.text || "";
  }

  async *generateStream(params: GenerationParams): AsyncGenerator<string, void, unknown> {
    const result = await this.ai.models.generateContentStream({
      model: this.model,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction
      }
    });

    for await (const chunk of result) {
      if (chunk.text) yield chunk.text;
    }
  }
}

// --- Factory ---
export const getLLMProvider = (): LLMProvider => {
  if (hasKey(config.groqApiKey)) {
    console.log("Using LLM: Groq");
    return new GroqProvider(config.groqApiKey!);
  }
  // Hugging Face implementation could go here, but for brevity/reliability we default to Gemini as standard fallback
  if (hasKey(config.googleApiKey)) {
    console.log("Using LLM: Gemini");
    return new GeminiProvider(config.googleApiKey!);
  }
  
  throw new Error("No available LLM Provider keys found.");
};
