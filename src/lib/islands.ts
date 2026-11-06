/** 세 섬과 그 안의 방(서가·방·구역) 정의. 메뉴, 월드맵, 글쓰기, 지식 지도가 모두 이 설정을 공유합니다. */

export type IslandId = 'library' | 'inn' | 'forest';

export interface Room {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** 지식 지도에서 이 방이 DOMAIN 노드가 되는지 (지식 도서관 서가만 true) */
  domain?: boolean;
  color: string;
}

export interface Island {
  id: IslandId;
  name: string;
  en: string;
  desc: string;
  icon: string;
  href: string;
  roomLabel: string;
  palette: [string, string, string];
  rooms: Room[];
}

export const icon = (name: string) => `/pixel/icon-${name}.png`;

export const ISLANDS: Island[] = [
  {
    id: 'library',
    name: '지식 도서관',
    en: 'KNOWLEDGE LIBRARY',
    desc: '모든 개발 지식이 꽂혀 있는 도서관. 기술 글은 전부 이곳 서가에 정리된다.',
    icon: icon('library'),
    href: '/library',
    roomLabel: '서가',
    palette: ['#2a2346', '#8a6ad0', '#e8dcc0'],
    rooms: [
      { id: 'ai', name: 'AI · LLM', desc: 'Agent · RAG · LangGraph · NL2SQL', icon: icon('ai'), domain: true, color: '#7b2cbf' },
      { id: 'frontend', name: 'Frontend', desc: 'JavaScript · React · Vue · Next.js · CSS', icon: icon('knowledge'), domain: true, color: '#e0a03c' },
      { id: 'backend', name: 'Backend', desc: 'Java · Spring · API · DB', icon: icon('backend'), domain: true, color: '#40916c' },
      { id: 'devops', name: 'DevOps', desc: 'Docker · K8s · CI/CD', icon: icon('devops'), domain: true, color: '#2878b5' },
      { id: 'arch', name: 'Architecture', desc: 'DDD · Workflow · System Design', icon: icon('arch'), domain: true, color: '#8d9bb3' },
      { id: 'algo', name: 'Algorithm', desc: '코딩테스트 · 자료구조 · DP · 정규식', icon: icon('status'), domain: true, color: '#d7f36b' },
      { id: 'ref', name: 'Reference', desc: '논문 · 공식 문서 · 북마크', icon: icon('archive'), domain: true, color: '#9c8b66' },
    ],
  },
  {
    id: 'inn',
    name: '여관',
    en: 'THE INN',
    desc: '모험 사이사이 쉬어 가는 곳. 회고와 일지, 개발 밖의 이야기가 모인다.',
    icon: icon('inn'),
    href: '/inn',
    roomLabel: '방',
    palette: ['#3a2418', '#c0623a', '#f4c095'],
    rooms: [
      { id: 'log', name: "Adventurer's Log", desc: '그날그날의 생각과 활동', icon: icon('log'), color: '#d7f36b' },
      { id: 'chronicles', name: 'Chronicles', desc: '경험과 성장의 기록', icon: icon('chronicles'), color: '#8db5d4' },
      { id: 'sidequest', name: 'Side Quest', desc: '개발 외에 즐기는 것들', icon: icon('sidequest'), color: '#f4c095' },
    ],
  },
  {
    id: 'forest',
    name: '프로젝트 숲',
    en: 'PROJECT FOREST',
    desc: '직접 만든 것들이 자라는 숲. 깊은 곳의 유적에 실패와 회고가 남아 있다.',
    icon: icon('forest'),
    href: '/forest',
    roomLabel: '구역',
    palette: ['#14301f', '#40916c', '#d8f3dc'],
    rooms: [
      { id: 'projects', name: 'Projects', desc: '만든 것 · 역할 · 기술 선택', icon: icon('forest'), color: '#40916c' },
      { id: 'ruins', name: 'Project Ruins', desc: '장애 대응 · 실패 · 회고', icon: icon('ruins'), color: '#e08a4f' },
      { id: 'experiments', name: 'Experiments', desc: '프로토타입 · 작은 실험', icon: icon('status'), color: '#d7f36b' },
    ],
  },
];

export function getIsland(id: string): Island | undefined {
  return ISLANDS.find((i) => i.id === id);
}

export function getRoom(islandId: string, roomId: string): Room | undefined {
  return getIsland(islandId)?.rooms.find((r) => r.id === roomId);
}

export function placeLabel(islandId: string, roomId: string): string {
  const island = getIsland(islandId);
  const room = getRoom(islandId, roomId);
  return [island?.name, room?.name].filter(Boolean).join(' › ');
}
