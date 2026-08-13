# Tasks: product-quality-hardening

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다
  - `[DOING] → [DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다
  - 태스크 상태 변경 전에 승인이 필요한 경우는 문서화된 review checkpoint 또는 원격/파괴적 작업 직전뿐입니다.
  - 워크플로우가 요구하지 않는 standalone `OK` 승인 단계는 만들지 않습니다.
  - 해당 태스크의 `Checklist`에 unchecked 항목이 남아 있으면 `[DONE]`으로 전환하지 않습니다.
- **PRD 매핑(권장)**: 각 태스크 라인에 `[PRD-FR-001]` 또는 `[PRD-SCOPE-V1-DESKTOP-EDITOR]` 같은 기존 PRD 요구사항 ID 태그를 추가하거나, PRD와 무관한 태스크는 `[NON-PRD]`로 표시하세요.
  - 단, `tasks.md`에서 PRD ID를 임의로 만들지 마세요. `docs/prd` 또는 상위 요구사항 문서에 먼저 정의된 ID만 참조해야 합니다.
  - 레거시 문서에 아직 PRD ID가 없다면, 먼저 원문 요구사항 문서에 ID를 backfill한 뒤 `spec.md`의 `PRD Refs`와 태스크 태그를 함께 맞추세요.
  - `[NON-PRD]`는 내부 구현 작업 전용입니다. 사용자 동작, acceptance criteria, 범위가 바뀌는 태스크라면 PRD를 먼저 backfill하고 `[PRD-...]`로 태깅하세요.

---

## 로컬 추적 정보
- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/product-quality-hardening`
- **대기 중 변경 요청**: -
  - 구현 중 새로 수용한 사용자 요청을 잠시 표시하는 sync marker입니다
  - 요청을 `tasks.md`와 관련 문서에 반영한 뒤 값을 비우세요
  - pre-PR 리뷰 handoff를 시작하면 `Running`, 리뷰 결과 기록까지 끝나면 `Done`으로 변경
  - 형식: `결정: approve|changes_requested|blocked ...` (또는 `decision: ...`)
  - PR 생성 전 최종 통과 기준은 `approve`
  - 기본 베이스라인으로 `agents/skills/create-pr.md`(`Pre-PR 기본 체크리스트`) 기준을 따르세요
- **PR 리뷰**: -
  - PR 리뷰 handoff를 시작하면 `Running`, 팀에서 별도 완료 상태를 추적할 때만 `Done`으로 변경
- **PR 리뷰 Evidence**: -
  - 리뷰 지적사항을 왜/어떻게 반영했는지 `결정: ...`(또는 `decision: ...`) 형식으로 기록

---

## 태스크 엔트리 포맷

```markdown
- [TODO][PRD-FR-001] T-{feature-ref}-01 {태스크 제목}
  - Date: YYYY-MM-DD
  - Acceptance:
    - (검증 조건)
  - Checklist:
    - [ ] (서브 태스크)
```

> 위 예시의 `PRD-FR-001`은 가능한 `PRD-*` key 중 하나일 뿐입니다. 아직 PRD 원문에 정의되지 않았다면 태스크에 먼저 넣지 마세요.
> 처음엔 탐색/내부 작업이었더라도 제품 요구사항 변경으로 이어졌다면, `NON-PRD`로 두지 말고 PRD를 먼저 갱신한 뒤 `[PRD-...]`로 재태깅하세요.

---

## 태스크 목록

- [DONE][PRD-FR-051] T-F026-product-quality-hardening-01 상태 언어(Empty/Error/Disabled/Permission) 감사·통일
  - Date: 2026-08-14
  - Acceptance:
    - route별 empty/error/disabled/permission 상태를 디자인 시스템 State language 테이블로 감사하고 불일치를 테이블로 기록한다
    - 모든 제품 route의 error가 retry 가능/불가와 stale data 유지 여부를 구분해 올바른 action을 제공한다
    - Storybook에서 각 상태 tone을 독립 검증할 수 있다
  - Checklist:
    - [x] route별 상태 분기 감사 테이블 작성 (`decisions.md`에 기록)
    - [x] `StatePanel`/`StatusNotice` tone 규칙에 맞게 문구·아이콘·action 교정
    - [x] retry 불가 error는 안전한 다음 링크 제공, 가능 error는 reset + stale 유지 문구 확인
    - [x] 관련 Storybook/a11y 확인

- [DONE][NON-PRD] T-F026-product-quality-hardening-02 FSD 아키텍처 경고 5건 해소
  - Date: 2026-08-14
  - Acceptance:
    - `create-mixing/mixing-queue.ts`의 forbidden-import(cross-import)가 해소된다
    - insignificant-slice 4건이 병합 또는 근거 있는 exception으로 해소된다
    - `pnpm run check:architecture`가 0 error로 통과한다
  - Checklist:
    - [x] forbidden-import 원인 분석 및 shared 승격 또는 경계 이동
    - [x] 4개 slice에 대해 병합/유지 결정 및 `steiger.config.ts` 조정
    - [x] `pnpm run check:architecture` 통과 확인

- [DONE][PRD-FR-051] T-F026-product-quality-hardening-03 스켈레톤 Storybook 커버리지 추가
  - Date: 2026-08-14
  - Acceptance:
    - 9개 전용 스켈레톤 + Library/MixingDetail이 story로 등록되고 3개 뷰포트에서 검증된다
    - reduced-motion에서 animate-none이 적용됨을 regression test로 검증한다
    - 기존 `PageSkeleton` story를 유지한다
  - Checklist:
    - [x] `Shared UI/Skeletons` 또는 slice별 story 파일 추가
    - [x] 각 story에 360/768/1280 뷰포트 테스트와 reduced-motion 테스트 추가
    - [x] `pnpm run test:storybook --run` 관련 스토리 통과

- [DONE][PRD-FR-051] T-F026-product-quality-hardening-04 RSC 스트리밍·쿼리 Waterfall 개선
  - Date: 2026-08-14
  - Acceptance:
    - Recommendation/SongDetail/MixingDetail 등 최소 3개 경로에서 `useSuspenseQuery` + RSC prefetch로 waterfall 1단계 이상 감소한다
    - Query key가 `catalogRevision`/`scoringVersion` 계약을 유지한다
    - `loading.tsx` 스켈레톤이 Suspense 폴백으로 실제 사용된다
  - Checklist:
    - [x] data fetching이 RSC prefetch + HydrationBoundary 패턴으로 개선
    - [x] loading.tsx 폴백 동작 확인
    - [x] revision key 유지 검증

- [DONE][PRD-FR-051] T-F026-product-quality-hardening-05 접근성 심화 감사·수정
  - Date: 2026-08-14
  - Acceptance:
    - 키보드 전체 플로우(Profile→Library→Recommendations→SongDetail→MixingDetail)가 Tab/Shift+Tab/Enter/Escape로 100% 도달한다
    - `aria-busy`/`aria-live` 중복 울림이 없고 skeleton 장식은 `aria-hidden`이다
    - waveform 키보드 seek가 전 경로에서 동일 계약으로 동작한다
    - axe critical 0 유지
  - Checklist:
    - [x] 키보드 전체 순회 체크리스트 감사·수정
    - [x] aria-busy/live 중복 제거 확인
    - [x] waveform 키보드 seek 일관성 확인
    - [x] Storybook a11y addon critical 0 확인

- [DONE][PRD-FR-051] T-F026-product-quality-hardening-06 메타데이터·관찰성 정리
  - Date: 2026-08-14
  - Acceptance:
    - sitemap은 public route만 노출하고 인증·관리자 route는 noindex를 유지한다
    - OG 이미지·canonical·home 메타가 최신과 일치한다
    - 분석·믹싱 실패 경로에 Sentry/구조화 로그 capture가 최소 범위로 추가된다 (DSN 없으면 no-op)
  - Checklist:
    - [x] sitemap/robots/noindex 감사·수정
    - [x] OG·canonical 재확인
    - [x] worker/API 실패 경로에 capture 추가 (PII 없이 userId/jobId/errorCode만)

---

## 완료 조건

> ⚠️ 아래 항목은 **최종 확인 체크리스트**입니다. 실제로 확인/실행한 뒤에만 체크하세요.

- [ ] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료
- [ ] 테스트 실행 및 통과 (아래에 명령어/결과 기록)
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

> 명령어당 1개 행만 유지합니다. 같은 명령어를 다시 실행하면 새 행 추가 대신 기존 행의 시간/결과를 갱신하세요.
> `마지막 실행`은 `YYYY-MM-DD` 형식(로컬 날짜)으로 기록하세요.

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run check:architecture` | `2026-08-14` | 통과 — 0 error |
| `pnpm run test:storybook --run` | `-` | `-` |
| `pnpm run typecheck` | `-` | `-` |



<!-- lee-spec-kit:workflow-sync 2026-08-13T15:50:47.545Z -->











