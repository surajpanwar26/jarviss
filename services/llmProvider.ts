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

// --- 1. GROQ Implementation (Primary - Fastest) ---
class GroqProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions";
  private model = "llama3-70b-8192"; // High intelligence, insane speed

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(params: GenerationParams): Promise<string> {
    const messages = [
      { role: "system", content: params.systemInstruction || "You are a helpful research assistant." },
      { role: "user", content: params.prompt }
    ];

    // Force JSON mode in system prompt if requested, as Groq supports it natively but explicit prompting helps Llama3
    if (params.jsonMode) {
      messages[0].content += " You must output valid JSON only.";
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.5, // Lower temp for factual research
        response_format: params.jsonMode ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
       const err = await response.text();
       throw new Error(`Groq API Error: ${err}`);
    }
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

// --- 2. Hugging Face Implementation (Secondary) ---
class HuggingFaceProvider implements LLMProvider {
  private apiKey: string;
  // Using Meta-Llama-3-8B-Instruct as it is widely available on the free Inference API
  private baseUrl = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(params: GenerationParams): Promise<string> {
    const fullPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${params.systemInstruction || "You are a helpful assistant."}${params.jsonMode ? " Output strict JSON only." : ""}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${params.prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 2048,
          return_full_text: false,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
        throw new Error(`HuggingFace API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    // HF Inference API returns array of objects
    let text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
    return text || "";
  }

  async *generateStream(params: GenerationParams): AsyncGenerator<string, void, unknown> {
    // Note: HF Inference API streaming is slightly different, often server-sent events or just not supported on all models easily.
    // For stability in this demo, we will simulate streaming by fetching full response and yielding chunks.
    // Real streaming with HF requires specific headers and handling.
    const fullText = await this.generate(params);
    
    // Simulate typing effect
    const chunkSize = 20;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      yield fullText.slice(i, i + chunkSize);
      await new Promise(r => setTimeout(r, 10)); // tiny delay
    }
  }
}

// --- 3. Google Gemini Implementation (Fallback) ---
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
  // 1. Groq (Fastest, best for Agents)
  if (hasKey(config.groqApiKey)) {
    console.log("Using LLM: Groq (Llama 3)");
    return new GroqProvider(config.groqApiKey!);
  }

  // 2. Hugging Face (Good alternative)
  if (hasKey(config.huggingFaceApiKey)) {
    console.log("Using LLM: Hugging Face");
    return new HuggingFaceProvider(config.huggingFaceApiKey!);
  }
  
  // 3. Google Gemini (Multimodal Fallback)
  if (hasKey(config.googleApiKey)) {
    console.log("Using LLM: Gemini");
    return new GeminiProvider(config.googleApiKey!);
  }
  
  throw new Error("No available LLM Provider keys found in .env file. Please add GROQ_API_KEY, HUGGINGFACE_API_KEY, or API_KEY (Google).");
};