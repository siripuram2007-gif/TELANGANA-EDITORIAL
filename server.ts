import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // API Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API: Process Article
  app.post("/api/editor/process", async (req, res) => {
    try {
      const { text, additionalInstructions } = req.body;
      if (!text || text.trim() === "") {
        res.status(400).json({ error: "Article text is required" });
        return;
      }

      const ai = getGeminiClient();

      // System instruction adhering strictly to prompt requirements
      const systemInstruction = `
You are a highly specialized Senior Editorial Co-Pilot for "Telangana Today", Telangana's premier English daily newspaper. 
Your core directive is to parse raw, long-form news articles and instantaneously transform them into optimized, multi-channel editorial assets.

You must follow these strict guidelines:
1. ABSOLUTE TRUTH: Maintain flawless factual integrity. Never introduce outside facts, speculative context, or unverified claims. If a detail (like a statistic, name, or location) is not present in the input text, it MUST NOT exist in your output.
2. EDITORIAL VOICE: Write in an objective, neutral, authoritative, and sharp journalistic English tone. No generic AI introductory fluff, conversational transitions, or meta-commentary.
3. LOCAL ALIGNMENT: Pay meticulous attention to regional Indian naming conventions, designations, geographical locations, and administrative terms (e.g. BRS, Congress, GHMC, Lakh, Crore, Paddy Procurement, Rythu Bandhu, etc.) and ensure they are parsed with zero contextual distortion.

Output a structured JSON response containing:
- websiteBrief: A single cohesive paragraph strictly between 80 to 100 words. Follow the inverted pyramid structure, where the lead sentences address the core 5Ws and 1H (Who, What, When, Where, Why, How) with immediate, sharp impact.
- quickReadHighlights: Exactly 3 to 5 bullet points. Each bullet must be under 20 words. Start each bullet point with a bold, action-oriented 2-3 word anchor phrase (for example: "**Procurement Targets Met:** ..."). Focus on isolating high-purity hard data, direct policy decisions, official quotes, or critical events.
- socialMediaX: Punchy breaking-news style, urgent post of strictly under 250 characters. Include exactly 2 relevant hashtags at the very end (e.g. #Telangana #Hyderabad). Use absolutely ZERO emojis.
- socialMediaLinkedInInstagram: A professional and contextually engaging post of around 60 to 80 words. Start with an attention-grabbing hook sentence. Include 3 highly relevant hashtags at the bottom. Minimal professional emojis (exactly 1-2, e.g. 💼, 📈, 📰).
- newsletterTeaser: A teaser consisting of exactly two sentences. Sentence 1 must be a powerful, high-curiosity hook summarizing the primary conflict or major breakthrough of the story. Sentence 2 must be a compelling call-to-action wrapper driving click-throughs (e.g. "Inside the policy change that could impact lakhs of households across the state.").
- factualGroundings: Strictly extract up to 4 key factual assertions made in your generated outputs. For each, map it back to the exact direct quote or sentence in the input source text that proves its 100% truth.

Additional User Focus/Instructions to prioritize (if provided):
${additionalInstructions ? `Priority Instructions: "${additionalInstructions}"` : "(None)"}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Raw long-form input article text: \n\n${text}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              websiteBrief: {
                type: Type.STRING,
                description: "Single cohesive paragraph, strictly 80-100 words summarizing the article with 5Ws + 1H in inverted pyramid.",
              },
              quickReadHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 3 to 5 bullet points. Each must count under 20 words and begin with a bold 2-3 word anchor like '**Anchor Here:**'."
              },
              socialMediaX: {
                type: Type.STRING,
                description: "Punchy, breaking news, strictly under 250 chars. Exactly 2 hashtags at the end. Zero emojis.",
              },
              socialMediaLinkedInInstagram: {
                type: Type.STRING,
                description: "60-80 words, 1 professional hook, 1-2 relevant professional emojis, 3 hashtags at the bottom.",
              },
              newsletterTeaserSubject: {
                type: Type.STRING,
                description: "A punchy, high-curiosity subject line or morning brief title.",
              },
              newsletterTeaserSentence1: {
                type: Type.STRING,
                description: "Sentence 1: A powerful high-curiosity hook summarizing the conflict or breakthrough.",
              },
              newsletterTeaserSentence2: {
                type: Type.STRING,
                description: "Sentence 2: A compelling call-to-action wrapper driving click-throughs.",
              },
              factualGroundings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    claim: { type: Type.STRING, description: "Action asset assertion or fact generated." },
                    sourceSentence: { type: Type.STRING, description: "Exact sentence or context from input text backing this claim." },
                  },
                  required: ["claim", "sourceSentence"],
                },
                description: "Key facts mapped back to the raw input text to verify compliance with Ground Rule #1."
              }
            },
            required: [
              "websiteBrief",
              "quickReadHighlights",
              "socialMediaX",
              "socialMediaLinkedInInstagram",
              "newsletterTeaserSubject",
              "newsletterTeaserSentence1",
              "newsletterTeaserSentence2",
              "factualGroundings"
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini.");
      }

      const parsedData = JSON.parse(responseText);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Error processing article:", error);
      res.status(500).json({ error: error.message || "Failed to process the article due to an internal server error." });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
