import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { extractConcepts } from './concepts';
import { getIsland, getRoom, type IslandId } from './islands';

/**
 * 글은 content/posts/*.mdx 파일 하나가 한 편입니다.
 * frontmatter 예시
 * ---
 * title: LangGraph를 도입하면서 고민했던 것들
 * summary: (선택) 목록·추천 카드에 보이는 한 줄
 * date: 2026-10-28
 * island: library        # library | inn | forest
 * room: ai               # 섬 안의 서가/방/구역 id (src/lib/islands.ts)
 * tags: [LangGraph, Agent]
 * concepts: [langgraph]  # (선택) 직접 지정. 없으면 본문에서 자동 추출
 * project: oxid          # (선택) 프로젝트 숲의 프로젝트 slug
 * status: clear          # (선택) side quest 상태: clear | doing | hold
 * ---
 */

export interface PostMeta {
  slug: string;
  title: string;
  summary?: string;
  date: string;
  island: IslandId;
  room: string;
  tags: string[];
  concepts: string[];
  project?: string;
  status?: 'clear' | 'doing' | 'hold';
  /** 프로젝트 유적(ruins) 글의 붕괴 규모 1~3 */
  severity?: number;
  draft?: boolean;
  minutes: number;
  chars: number;
}

export interface Post extends PostMeta {
  body: string;
}

export interface Project {
  slug: string;
  name: string;
  status: 'growing' | 'grown' | 'stopped' | 'ruins';
  growth: number;
  summary: string;
  role: string;
  period: string;
  stack: string[];
  outcomes: string[];
}

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const PROJECTS_FILE = path.join(ROOT, 'content', 'projects.json');

function toDateString(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v.slice(0, 10);
  return '1970-01-01';
}

function parse(file: string): Post | null {
  const slug = file.replace(/\.mdx?$/, '');
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
  const { data, content } = matter(raw);
  const island = String(data.island ?? 'library') as IslandId;
  const room = String(data.room ?? '');
  if (!getIsland(island) || !getRoom(island, room)) {
    console.warn(`[content] ${file}: island/room 값이 islands.ts에 없습니다 (${island}/${room})`);
  }
  const chars = content.replace(/\s/g, '').length;
  const auto = extractConcepts(`${data.title ?? ''}\n${content}`).map((c) => c.id);
  const manual = Array.isArray(data.concepts) ? data.concepts.map(String) : [];
  return {
    slug,
    title: String(data.title ?? slug),
    summary: data.summary ? String(data.summary) : undefined,
    date: toDateString(data.date),
    island,
    room,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    concepts: Array.from(new Set([...manual, ...auto])),
    project: data.project ? String(data.project) : undefined,
    status: data.status,
    severity: typeof data.severity === 'number' ? data.severity : undefined,
    draft: data.draft === true,
    minutes: Math.max(1, Math.round(chars / 500)),
    chars,
    body: content,
  };
}

/**
 * 목록 캐시. 라우트마다 이 모듈이 따로 로드될 수 있어서 메모리 플래그 대신
 * "파일 이름 + 수정 시각" 서명으로 판단합니다 — 어느 화면에서 글을 쓰거나 지워도 다음 요청에 바로 반영돼요.
 */
let cache: { sig: string; posts: Post[] } | null = null;

/** 서명 기반이라 따로 비울 필요는 없지만, 같은 요청 안에서 확실히 다시 읽고 싶을 때 호출합니다. */
export function invalidateContent() {
  cache = null;
}

/** 모든 글(본문 포함), 최신순 */
export function getAllPostsWithBody(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => /\.mdx?$/.test(f)).sort();
  const sig = files.map((f) => `${f}:${fs.statSync(path.join(POSTS_DIR, f)).mtimeMs}`).join('|');
  if (cache?.sig === sig) return cache.posts;
  const posts = files
    .map(parse)
    .filter((p): p is Post => p !== null && !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  cache = { sig, posts };
  return posts;
}

export function getAllPosts(): PostMeta[] {
  return getAllPostsWithBody().map(({ body: _body, ...meta }) => meta);
}

export function getPostsByIsland(island: IslandId): PostMeta[] {
  return getAllPosts().filter((p) => p.island === island);
}

export function getPost(slug: string): Post | undefined {
  return getAllPostsWithBody().find((p) => p.slug === slug);
}

export function getProjects(): Project[] {
  if (!fs.existsSync(PROJECTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8')) as Project[];
}

/** 본문의 ## / ### 제목으로 목차를 만듭니다. id는 MDX 렌더링 쪽과 같은 규칙(slugify)을 씁니다. */
export function getHeadings(body: string): { depth: 2 | 3; text: string; id: string }[] {
  const out: { depth: 2 | 3; text: string; id: string }[] = [];
  let inCode = false;
  for (const line of body.split('\n')) {
    if (line.trim().startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    const m = /^(##|###)\s+(.+)$/.exec(line.trim());
    if (m) out.push({ depth: m[1] === '##' ? 2 : 3, text: m[2], id: slugify(m[2]) });
  }
  return out;
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
}
