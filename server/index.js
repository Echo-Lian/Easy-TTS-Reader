/**
 * Easy TTS Reader - Local Server
 *
 * This server acts as a bridge between the Chrome extension and Ollama.
 * It receives text from the extension, sends it to Ollama for summarization,
 * and returns the summarized result for text-to-speech playback.
 *
 * Workflow:
 * 1. Chrome extension sends selected text to POST /summarize
 * 2. Server forwards text to Ollama qwen2:7b model
 * 3. Ollama generates a summary optimized for speech
 * 4. Server returns summary to extension
 * 5. Extension uses chrome.tts.speak() to read the summary
 */

const express = require("express");
const cors = require("cors");
const OllamaClient = require("../shared/ollama-client");

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2:7b";

// Initialize Ollama client with shared logic
const ollamaClient = new OllamaClient({
  baseUrl: OLLAMA_URL,
  defaultModel: OLLAMA_MODEL
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support larger text inputs

// Health check endpoint
app.get("/health", async (req, res) => {
  const ollamaHealthy = await ollamaClient.checkHealth();

  res.json({
    status: ollamaHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    ollamaUrl: OLLAMA_URL,
    model: OLLAMA_MODEL,
    ollamaAvailable: ollamaHealthy
  });
});

// Summarization endpoint
app.post("/summarize", async (req, res) => {
  try {
    const { text, maxLength } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "No text provided",
        message: "Please send text in the request body"
      });
    }

    console.log(`[${new Date().toISOString()}] Summarizing text (${text.length} chars)...`);

    // Use shared Ollama client for summarization
    const result = await ollamaClient.summarize(text, { maxLength });

    console.log(`[${new Date().toISOString()}] Summary generated successfully`);

    res.json({
      result: result.summary,
      model: result.model,
      originalLength: result.originalLength,
      summaryLength: result.summaryLength
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);

    res.status(500).json({
      error: "Failed to generate summary",
      message: error.message,
      details: "Make sure Ollama is running and the model is available"
    });
  }
});

// Text enhancement endpoint
app.post("/enhance", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "No text provided",
        message: "Please send text in the request body"
      });
    }

    console.log(`[${new Date().toISOString()}] Enhancing text (${text.length} chars)...`);

    // Use shared Ollama client for enhancement
    const result = await ollamaClient.enhanceForSpeech(text);

    console.log(`[${new Date().toISOString()}] Text enhanced successfully`);

    res.json({
      result: result.enhanced,
      model: result.model,
      originalLength: text.length,
      enhancedLength: result.enhanced.length,
      error: result.error || null
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);

    res.status(500).json({
      error: "Failed to enhance text",
      message: error.message,
      details: "Make sure Ollama is running and the model is available"
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("========================================");
  console.log("Easy TTS Reader - Local Server");
  console.log("========================================");
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Ollama URL: ${OLLAMA_URL}`);
  console.log(`✓ Model: ${OLLAMA_MODEL}`);
  console.log("");
  console.log("Endpoints:");
  console.log(`  GET  /health     - Health check`);
  console.log(`  POST /summarize  - Summarize text for speech`);
  console.log(`  POST /enhance    - Enhance text readability`);
  console.log("");
  console.log("Make sure Ollama is running:");
  console.log(`  ollama pull ${OLLAMA_MODEL}`);
  console.log(`  ollama serve`);
  console.log("========================================");
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log("\nShutting down server...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\nShutting down server...");
  process.exit(0);
});
