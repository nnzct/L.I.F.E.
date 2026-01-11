
import { GoogleGenAI, Type } from "@google/genai";
import { PlanetData, Encounter } from "../types";

/**
 * Gemini Service for L.I.F.E.
 * Handles generation of planets, sectors, and discovery points.
 */

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robust JSON parser that handles markdown code blocks and extra characters.
 */
const parseSafeJson = (text: string | undefined) => {
  if (!text) return null;
  // Remove markdown code block syntax if present
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parsing Error:", e);
    console.error("Original Text:", text);
    return null;
  }
};

const planetSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Name of the planet" },
      code: { type: Type.STRING, description: "Scientific code like 'EXO-882'" },
      description: { type: Type.STRING, description: "A brief atmospheric and geological summary" },
      sectors: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the sector" },
            description: { type: Type.STRING, description: "Description of the landscape" },
            discoveryPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING, description: "Title of the discovery (e.g. 'Crystalline Spire')" },
                  data: { type: Type.STRING, description: "Detailed scientific observation data" },
                  iconType: { type: Type.STRING, enum: ['physics', 'geology', 'atmosphere', 'biology', 'energy', 'resource'] },
                  x: { type: Type.NUMBER, description: "X coordinate (0-100)" },
                  y: { type: Type.NUMBER, description: "Y coordinate (0-100)" },
                },
                required: ["id", "label", "data", "iconType", "x", "y"]
              }
            }
          },
          required: ["name", "description", "discoveryPoints"]
        },
        minItems: 5,
        maxItems: 5
      }
    },
    required: ["name", "code", "description", "sectors"],
  },
};

const encounterSchema = {
  type: Type.OBJECT,
  properties: {
    entityName: { type: Type.STRING },
    type: { type: Type.STRING, enum: ['FLORA', 'FAUNA'] },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          message: { type: Type.STRING, description: "Non-verbal description of the encounter" },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The explorer's action" },
                nextStepId: { type: Type.STRING, nullable: true },
                finalResponse: { type: Type.STRING, description: "The result of the action" }
              },
              required: ["text", "nextStepId", "finalResponse"]
            }
          }
        },
        required: ["id", "message", "choices"]
      }
    }
  },
  required: ["entityName", "type", "steps"]
};

function generateImage(seed: string): string {
  // Using picsum as a placeholder for environmental images
  return `https://picsum.photos/seed/${seed}/1600/900`;
}

export async function generateEncounterData(): Promise<Encounter | null> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a mysterious encounter with an alien entity. It should be non-verbal (sounds, movements). Use Korean for the descriptions.",
      config: {
        responseMimeType: "application/json",
        responseSchema: encounterSchema,
      }
    });
    
    const data = parseSafeJson(response.text);
    if (!data) return null;

    return {
      ...data,
      currentStepId: data.steps?.[0]?.id || "",
      history: [],
      isCompleted: false
    };
  } catch (error) {
    console.error("Failed to generate encounter data:", error);
    return null;
  }
}

export async function generateRandomPlanets(count: number): Promise<PlanetData[]> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `[TASK: INTERSTELLAR EXPLORATION]
Generate ${count} highly detailed and strange alien planets.
RULES:
1. Each planet must have EXACTLY 5 sectors.
2. Each sector must have between 5 and 10 discovery points.
3. Use specialized Korean scientific terminology for the descriptions.
4. Discovery points should be scattered randomly (X and Y coordinates between 10 and 90).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: planetSchema,
      },
    });

    const rawPlanets = parseSafeJson(response.text);
    if (!rawPlanets || !Array.isArray(rawPlanets)) {
      console.warn("Raw planets data is empty or invalid format.");
      return [];
    }

    const finalPlanets: PlanetData[] = [];

    for (const p of rawPlanets) {
      const sectors = (p.sectors || []).map((s: any, i: number) => ({
        ...s,
        id: `sector-${Math.random().toString(36).substring(2, 9)}`,
        imageUrl: generateImage(`${p.code}-S${i}-${Date.now()}`),
        encounter: undefined
      }));

      finalPlanets.push({
        ...p,
        id: `planet-${Math.random().toString(36).substring(2, 9)}`,
        isVisible: true,
        timestamp: `STARDATE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        sectors
      });
    }

    return finalPlanets;
  } catch (error) {
    console.error("Critical error in generateRandomPlanets:", error);
    return [];
  }
}
