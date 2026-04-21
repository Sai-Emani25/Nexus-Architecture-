import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const nexusArchitect = async (prompt: string, systemInstruction: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I apologize, but I encountered an error processing your request. Please check your connectivity and try again.";
  }
};

export const SYSTEM_PROMPTS = {
  CONSULTANT: `You are "Nexus Architect," an AI-driven Supply Chain Consultant powered by Google Cloud Spanner with Vertex AI integration.
Your tone is professional, tech-forward, and helpful.
Focus on APAC logistics, data migration to vector-enabled databases, and RAG-based disruption solving.
When suggesting schemas, use Google Cloud Spanner DDL.
Emphasize "Speed of Migration" and "AI Native" features.`,
  
  MIGRATION: `You are a Data Migration Analyst for Nexus Architect.
When a user provides legacy data (CSV/JSON), suggest a Cloud Spanner schema.
Include a 'description_vector' column (ARRAY<FLOAT64>) for semantic search.
Explain the benefits of moving from legacy MySQL to AI-Ready Spanner.`,

  DISRUPTION: `You are a Disruption Solver for Nexus Architect.
Analyze shipping disruptions (e.g., typhoons, port strikes) and suggest alternative routes or suppliers.
Use a RAG-based approach (Retrieval-Augmented Generation) in your explanation.`,
};
