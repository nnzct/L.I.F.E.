
import { GoogleGenAI, Type } from "@google/genai";
import { PlanetData, Encounter } from "../types";

// Gemini API 초기화 (안전한 생성자 사용)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robust JSON parser that handles markdown code blocks and extra characters.
 */
const parseSafeJson = (text: string | undefined) => {
  if (!text) return null;
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parsing Error:", e);
    return null;
  }
};

// 행성 데이터 생성을 위한 루트 객체 스키마
const planetResponseSchema = {
  type: Type.OBJECT,
  properties: {
    planets: {
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
                      label: { type: Type.STRING, description: "Title of the discovery" },
                      data: { type: Type.STRING, description: "Detailed scientific observation data in Korean" },
                      iconType: { type: Type.STRING, enum: ['physics', 'geology', 'atmosphere', 'biology', 'energy', 'resource'] },
                      x: { type: Type.NUMBER, description: "X coordinate (10-90)" },
                      y: { type: Type.NUMBER, description: "Y coordinate (10-90)" },
                    },
                    required: ["label", "data", "iconType", "x", "y"]
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
      }
    }
  },
  required: ["planets"]
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
          message: { type: Type.STRING, description: "Non-verbal description in Korean" },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                nextStepId: { type: Type.STRING, nullable: true },
                finalResponse: { type: Type.STRING }
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
  return `https://picsum.photos/seed/${seed}/1600/900`;
}

export async function generateEncounterData(): Promise<Encounter | null> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "외계 생명체와의 기괴한 비언어적 조우 시나리오를 생성하라. 한국어로 작성.",
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
    console.error("Encounter generation error:", error);
    return null;
  }
}

export async function generateRandomPlanets(count: number): Promise<PlanetData[]> {
  try {
    const ai = getAI();
    // 복잡한 생성 작업이므로 Pro 모델 사용 및 Thinking Budget 할당
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `[COSMIC ARCHITECT MODE]
당신은 우주 탐사선 L.I.F.E.의 인공지능 탐사 분석기입니다. 
인류가 거주 가능한지 또는 연구 가치가 있는지 판단하기 위해 ${count}개의 미개척 외계 행성을 정밀 스캔하십시오.
- 각 행성은 고유한 생태적 테마를 가져야 합니다.
- 묘사는 기괴하고, 경외감을 주며, 과학적이어야 합니다.
- 한국어 전문 용어를 사용하십시오.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: planetResponseSchema,
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });

    const parsed = parseSafeJson(response.text);
    if (!parsed || !parsed.planets || !Array.isArray(parsed.planets)) {
      throw new Error("Invalid Planet JSON structure");
    }

    const finalPlanets: PlanetData[] = [];

    for (const p of parsed.planets) {
      const sectors = p.sectors.map((s: any, i: number) => ({
        ...s,
        id: `sector-${Math.random().toString(36).substring(2, 10)}`,
        imageUrl: generateImage(`${p.code}-SEC-${i}-${Date.now()}`),
        discoveryPoints: s.discoveryPoints.map((dp: any) => ({
          ...dp,
          id: `node-${Math.random().toString(36).substring(2, 10)}`
        }))
      }));

      finalPlanets.push({
        ...p,
        id: `planet-${Math.random().toString(36).substring(2, 10)}`,
        isVisible: true,
        timestamp: `STARDATE-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${new Date().getFullYear()}`,
        sectors
      });
    }

    return finalPlanets;
  } catch (error) {
    console.error("Planet generation failed:", error);
    return [];
  }
}
