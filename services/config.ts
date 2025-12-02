// In Vite (local development), process.env is polyfilled by the define plugin in vite.config.ts
// In some other environments, it might be available directly.
// We use a safe access pattern here.

const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`REACT_APP_${key}`];
  }
  return undefined;
};

export const config = {
  groqApiKey: getEnv('GROQ_API_KEY'),
  tavilyApiKey: getEnv('TAVILY_API_KEY'),
  huggingFaceApiKey: getEnv('HUGGINGFACE_API_KEY'),
  unsplashAccessKey: getEnv('UNSPLASH_ACCESS_KEY'),
  // Support both standard names for Google Key
  googleApiKey: getEnv('API_KEY') || getEnv('GOOGLE_API_KEY'),
};

export const hasKey = (key: string | undefined): boolean => !!key && key.length > 0;