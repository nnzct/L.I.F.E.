
import { PlanetData, Sector, DiscoveryPoint, Encounter, EncounterStep } from "../types";

const PLANET_PREFIXES = ["NEO", "EXO", "TRAPPIST", "KEPLER", "GLIESE", "ZETA", "ALTAIR", "VEGA", "PROXIMA"];
const PLANET_SUFFIXES = ["PRIME", "BETA", "9", "IV", "VII", "X", "ORION", "VOID", "CORE"];
const SECTOR_NAMES = ["정적의 평원", "수정 동굴", "액체 메탄 호수", "규소 첨탑 지대", "대기 역전 구역", "고농도 탄소 지류", "전자 폭풍 사막", "휘발성 가스 협곡", "냉동 마그마 분지"];
const DISCOVERY_LABELS = ["대기 구성 분석", "지질 구조 스캔", "에너지 파동 탐지", "미량 원소 추적", "중력 변동 기록", "복사 에너지 측정"];
const DISCOVERY_DATAS = [
  "대기 중 고농도의 비활성 가스가 검출되었습니다. 거주 적합도는 낮지만 에너지 추출이 가능합니다.",
  "지각 내부에서 규칙적인 진동이 감지됩니다. 지하에 거대한 공동이 존재할 가능성이 큽니다.",
  "표면 암석에서 희귀한 결합 구조의 수정체가 발견되었습니다. 광학 굴절율이 비정상적으로 높습니다.",
  "액체 상태의 산소 농도가 매우 높습니다. 낮은 표면 온도로 인해 독특한 기상 현상이 발생합니다.",
  "강력한 전자기장이 지표면을 감싸고 있습니다. 일반적인 통신 장비의 간섭이 심합니다.",
  "고대 퇴적층에서 유기 화합물의 흔적이 발견되었습니다. 수백만 년 전에는 생태계가 존재했을 수 있습니다."
];

const ENCOUNTER_TEMPLATES: any[] = [
  {
    entityName: "미확인 발광 포자",
    type: "FLORA",
    steps: [
      {
        id: "start",
        message: "바위 틈새에서 푸른 빛을 내뿜는 포자 군락이 미세하게 진동하며 빛을 깜빡입니다.",
        choices: [
          { text: "표본을 채취한다", nextStepId: "take", finalResponse: "포자들이 갑자기 붉게 변하며 주변 기온이 급격히 상승합니다." },
          { text: "빛의 패턴을 기록한다", nextStepId: "record", finalResponse: "기록 도중 포자들이 일제히 터지며 아름다운 입자 폭풍을 일으킵니다." }
        ]
      }
    ]
  },
  {
    entityName: "석화된 구조물",
    type: "FAUNA",
    steps: [
      {
        id: "start",
        message: "인위적으로 보이는 거대한 석탑이 서 있습니다. 접근하자 낮은 웅웅거림이 들려옵니다.",
        choices: [
          { text: "표면을 만져본다", nextStepId: "touch", finalResponse: "차가운 금속의 질감이 느껴지며 시스템 대시보드에 알 수 없는 기호가 출력됩니다." },
          { text: "주변을 탐색한다", nextStepId: "search", finalResponse: "탑 아래에서 고대 기계의 파편으로 보이는 부품을 발견했습니다." }
        ]
      }
    ]
  }
];

function generateImage(seed: string): string {
  // 환경(environment) 이미지만 사용하도록 키워드 최적화
  // nature, space, landscape, planet, architecture 등 생물이 아닌 환경 키워드 조합
  return `https://picsum.photos/seed/${seed}/1600/900?grayscale=1`; 
}

export function generateLocalPlanet(): PlanetData {
  const prefix = PLANET_PREFIXES[Math.floor(Math.random() * PLANET_PREFIXES.length)];
  const suffix = PLANET_SUFFIXES[Math.floor(Math.random() * PLANET_SUFFIXES.length)];
  const code = `${prefix}-${Math.floor(Math.random() * 900 + 100)}`;
  const name = `${prefix} ${suffix}`;
  
  const sectors: Sector[] = Array.from({ length: 5 }).map((_, i) => {
    const sectorName = SECTOR_NAMES[Math.floor(Math.random() * SECTOR_NAMES.length)];
    const id = `sector-${Math.random().toString(36).substr(2, 9)}`;
    
    const discoveryPoints: DiscoveryPoint[] = Array.from({ length: 3 }).map((__, j) => ({
      id: `dp-${id}-${j}`,
      label: DISCOVERY_LABELS[Math.floor(Math.random() * DISCOVERY_LABELS.length)],
      data: DISCOVERY_DATAS[Math.floor(Math.random() * DISCOVERY_DATAS.length)],
      iconType: 'geology',
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60
    }));

    return {
      id,
      name: `${sectorName} - 구역 ${i + 1}`,
      description: `${name} 행성의 독특한 환경이 가장 잘 나타나는 지점입니다.`,
      imageUrl: generateImage(`${code}-sec-${i}`),
      discoveryPoints
    };
  });

  return {
    id: `planet-${code}-${Date.now()}`,
    name,
    code,
    description: "로컬 스캔으로 탐지된 미개척 외계 환경입니다.",
    sectors,
    isVisible: true,
    timestamp: `STARDATE ${new Date().getFullYear()}.${new Date().getMonth() + 1}`
  };
}

export function generateLocalEncounter(): Encounter {
  const template = ENCOUNTER_TEMPLATES[Math.floor(Math.random() * ENCOUNTER_TEMPLATES.length)];
  return {
    ...template,
    currentStepId: "start",
    history: [],
    isCompleted: false
  };
}
