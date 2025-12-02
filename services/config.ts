
// In Vite (local development), keys are exposed via import.meta.env
// We prioritize this for local builds.

const getEnv = (key: string): string | undefined => {
  // 1. Try Vite standard (import.meta.env)
  // Note: We use a try-catch because import.meta might not exist in some jest/test environments
  try {
    // @ts-ignore
    if (import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key].trim();
    }
    // @ts-ignore
    if (import.meta.env && import.meta.env[`VITE_${key}`]) {
      // @ts-ignore
      return import.meta.env[`VITE_${key}`].trim();
    }
  } catch (e) {
    // ignore
  }

  // 2. Try Node/Process standard (Fallback)
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key] || process.env[`REACT_APP_${key}`];
    if (val) return val.trim();
  }

  return undefined;
};

export const config = {
  groqApiKey: getEnv('GROQ_API_KEY'),
  tavilyApiKey: getEnv('TAVILY_API_KEY'),
  huggingFaceApiKey: getEnv('HUGGINGFACE_API_KEY'),
  unsplashAccessKey: getEnv('UNSPLASH_ACCESS_KEY'),
  pexelsApiKey: getEnv('PEXELS_API_KEY'),
  // Support both standard names for Google Key
  googleApiKey: getEnv('API_KEY') || getEnv('GOOGLE_API_KEY'),
};

// Debug helper to print status to console
export const logConfigStatus = () => {
  console.log("--- JARVIS API CONFIG STATUS ---");
  console.log("Groq Key:", config.groqApiKey ? "✅ Loaded" : "❌ Missing");
  console.log("Google Key:", config.googleApiKey ? "✅ Loaded" : "❌ Missing");
  console.log("Tavily Key:", config.tavilyApiKey ? "✅ Loaded" : "❌ Missing");
  console.log("--------------------------------");
};

export const hasKey = (key: string | undefined): boolean => !!key && key.length > 0;
