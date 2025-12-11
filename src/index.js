import { OpenAI } from 'openai';

// A simple in-memory store to simulate a database for projects/files
// In a real CF Worker, this would be D1 or KV.
const projects = new Map();

// Helper function to handle AI requests
async function handleAISuggestion(req, env) {
  try {
    const { content, prompt } = await req.json();

    if (!content || !prompt) {
      return new Response(JSON.stringify({ error: "Missing content or prompt" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Use the pre-configured OpenAI-compatible endpoint for Gemini
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1', // Use default if not set
    });

    const systemPrompt = `You are an expert web editor assistant. Your task is to provide helpful and concise suggestions based on the user's file content and their request. Only return the suggested code or text, without any conversational filler.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // Using a fast model for suggestions
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `File Content:\n---\n${content}\n---\nUser Request: ${prompt}` }
      ],
      temperature: 0.3,
    });

    const suggestion = completion.choices[0].message.content;

    return new Response(JSON.stringify({ suggestion }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: "Failed to get AI suggestion" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // 1. Serve static assets (Frontend)
    if (url.pathname === "/" || url.pathname.startsWith("/editor") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
      return env.ASSETS.fetch(req);
    }

    // 2. API Endpoints
    
    // AI Suggestion Endpoint
    if (url.pathname === "/api/ai/suggest" && req.method === "POST") {
      return handleAISuggestion(req, env);
    }

    // File Save Endpoint (using KV)
    if (url.pathname === "/api/file/save" && req.method === "POST") {
      const body = await req.text();
      // For simplicity, we'll use a fixed key for now, but the frontend will be updated to pass a file key
      const key = url.searchParams.get("f") || "default.txt"; 
      await env.FILES.put(key, body);
      return new Response("ok");
    }

    // File Load Endpoint (using KV)
    if (url.pathname === "/api/file/load") {
      const key = url.searchParams.get("f") || "default.txt";
      const data = await env.FILES.get(key);
      return new Response(data || "");
    }

    // 3. Not Found
    return new Response("Not found", {status:404});
  }
}
