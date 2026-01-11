
export interface DiscoveryPoint {
  id: string;
  label: string;
  data: string;
  iconType: 'physics' | 'geology' | 'atmosphere' | 'biology' | 'energy' | 'resource';
  x: number;
  y: number;
}

export interface EncounterStep {
  id: string;
  message: string; // 울음소리, 몸짓 등 비언어적 묘사
  choices: {
    text: string; // 탐사자의 행동
    nextStepId: string | null; // 다음 단계 ID 또는 종료
    finalResponse: string; // 선택 후 해당 존재의 반응
  }[];
}

export interface Encounter {
  entityName: string;
  type: 'FLORA' | 'FAUNA';
  steps: EncounterStep[];
  currentStepId: string;
  history: { choice: string; response: string }[];
  isCompleted: boolean;
}

export interface Sector {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  discoveryPoints: DiscoveryPoint[];
  encounter?: Encounter;
}

export interface PlanetData {
  id: string;
  name: string;
  code: string;
  description: string;
  sectors: Sector[];
  isVisible: boolean;
  timestamp: string;
}

export interface ExplorationLog {
  id: string;
  planetId: string;
  planetName: string;
  author: string;
  content: string;
  timestamp: number;
  isVisible: boolean;
}

export type ViewState = 'nickname' | 'admin_login' | 'galaxy' | 'planet' | 'logs';
