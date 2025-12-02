import { config, hasKey } from "./config";
import { GoogleGenAI } from "@google/genai";
import { Source } from "../types";

interface SearchResult {
  text: string;
  sources: Source[];
  images: string[];
}

// --- 1. Tavily Implementation ---
const tavilySearch = async (query: string): Promise<SearchResult> => {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: config.tavilyApiKey,
      query: query,
      search_depth: "advanced",
      include_images: true,
      max_results: 5
    })
  });

  if (!response.ok) throw new Error("Tavily Search Failed");
  const data = await response.json();

  const text = data.results.map((r: any) => `Title: ${r.title}\nContent: ${r.content}\nURL: ${r.url}`).join("\n\n");
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

  // Extract Images (Markdown)
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
    const res = await fetch(`https://api.unsplash.com/search/photos?page=1&query=${query}&client_id=${config.unsplashAccessKey}&per_page=3`);
    const data = await res.json();
    return data.results.map((img: any) => img.urls.small);
  } catch (e) {
    return [];
  }
};

// --- Main Export ---
export const performSearch = async (query: string): Promise<SearchResult> => {
  try {
    if (hasKey(config.tavilyApiKey)) {
      console.log("Using Search: Tavily");
      return await tavilySearch(query);
    }
  } catch (e) {
    console.warn("Tavily failed, falling back to Gemini", e);
  }

  console.log("Using Search: Gemini Grounding");
  const result = await geminiSearch(query);

  // If no images found in search, try Unsplash
  if (result.images.length === 0 && hasKey(config.unsplashAccessKey)) {
    console.log("Fetching fallback images from Unsplash");
    result.images = await unsplashImages(query);
  }

  return result;
};
