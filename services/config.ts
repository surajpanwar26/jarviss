export const config = {
  groqApiKey: process.env.REACT_APP_GROQ_API_KEY || process.env.GROQ_API_KEY,
  tavilyApiKey: process.env.REACT_APP_TAVILY_API_KEY || process.env.TAVILY_API_KEY,
  huggingFaceApiKey: process.env.REACT_APP_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY,
  unsplashAccessKey: process.env.REACT_APP_UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY,
  googleApiKey: process.env.API_KEY || process.env.REACT_APP_GOOGLE_API_KEY,
};

export const hasKey = (key: string | undefined): boolean => !!key && key.length > 0;
