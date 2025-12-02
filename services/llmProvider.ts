
import { GoogleGenAI } from "@google/genai";
import { config, hasKey, logConfigStatus } from "./config";

// Initialize logging once
logConfigStatus();

// --- Types ---
interface GenerationParams {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  thinkingBudget?: number;
}

interface LLMProvider {
  generate(params: GenerationParams): Promise<string>;
  generateStream(params: GenerationParams): AsyncGenerator<string, void, unknown>;
}

// --- 1. GROQ Implementation (Secondary for Reports, Primary for Logic) ---
class GroqProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions";
  private model = "llama3-70b-8192"; 

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(params: GenerationParams): Promise<string> {
    const messages = [
      { role: "system", content: params.systemInstruction || "You are a helpful research assistant." },
      { role: "user", content: params.prompt }
    ];

    if (params.jsonMode) {
      messages[0] = { ...messages[0], content: messages[0].content + " You must output valid JSON only." };
    }

    try {
      // console.log("Calling Groq API...");
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.5,
          response_format: params.jsonMode ? { type: "json_object" } : undefined
        })
      });

      if (!response.ok) {
         const err = await response.text();
         console.error("Groq Error Response:", err);
         throw new Error(`Groq API Error (${response.status}): ${err}`);
      }
      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Groq Generation Failed:", error);
      throw error;
    }
  }

  async *generateStream(params: GenerationParams): AsyncGenerator<string, void, unknown> {
    const messages = [
      { role: "system", content: params.systemInstruction || "You are a helpful assistant." },
      { role: "user", content: params.prompt }
    ];

    try {
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

      if (!response.ok) throw new Error(`Groq Stream Error: ${response.statusText}`);
      if (!response.body) throw new Error("No response body");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.replace("data: ", "").trim();
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
    } catch (error) {
      console.error("Groq Stream Failed:", error);
      throw error;
    }
  }
}

// --- 2. Hugging Face Implementation (Tertiary) ---
class HuggingFaceProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(params: GenerationParams): Promise<string> {
    const fullPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${params.systemInstruction || "You are a helpful assistant."}${params.jsonMode ? " Output strict JSON only." : ""}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${params.prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 4096, // Increased for report generation
            return_full_text: false,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
          throw new Error(`HuggingFace API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      let text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
      return text || "";
    } catch (error) {
      console.error("HuggingFace Generation Failed:", error);
      throw error;
    }
  }

  async *generateStream(params: GenerationParams): AsyncGenerator<string, void, unknown> {
    const fullText = await this.generate(params);
    const chunkSize = 50;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      yield fullText.slice(i, i + chunkSize);
      await new Promise(r => setTimeout(r, 10)); 
    }
  }
}

// --- 3. Google Gemini Implementation (Primary for Reports) ---
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
        responseMimeType: params.jsonMode ? "application/json" : "text/plain",
        thinkingConfig: params.thinkingBudget ? { thinkingBudget: params.thinkingBudget } : undefined
      }
    });
    return response.text || "";
  }

  async *generateStream(params: GenerationParams): AsyncGenerator<string, void, unknown> {
    const result = await this.ai.models.generateContentStream({
      model: this.model,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        thinkingConfig: params.thinkingBudget ? { thinkingBudget: params.thinkingBudget } : undefined
      }
    });

    for await (const chunk of result) {
      if (chunk.text) yield chunk.text;
    }
  }
}

// --- Standard Factory (Favors Speed/Agents) ---
export const getLLMProvider = (): LLMProvider => {
  if (hasKey(config.groqApiKey)) return new GroqProvider(config.groqApiKey!);
  if (hasKey(config.googleApiKey)) return new GeminiProvider(config.googleApiKey!);
  if (hasKey(config.huggingFaceApiKey)) return new HuggingFaceProvider(config.huggingFaceApiKey!);
  
  throw new Error("No available LLM Provider keys found.");
};

// --- Report Factory (Strict Priority: Gemini -> Groq -> HF) ---
export const getReportLLM = (): LLMProvider => {
  // 1. Google Gemini (Priority 1)
  if (hasKey(config.googleApiKey)) {
    // console.log("Report Generation: Using Gemini 2.5 Flash");
    return new GeminiProvider(config.googleApiKey!);
  }
  
  // 2. Groq (Priority 2)
  if (hasKey(config.groqApiKey)) {
    // console.log("Report Generation: Using Groq (Fallback 1)");
    return new GroqProvider(config.groqApiKey!);
  }

  // 3. Hugging Face (Priority 3)
  if (hasKey(config.huggingFaceApiKey)) {
    // console.log("Report Generation: Using Hugging Face (Fallback 2)");
    return new HuggingFaceProvider(config.huggingFaceApiKey!);
  }

  throw new Error("No API keys available for report generation. Please add GOOGLE_API_KEY, GROQ_API_KEY, or HUGGINGFACE_API_KEY to .env");
};
