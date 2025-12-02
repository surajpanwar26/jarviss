import { config, hasKey } from "./config";
import { GoogleGenAI } from "@google/genai";
import { Source } from "../types";

interface SearchResult {
  text: string;
  sources: Source[];
  images: string[];
}

// --- 1. Tavily Implementation (Primary) ---
// Docs: https://docs.tavily.com/docs/tavily-api/rest_api
const tavilySearch = async (query: string): Promise<SearchResult> => {
  if (!config.tavilyApiKey) throw new Error("Tavily Key missing");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: config.tavilyApiKey,
      query: query,
      search_depth: "advanced", // Deep search for better results
      include_images: true,
      include_answer: true, // Get a direct answer to help the agent
      max_results: 5,
      include_raw_content: false // Keep payload light, snippets are usually enough
    })
  });

  if (!response.ok) throw new Error("Tavily Search Failed");
  const data = await response.json();

  // Combine the direct answer + snippets for the agent's context
  let text = "";
  if (data.answer) {
    text += `### Direct Summary:\n${data.answer}\n\n`;
  }
  
  text += data.results.map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join("\n\n");
  
  const sources = data.results.map((r: any) => ({ title: r.title, uri: r.url }));
  const images = data.images || [];

  return { text, sources, images };
};

// --- 2. Gemini Grounding Implementation (Fallback) ---
const geminiSearch = async (query: string): Promise<SearchResult> => {
  if (!config.googleApiKey) throw new Error("No Google API Key for search fallback");
  
  const ai = new GoogleGenAI({ apiKey: config.googleApiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Find detailed facts about: "${query}".`,
    config: { tools: [{ googleSearch: {} }] },
  });

  const text = response.text || "";
  const sources: Source[] = [];
  const images: string[] = [];

  // Extract Sources
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });
  }

  // Extract Images (Markdown regex)
  const imgRegex = /!\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    images.push(match[1]);
  }

  return { text, sources, images };
};

// --- Unsplash Image Fallback ---
const unsplashImages = async (query: string): Promise<string[]> => {
  if (!hasKey(config.unsplashAccessKey)) return [];
  try {
    // Search for photos relevant to the query
    const res = await fetch(`https://api.unsplash.com/search/photos?page=1&query=${encodeURIComponent(query)}&client_id=${config.unsplashAccessKey}&per_page=3`);
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.results.map((img: any) => img.urls.small);
  } catch (e) {
    return [];
  }
};

// --- Main Export ---
export const performSearch = async (query: string): Promise<SearchResult> => {
  let result: SearchResult = { text: "", sources: [], images: [] };
  let usedFallback = false;

  // 1. Try Tavily
  try {
    if (hasKey(config.tavilyApiKey)) {
      console.log(`[SearchProvider] Searching Tavily for: "${query}"`);
      result = await tavilySearch(query);
    } else {
      usedFallback = true;
    }
  } catch (e) {
    console.warn("Tavily failed, switching to fallback.", e);
    usedFallback = true;
  }

  // 2. Fallback to Gemini if Tavily failed or key missing
  if (usedFallback) {
    try {
      console.log(`[SearchProvider] Searching Gemini Grounding for: "${query}"`);
      result = await geminiSearch(query);
    } catch (e) {
      console.error("All search providers failed", e);
      return { text: "Search failed.", sources: [], images: [] };
    }
  }

  // 3. Image Augmentation (if no images found yet)
  if (result.images.length === 0 && hasKey(config.unsplashAccessKey)) {
    console.log(`[SearchProvider] No images found, fetching from Unsplash for: "${query}"`);
    try {
      const extraImages = await unsplashImages(query);
      result.images = extraImages;
    } catch (e) {
      console.warn("Unsplash fetch failed", e);
    }
  }

  return result;
};