// 글 임베딩 갱신: npm run embed  (prebuild에서도 실행)
// content/posts/*.mdx → content/embeddings.json { model, dims, posts: { [slug]: { hash, vec } } }
// 바뀐 글만 다시 임베딩하고, 지워진 글은 뺍니다. 키가 없거나 실패해도 빌드를 막지 않습니다(exit 0).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-2'; // src/lib/llm.ts와 같아야 함
const DIMS = 768;
const MAX_CHARS = 6000; // shortcut: 긴 글은 앞부분만 임베딩. 검색이 안 맞으면 ## 단위로 나눠 여러 벡터로
const POSTS = path.join(process.cwd(), 'content', 'posts');
const OUT = path.join(process.cwd(), 'content', 'embeddings.json');

if (!KEY) {
  console.log('[embed] GEMINI_API_KEY가 없어서 건너뜀 (Ask ZORA는 그래프 + 키워드로 동작)');
  process.exit(0);
}

const db = { model: MODEL, dims: DIMS, posts: {} };
try {
  const old = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (old.model === MODEL && old.dims === DIMS) db.posts = old.posts ?? {};
} catch { /* 처음 실행 */ }

const live = new Set();
const todo = [];
for (const f of fs.readdirSync(POSTS).filter((f) => /\.mdx?$/.test(f))) {
  const slug = f.replace(/\.mdx?$/, '');
  const { data, content } = matter(fs.readFileSync(path.join(POSTS, f), 'utf8'));
  if (data.draft === true) continue;
  live.add(slug);
  const text = `title: ${data.title ?? slug} | text: ${data.summary ?? ''}\n${content}`.slice(0, MAX_CHARS);
  const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
  if (db.posts[slug]?.hash !== hash) todo.push({ slug, text, hash });
}

let removed = 0;
for (const s of Object.keys(db.posts)) if (!live.has(s)) { delete db.posts[s]; removed++; }

const save = () => fs.writeFileSync(OUT, JSON.stringify(db));
let done = 0, failed = 0;
for (const t of todo) {
  try {
    db.posts[t.slug] = { hash: t.hash, vec: (await embed(t.text)).map((x) => Math.round(x * 1e5) / 1e5) };
    done++;
    if (done % 20 === 0) { save(); console.log(`[embed] ${done}/${todo.length}`); }
  } catch (e) {
    failed++;
    console.warn(`[embed] ${t.slug}: ${e.message}`);
    if (done === 0 && failed >= 3) { console.warn('[embed] 연속 실패로 중단'); break; }
  }
}
if (done || removed || !fs.existsSync(OUT)) save();
console.log(`[embed] 갱신 ${done}편 · 삭제 ${removed}편 · 실패 ${failed}편 · 전체 ${Object.keys(db.posts).length}편`);

async function embed(text) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({ model: `models/${MODEL}`, content: { parts: [{ text }] }, output_dimensionality: DIMS }),
      signal: AbortSignal.timeout(15000),
    });
    if (r.status === 429 && attempt < 3) { // 무료 한도(분당) → 잠깐 쉬고 다시
      console.log('[embed] 429, 30초 쉬는 중');
      await new Promise((res) => setTimeout(res, 30000));
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 150)}`);
    const j = await r.json();
    const v = j.embedding?.values ?? j.embeddings?.[0]?.values;
    if (!v?.length) throw new Error('빈 응답');
    return v;
  }
}
