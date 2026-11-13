// 출처 번호 파서 자체 점검: node scripts/check-cite.mjs
import assert from 'node:assert/strict';
import { parseCited } from '../src/lib/cite.ts';

// 정상: 문장마다 번호
let r = parseCited('LangGraph를 도입했어요. [1] 재시도가 쉬웠어요. [2]', 3, true);
assert.deepEqual(r.segs, [{ text: 'LangGraph를 도입했어요.', cite: 1 }, { text: ' 재시도가 쉬웠어요.', cite: 2 }]);
assert.equal(r.rest, '');

// 범위 밖 번호 [7]은 그 문장을 버림
r = parseCited('맞는 말. [1] 지어낸 말. [7] 또 맞는 말. [3]', 3, true);
assert.deepEqual(r.segs.map((s) => s.cite), [1, 3]);

// 번호 없는 문장, 잘린 "[" 는 rest로 남음 (스트리밍 중)
r = parseCited('첫 문장. [1] 아직 끝나지 않은 문장 [', 2, true);
assert.equal(r.segs.length, 1);
assert.equal(r.rest, ' 아직 끝나지 않은 문장 [');

// 여러 번호 [1, 2] 는 첫 번호만, 굵게 표시는 제거
r = parseCited('**핵심**은 BM25예요. [2, 1]', 2, true);
assert.deepEqual(r.segs, [{ text: '핵심은 BM25예요.', cite: 2 }]);

// 이어지는 조각은 앞에 공백 하나
r = parseCited('다음 문장. [1]', 1, false);
assert.equal(r.segs[0].text, ' 다음 문장.');

console.log('cite parser ok');
