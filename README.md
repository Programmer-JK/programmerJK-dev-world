# PJK / DEV WORLD

픽셀 월드와 온톨로지 지식 지도로 엮은 개발 블로그.
**지식 도서관 · 여관 · 프로젝트 숲** 세 섬과, 모든 기록을 잇는 **3D Knowledge Map**, 블로그에 질문하는 **Ask ZORA**로 구성됩니다.

- Next.js 16 (App Router) · React 19 · TypeScript
- 글: `content/posts/*.mdx` (MDX + frontmatter), 코드 하이라이트: rehype-pretty-code(shiki)
- 외부 UI 라이브러리 없이 CSS 변수 토큰 + 픽셀 에셋(`public/pixel`)

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # SCRIBE_PASSWORD, SCRIBE_SECRET 꼭 바꾸기
npm run dev                  # http://localhost:3000
```

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run typecheck` | 타입 검사 |

## 화면

| 경로 | 화면 | 비고 |
|---|---|---|
| `/` | 홈 — 노을 픽셀 풍경, Ask ZORA, 세 섬, 최근 기록 | 다크/라이트 스위치는 홈 헤더에만 |
| `/world` | 삼각형 세 섬 월드맵 | |
| `/library` | 지식 도서관 — 책등 서가, 검색, 정렬 | `?room=ai` 등으로 서가 지정 |
| `/inn` | 여관 — 일지 타임라인, 회고, 퀘스트 게시판 | `?room=log|chronicles|sidequest` |
| `/forest` | 프로젝트 숲 — 프로젝트 카드, 유적(포스트모템) | 프로젝트는 `content/projects.json` |
| `/knowledge` | 온톨로지 3D 지식 지도 | 드래그 회전, 층/관계 필터 |
| `/status` | 모험가 상태창 — 레벨, 연속 기록, 히트맵 | 요청마다 계산 |
| `/posts/[slug]` | 글 — 목차, 진행 바, ZORA 추천 | |
| `/write` | 필사실(글쓰기) | 로그인 필요 |

## 글 쓰기 (frontmatter)

```mdx
---
title: LangGraph를 도입하면서 고민했던 것들
summary: (선택) 목록·추천 카드에 보이는 한 줄
date: 2026-10-28
island: library        # library | inn | forest
room: ai               # 섬 안의 방 — src/lib/islands.ts
tags: [LangGraph, Agent]
concepts: [langgraph]  # (선택) 없으면 본문에서 자동 추출
project: oxid          # (선택) 프로젝트 숲 slug와 연결
status: clear          # (선택) side quest: clear | doing | hold
severity: 3            # (선택) 유적 글의 붕괴 규모 1~3
draft: true            # (선택) 목록에서 숨김
---
```

섬과 방(서가·방·구역)은 `src/lib/islands.ts` 한 곳에서 정의하고, 메뉴·월드맵·글쓰기·지식 지도가 모두 공유합니다.

## 필사실 잠금 (글쓰기 인증)

1. 홈 화면에서 키보드로 `z` `o` `r` `a`를 순서대로 치면 열쇠 창이 열립니다. (`src/components/SecretKey.tsx`의 `SECRET_SEQ`)
2. 비밀번호는 서버(`/api/scribe/login`)에서 `SCRIBE_PASSWORD`와 비교하고, 맞으면 HMAC 서명된 httpOnly 쿠키를 12시간 발급합니다.
3. `src/proxy.ts`가 `/write`, `/api/posts`, `/api/uploads`를 지킵니다. 쿠키가 없으면 `/?scribe=locked`로 돌려보내 열쇠 창을 띄웁니다.
4. 로그인하면 헤더에 "새 기록" 버튼이 나타납니다.

> 혼자 쓰는 블로그용 최소 구현입니다. 여러 명이 쓰게 되면 Auth.js 등으로 교체하세요.

## 수정 · 삭제 · 이미지

- **수정**: 로그인 상태면 글 상세 화면에 "수정하기" 버튼이 보입니다 → `/write?slug=<slug>`. 주소(slug)와 작성일, 직접 넣은 frontmatter(concepts, project 등)는 그대로 유지돼요.
- **삭제**: 수정 화면 상단 "삭제" → 확인 창. "이 글에 쓴 이미지도 지우기"를 켜면 이 글에서만 쓰는 업로드 이미지도 함께 지웁니다(다른 글이 쓰는 이미지는 남김). 삭제 후 해당 섬으로 이동합니다.
- **이미지 추가**: 툴바 버튼, 에디터에 끌어놓기, 클립보드 붙여넣기. 올리면 커서 위치에 `![alt](/uploads/...)`가 들어갑니다. PNG·JPG·GIF·WEBP·AVIF, 5MB까지.
- **이미지 삭제**: 오른쪽 이미지 패널의 ✕ → "파일 삭제"(본문에서 빼고 파일도 지움) 또는 "글에서만 빼기". 다른 글이 쓰는 이미지는 파일을 지우지 않고 알려줍니다.
- 저장하지 않은 변경이 있으면 페이지를 떠날 때 경고합니다. 저장·삭제 즉시 목록과 지식 지도에 반영돼요.

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/posts` | 새 글 |
| PUT | `/api/posts/[slug]` | 글 수정 |
| DELETE | `/api/posts/[slug]?images=1` | 글 삭제 (images=1이면 전용 이미지도) |
| POST | `/api/uploads` | 이미지 업로드 (multipart `file`) |
| DELETE | `/api/uploads?url=&slug=` | 이미지 파일 삭제 |
| GET | `/uploads/...` | 업로드 이미지 서빙 |

## 글 · 이미지 저장

`ALLOW_FS_WRITE=true`일 때 글은 `content/posts/<slug>.mdx`, 이미지는 `content/uploads/YYYY/MM/`에 저장됩니다 — **로컬 개발용**입니다.
Vercel 같은 서버리스 배포에서는 파일시스템에 쓸 수 없으므로 `src/lib/store.ts` 내부만 바꾸세요(함수 시그니처를 유지하면 API·에디터는 그대로).

- 글: GitHub Contents API로 저장소에 커밋 → 재배포 (추천), 또는 DB(Postgres, Supabase 등)
- 이미지: S3, Cloudflare R2, Vercel Blob 같은 오브젝트 스토리지. 이 경우 `/uploads` 라우트는 필요 없어요.

## 지식 지도 (온톨로지)

`src/lib/ontology.ts`

- 층: `DOMAIN(서가) → CONCEPT(개념) → DOCUMENT(기록) → PROJECT(맥락)`
- 관계: `BELONGS(분류) · RELATES(연관) · ABOUT(다룬다) · PART_OF(속한다) · SIMILAR(비슷하다, AI 추론)`
- 개념 사전: `src/lib/concepts.ts` — 별칭(aliases)으로 정규화, 서가(domain)로 분류
- 비슷한 기록: 공유 개념 Jaccard ≥ 0.25 이면 `SIMILAR`(점선, inferred)
- 추천 점수: 유사도 60% + 공유 개념 수 40% (`recommend`)

**LLM 붙이기:** `RelationExtractor`를 구현해 `buildGraph(posts, projects, extractor)`에 넘기세요.
정해진 관계 타입 안에서만 추출하고, 근거 문장(`evidence`)과 신뢰도(`conf`)를 함께 저장하는 것을 권장합니다.
노드가 수백 개를 넘으면 3D 렌더러를 `react-three-fiber`나 `react-force-graph-3d`로 바꾸는 것이 좋습니다.

## Ask ZORA (블로그 RAG)

`src/lib/ask.ts` · `POST /api/ask { q }`

1. 질문에서 개념/키워드 추출 → 2. 글 단위 점수(개념 일치 + 토큰 겹침) → 3. 상위 3편을 출처로, 문장마다 출처 번호를 붙여 답 구성
응답 형식(`steps`, `sources`, `answer[{text, cite}]`, `follow`)만 지키면 화면은 그대로 동작합니다.
`LLM_API_KEY`를 쓰는 생성형 답변은 `generate()`에 구현하세요. (출처 밖 내용 금지, 문장마다 [n], 모르면 모른다고)

## 디자인 토큰

`src/app/globals.css`

- 다크가 기본, `html[data-theme="light"]`에서 라이트. 선택은 `localStorage('zora-theme')`
- `.dark-zone` 안은 항상 어둡게 (픽셀 풍경, 지도, 코드 블록)
- 포인트 색 글자는 `color-mix(in srgb, <색> var(--tint), var(--text))`로 라이트에서 자동으로 진해짐
- 한글은 `word-break: keep-all`

## 픽셀 에셋

`public/pixel/` — 히어로 레이어(sky, clouds, land, fg-left/right), 월드맵(map, hl-*), 섬 배너, 32×32 아이콘, ZORA 캐릭터.
모두 원본 해상도로 저장되어 있고 `image-rendering: pixelated`로 정수배 확대해서 씁니다.

## 다음 할 일

- [ ] 글 저장을 GitHub 커밋 또는 DB로 교체 (배포용)
- [ ] Ask ZORA에 실제 임베딩 검색 + LLM 생성 연결
- [ ] 관계 추출에 LLM extractor 연결, 낮은 신뢰도 관계 검토 화면
- [ ] `content/projects.json`의 [ ] 자리 실제 내용으로 채우기
- [ ] OG 이미지, sitemap
