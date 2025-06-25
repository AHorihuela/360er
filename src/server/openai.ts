import OpenAI from 'openai';

// Server-side only OpenAI client - uses regular env var (no VITE_ prefix)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side only, secure environment variable
});

export default openai; 