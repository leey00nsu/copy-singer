# Implementation Plan: top-three-recommendations

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F005
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| 추천 계산 | F004 `key-fit-v1` + TypeScript 순수 ranking | 이미 검증된 100곡 scorer 결과를 그대로 사용하고 순위 규칙만 분리해 결정적으로 테스트 |
| 카탈로그 | F003 versioned JSON artifact + PostgreSQL `Song` metadata | 분석 수치는 배포 가능한 artifact를 SSOT로 유지하고 관계 식별자와 실행 결과만 DB에 저장 |
| 저장 | Prisma transaction | run과 정확히 3개 item이 전부 저장되거나 모두 롤백되도록 보장 |
| API | Next.js Route Handler | 프로필 검증, artifact 결합, 저장·조회·삭제를 서버 경계에 유지 |
| UI | React client components + shadcn 기반 기존 컴포넌트 | 프로필 결과에서 생성하고 전용 결과 URL로 이동하며 기존 화면 스타일을 재사용 |
| 검증 | Node test runner, SSR render, TypeScript/ESLint/build | ranking·문구·UI와 기존 API/화면 회귀를 로컬에서 검증 |

---

## 아키텍처

```text
Profile result
  -> POST /api/recommendations { userVocalProfileId }
  -> USER profile + catalogOrder 1~100 Song metadata 조회
  -> F003 JSON 100곡과 catalogOrder로 strict 결합
  -> F004 scoreCatalogKeyFits
  -> adjusted/original/abs(shift)/catalogOrder 결정적 정렬
  -> Prisma transaction으로 RecommendationRun + top 3 items 저장
  -> /recommendations/{runId}

/recommendations/{runId}
  -> GET /api/recommendations/{runId}
  -> 저장된 rank/reason/metrics 표시
  -> /?runId=...&itemId=... 로 SVC Workbench handoff
  -> Workbench가 GET 응답의 run-item 관계를 확인해 선택 context만 표시
  -> 사용자가 권한 있는 reference/target 파일을 직접 선택하고 기존 변환 실행
```

추천 계산은 CPU에서 수행하고 Modal을 호출하지 않는다. JSON artifact의 분석 수치와 DB의 곡 식별자를 `catalogOrder`, 제목, 가수로 모두 대조하며, 하나라도 누락·중복·불일치하면 run을 생성하지 않는다.

공개 응답은 저장된 JSON을 그대로 노출하지 않고 versioned serializer를 거친다. reason formatter는 scorer reason code와 저장 metric만 한국어로 변환하고, low-confidence 시 재녹음 권고와 “이번 소절 기준” 안내를 항상 보존한다.

---

## 파일 구조

```
app/
├── api/recommendations/route.ts          # 생성 API
├── api/recommendations/[id]/route.ts     # 단건 조회·삭제 API
└── recommendations/[id]/page.tsx         # 결과 화면 shell
components/
├── vocal-profile-workbench.tsx           # 추천 시작 동작
├── recommendation-results.tsx            # top 3, 오류·삭제 UI
└── singer-workbench.tsx                   # 검증된 추천 handoff context
lib/recommendation/
├── contract.ts                            # API·error·reason 공개 계약
├── ranking.ts                             # 결정적 top 3와 이유 formatter
└── server.ts                              # artifact/DB 결합, transaction, serializer
tests/
├── recommendation-ranking.test.ts         # ranking·artifact·문구 단위 테스트
└── rendered-html.test.mjs                 # 결과·handoff SSR 회귀
```

---

## 테스트 전략

- **단위 테스트**:
  - adjusted/original/shift/catalogOrder의 모든 tie-break 단계와 정확히 3개 선택
  - reason code 한국어 문구, low-confidence 경고, 부호 포함 shift formatter
  - 누락·중복·불일치 artifact/DB mapping과 profile metric 오류
- **통합 테스트**:
  - 실제 F003 READY artifact 100곡을 F004 scorer로 평가해 같은 입력이 같은 top 3를 생성
  - Prisma transaction payload와 생성·조회·cascade 삭제 계약 검증
  - API 오류 code/status/retryable과 직렬화 결과 검증
- **UI/회귀 테스트**:
  - 프로필 추천 CTA, top 3 결과 카드, 책임 고지, 삭제와 SVC handoff context SSR
  - `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run db:validate`, production build

---

## 운영·리스크

- F003 artifact와 DB Song metadata는 별도 lifecycle이므로 strict 100곡 preflight로 부분·오래된 카탈로그 사용을 차단한다.
- URL query는 식별자만 전달하며 제목·점수·shift 표시값은 서버가 반환한 저장 관계에서 확인한다.
- 추천 shift는 노래방 시작 키 안내로만 표시하고 SoulX-Singer `pitch_shift`에 자동 적용하지 않는다.
- 인증이 없는 로컬 MVP이므로 UUID 열거 위험을 낮추는 검증은 하되 사용자별 접근 제어는 후속 인증 feature로 남긴다.
- 삭제는 추천 run에만 적용하고 profile/recording/원곡 artifact는 제거하지 않는다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
