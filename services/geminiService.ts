
import { GoogleGenAI, Type } from "@google/genai";
import { PlanetData, Encounter } from "../types";

// Gemini API 초기화
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// JSON 응답 내 마크다운 코드 블록 제거용 헬퍼
const parseSafeJson = (text: string | undefined) => {
  if (!text) return null;
  const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON 파싱 실패:", e, "원본 텍스트:", text);
    return null;
  }
};

const planetSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      code: { type: Type.STRING },
      description: { type: Type.STRING },
      sectors: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            discoveryPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  data: { type: Type.STRING },
                  iconType: { type: Type.STRING, enum: ['physics', 'geology', 'atmosphere', 'biology', 'energy', 'resource'] },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                },
                required: ["id", "label", "data", "iconType", "x", "y"]
              }
            }
          },
          required: ["name", "description", "discoveryPoints"]
        }
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
          message: { type: Type.STRING, description: "비언어적 묘사" },
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
      contents: `외계 동식물 형태의 존재와의 비언어적 조우 이벤트를 생성하라. 
      대화는 불가능하며 소리와 몸짓으로만 반응한다. 인간형/기계형 절대 금지. 
      '탐사자' 용어를 사용할 것. 최소 8단계 이상의 깊이를 가질 것.`,
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
    console.error("조우 데이터 생성 실패:", error);
    return null;
  }
}

export async function generateRandomPlanets(count: number): Promise<PlanetData[]> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `[COSMIC EXPLORATION] ${count}개의 외계 행성을 생성하라. 
      각 행성은 반드시 '정확히 5개'의 구역(Sector)을 가져야 한다.
      각 구역은 '5개에서 10개 사이'의 조사 포인트(DiscoveryPoint)를 반드시 포함해야 한다.
      환경은 기괴하고 낯설어야 하며, '탐사자' 용어를 사용하여 한글로 작성하라.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: planetSchema,
      },
    });

    const rawPlanets = parseSafeJson(response.text);
    if (!rawPlanets || !Array.isArray(rawPlanets)) return [];

    const finalPlanets: PlanetData[] = [];

    for (const p of rawPlanets) {
      const sectors = p.sectors.map((s: any, i: number) => ({
        ...s,
        id: `sector-${Math.random().toString(36).substring(7)}`,
        imageUrl: generateImage(`${p.code}-S${i}-${Date.now()}`),
        encounter: undefined
      }));

      finalPlanets.push({
        ...p,
        id: `planet-${Math.random().toString(36).substring(7)}`,
        isVisible: true,
        timestamp: `STARDATE-${Math.random().toString(36).substring(7).toUpperCase()}`,
        sectors
      });
    }

    return finalPlanets;
  } catch (error) {
    console.error("행성 데이터 생성 실패:", error);
    return [];
  }
}
