import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { getRoom } from './islands';
import { invalidateContent, slugify, type Project } from './content';

/**
 * 글·이미지 저장소 (로컬 파일시스템).
 *   글:    content/posts/<slug>.mdx
 *   이미지: content/uploads/YYYY/MM/<id>-<name>.<ext>  →  /uploads/YYYY/MM/... 로 서빙 (src/app/uploads/[...path]/route.ts)
 *
 * ALLOW_FS_WRITE=true 일 때만 쓰기가 허용됩니다(로컬 개발용).
 * 배포할 때는 이 파일의 함수 시그니처는 그대로 두고 내부만 GitHub API / DB / 오브젝트 스토리지(S3, Vercel Blob)로 바꾸면
 * API 라우트와 에디터는 손대지 않아도 됩니다.
 */

const ROOT = process.cwd();
export const POSTS_DIR = path.join(ROOT, 'content', 'posts');
export const UPLOADS_DIR = path.join(ROOT, 'content', 'uploads');

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif',
};
export const MIME_BY_EXT: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif' };

export class StoreError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function assertWritable() {
  if (process.env.ALLOW_FS_WRITE !== 'true') throw new StoreError('이 환경에서는 파일 저장이 꺼져 있어요. (ALLOW_FS_WRITE)', 501);
}

/** 경로 조작(../) 방지: base 바깥을 가리키면 null */
function inside(base: string, target: string): string | null {
  const resolved = path.resolve(base, target);
  return resolved === base || resolved.startsWith(base + path.sep) ? resolved : null;
}

export function isValidSlug(slug: string) {
  return /^[\p{L}\p{N}][\p{L}\p{N}-]{0,80}$/u.test(slug);
}

function postFile(slug: string): string {
  if (!isValidSlug(slug)) throw new StoreError('잘못된 글 주소예요.');
  const p = inside(POSTS_DIR, `${slug}.mdx`);
  if (!p) throw new StoreError('잘못된 글 주소예요.');
  return p;
}

// ---------------------------------------------------------------- posts

export interface PostInput {
  title: string;
  summary?: string;
  island: string;
  room: string;
  tags?: string[];
  content: string;
  draft?: boolean;
}

export interface EditablePost extends Required<Omit<PostInput, 'summary'>> {
  slug: string;
  summary: string;
  date: string;
}

/** 수정 화면용: 초안 포함 원문 읽기 */
export function readPostForEdit(slug: string): EditablePost | null {
  const file = postFile(slug);
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) return null;
  const { data, content } = matter(fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8'));
  return {
    slug,
    title: String(data.title ?? slug),
    summary: data.summary ? String(data.summary) : '',
    island: String(data.island ?? 'library'),
    room: String(data.room ?? 'ai'),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    content: content.replace(/^\n+/, ''),
    draft: data.draft === true,
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? ''),
  };
}

function validate(input: PostInput) {
  if (!input.title?.trim()) throw new StoreError('제목은 필수예요.');
  if (!getRoom(input.island, input.room)) throw new StoreError('섬과 방을 골라주세요.');
  if (input.content.length > 200_000) throw new StoreError('본문이 너무 길어요.');
}

/** 새 글 만들기 */
export function createPost(input: PostInput): string {
  assertWritable();
  validate(input);
  fs.mkdirSync(/*turbopackIgnore: true*/ POSTS_DIR, { recursive: true });
  const base = slugify(input.title).slice(0, 60).replace(/^-+|-+$/g, '') || `post-${Date.now().toString(36)}`;
  let slug = base, i = 2;
  while (fs.existsSync(/*turbopackIgnore: true*/ postFile(slug))) slug = `${base}-${i++}`;
  write(slug, { date: new Date().toISOString().slice(0, 10) }, input);
  return slug;
}

/** 글 수정: 주소(slug)와 작성일은 유지하고, 직접 넣은 frontmatter(concepts, project, status …)도 보존 */
export function updatePost(slug: string, input: PostInput) {
  assertWritable();
  validate(input);
  const file = postFile(slug);
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) throw new StoreError('그 기록을 찾을 수 없어요.', 404);
  const { data } = matter(fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8'));
  write(slug, data, input);
}

function write(slug: string, base: Record<string, unknown>, input: PostInput) {
  const data: Record<string, unknown> = { ...base, title: input.title.trim(), island: input.island, room: input.room, tags: input.tags ?? [] };
  if (input.summary?.trim()) data.summary = input.summary.trim(); else delete data.summary;
  if (input.draft) data.draft = true; else delete data.draft;
  if (data.date instanceof Date) data.date = data.date.toISOString().slice(0, 10);
  fs.writeFileSync(/*turbopackIgnore: true*/ postFile(slug), matter.stringify('\n' + input.content.trim() + '\n', data), 'utf8');
  invalidateContent();
}

/** 글 삭제. withImages면 이 글에서만 쓰는 업로드 이미지도 함께 지웁니다(다른 글이 쓰는 이미지는 남김). */
export function deletePost(slug: string, withImages: boolean): { removedImages: string[]; keptImages: string[] } {
  assertWritable();
  const file = postFile(slug);
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) throw new StoreError('그 기록을 찾을 수 없어요.', 404);
  const { content } = matter(fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8'));
  fs.unlinkSync(/*turbopackIgnore: true*/ file);
  const removedImages: string[] = [], keptImages: string[] = [];
  if (withImages) {
    for (const url of imagesIn(content)) {
      if (referencedBy(url).length > 0) { keptImages.push(url); continue; }
      if (removeUploadFile(url)) removedImages.push(url);
    }
  }
  invalidateContent();
  return { removedImages, keptImages };
}

// ---------------------------------------------------------------- images

const IMG_RE = /!\[[^\]]*\]\((\/uploads\/[^)\s]+)(?:\s+"[^"]*")?\)/g;

export function imagesIn(markdown: string): string[] {
  return Array.from(new Set(Array.from(markdown.matchAll(IMG_RE), (m) => m[1])));
}

/** 이 이미지를 본문에서 쓰는 글 slug 목록 */
export function referencedBy(url: string, exceptSlug?: string): string[] {
  if (!fs.existsSync(/*turbopackIgnore: true*/ POSTS_DIR)) return [];
  return fs.readdirSync(/*turbopackIgnore: true*/ POSTS_DIR)
    .filter((f) => f.endsWith('.mdx') && f !== `${exceptSlug}.mdx`)
    .filter((f) => fs.readFileSync(/*turbopackIgnore: true*/ path.join(POSTS_DIR, f), 'utf8').includes(url))
    .map((f) => f.replace(/\.mdx$/, ''));
}

export function uploadPathFromUrl(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const rel = decodeURIComponent(url.slice('/uploads/'.length));
  return inside(UPLOADS_DIR, rel);
}

export async function saveUpload(file: File): Promise<{ url: string; name: string; size: number }> {
  assertWritable();
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new StoreError('PNG, JPG, GIF, WEBP, AVIF 이미지만 올릴 수 있어요.', 415);
  if (file.size > MAX_IMAGE_BYTES) throw new StoreError('이미지는 5MB까지 올릴 수 있어요.', 413);

  const now = new Date();
  const dir = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  const base = (file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9가-힣_-]+/g, '-').replace(/^-+|-+$/g, '') || 'image').slice(0, 40);
  const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}-${base}.${ext}`;
  const target = inside(UPLOADS_DIR, path.join(dir, name));
  if (!target) throw new StoreError('저장 경로가 올바르지 않아요.');
  fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true });
  fs.writeFileSync(/*turbopackIgnore: true*/ target, Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${dir.split(path.sep).join('/')}/${name}`, name: file.name, size: file.size };
}

function removeUploadFile(url: string): boolean {
  const p = uploadPathFromUrl(url);
  if (!p || !fs.existsSync(/*turbopackIgnore: true*/ p)) return false;
  fs.unlinkSync(/*turbopackIgnore: true*/ p);
  return true;
}

/** 에디터에서 이미지 삭제. 다른 글이 쓰고 있으면 지우지 않고 알려줍니다. */
export function deleteUpload(url: string, editingSlug?: string): { deleted: boolean; usedBy: string[] } {
  assertWritable();
  if (!uploadPathFromUrl(url)) throw new StoreError('지울 수 없는 이미지 주소예요.');
  const usedBy = referencedBy(url, editingSlug);
  if (usedBy.length > 0) return { deleted: false, usedBy };
  return { deleted: removeUploadFile(url), usedBy: [] };
}

// ---------------------------------------------------------------- projects

export const PROJECTS_FILE = path.join(ROOT, 'content', 'projects.json');
const PROJECT_STATUS: Project['status'][] = ['growing', 'grown', 'stopped', 'ruins'];
const strList = (v: unknown) => Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean) : [];

/** 프로젝트 숲 전체를 통째로 저장합니다(순서 = 화면 순서). */
export function saveProjects(input: unknown): Project[] {
  assertWritable();
  if (!Array.isArray(input)) throw new StoreError('프로젝트 목록 형식이 아니에요.');
  const seen = new Set<string>();
  const out = input.map((raw: Record<string, unknown>) => {
    const p = raw ?? {};
    const slug = String(p.slug ?? '').trim();
    const name = String(p.name ?? '').trim();
    if (!isValidSlug(slug)) throw new StoreError(`잘못된 프로젝트 id예요: "${slug}" (글자·숫자·하이픈)`);
    if (seen.has(slug)) throw new StoreError(`프로젝트 id가 겹쳐요: ${slug}`);
    seen.add(slug);
    if (!name) throw new StoreError('프로젝트 이름을 적어 주세요.');
    const status = p.status as Project['status'];
    if (!PROJECT_STATUS.includes(status)) throw new StoreError('잘못된 상태 값이에요.');
    const growth = Math.round(Number(p.growth));
    if (!(growth >= 0 && growth <= 5)) throw new StoreError('성장도는 0~5 사이예요.');
    return { slug, name, status, growth, summary: String(p.summary ?? '').trim(), role: String(p.role ?? '').trim(), period: String(p.period ?? '').trim(), stack: strList(p.stack), outcomes: strList(p.outcomes) };
  });
  fs.writeFileSync(/*turbopackIgnore: true*/ PROJECTS_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
  invalidateContent();
  return out;
}
