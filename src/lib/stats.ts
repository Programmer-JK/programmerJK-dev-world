import type { PostMeta } from './content';
import type { Graph } from './ontology';

export const XP_PER_POST = 40;
export const XP_PER_LINK = 5;

export interface Stats {
  total: number;
  thisMonth: number;
  streak: number;
  longestStreak: number;
  links: number;
  nodes: number;
  islandsVisited: number;
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  heatmap: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[][];
  byRoom: { island: string; room: string; count: number }[];
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** 레벨 n까지 필요한 누적 경험치: 200 * n^1.5 */
const xpForLevel = (n: number) => Math.round(200 * Math.pow(n, 1.5));

export function computeStats(posts: PostMeta[], graph: Graph, today = new Date()): Stats {
  const dates = new Map<string, number>();
  for (const p of posts) dates.set(p.date, (dates.get(p.date) ?? 0) + 1);

  // 연속 기록일 (오늘 또는 어제부터 거꾸로)
  let streak = 0;
  const cursor = new Date(today);
  if (!dates.has(day(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(day(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

  const sorted = [...dates.keys()].sort();
  let longest = 0, run = 0, prev: string | null = null;
  for (const d of sorted) {
    if (prev) {
      const p = new Date(prev); p.setDate(p.getDate() + 1);
      run = day(p) === d ? run + 1 : 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  // 26주 히트맵 (일요일 시작 주 단위)
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - 25 * 7);
  const heatmap: Stats['heatmap'] = [];
  for (let w = 0; w < 26; w++) {
    const week: Stats['heatmap'][number] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start); cur.setDate(start.getDate() + w * 7 + d);
      const count = dates.get(day(cur)) ?? 0;
      week.push({ date: day(cur), count, level: (count === 0 ? 0 : count === 1 ? 2 : count === 2 ? 3 : 4) as 0 | 2 | 3 | 4 });
    }
    heatmap.push(week);
  }

  const links = graph.edges.length;
  const xp = posts.length * XP_PER_POST + links * XP_PER_LINK;
  let level = 1;
  while (xp >= xpForLevel(level)) level++;
  const base = level === 1 ? 0 : xpForLevel(level - 1);

  const ym = day(today).slice(0, 7);
  const byRoomMap = new Map<string, number>();
  for (const p of posts) byRoomMap.set(`${p.island}/${p.room}`, (byRoomMap.get(`${p.island}/${p.room}`) ?? 0) + 1);

  return {
    total: posts.length,
    thisMonth: posts.filter((p) => p.date.startsWith(ym)).length,
    streak,
    longestStreak: longest,
    links,
    nodes: graph.nodes.length,
    islandsVisited: new Set(posts.map((p) => p.island)).size,
    xp,
    level,
    xpInLevel: xp - base,
    xpForNext: xpForLevel(level) - base,
    heatmap,
    byRoom: [...byRoomMap.entries()].map(([k, count]) => { const [island, room] = k.split('/'); return { island, room, count }; }),
  };
}
