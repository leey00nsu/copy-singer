# Feature Spec: top-three-recommendations

> 기술 스택과 구현 구조는 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F005
- **기능명**: top-three-recommendations
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

사용자 보컬 프로필을 F003의 100곡과 F004 `key-fit-v1` scorer로 비교해 가장 적합한 상위 3곡을 제공하고, 원키 적합도·추천 키·추천 근거를 이해하기 쉬운 한국어로 설명한다.

추천 결과는 PostgreSQL에 실행 단위로 저장해 같은 계산 version과 입력을 추적할 수 있게 한다. 사용자가 곡을 선택하면 기존 SoulX-Singer Workbench로 곡과 추천 키 context를 전달해 이미 구현된 합성 데모 흐름을 이어간다.

### 포함 범위

- 사용자 VocalProfile ID 기반 추천 실행 API
- F003 READY 100곡 평가와 결정적인 상위 3곡 ranking
- RecommendationRun/RecommendationItem transaction 저장
- 실행 단건 조회와 삭제 API
- 프로필 결과 화면의 “노래 추천 받기” 진입 동작
- 상위 3곡 카드, 원키/조정 점수, 추천 키와 설명 가능한 이유 문구
- low-confidence 및 “이번 소절 기준” 안내
- 선택 곡·추천 키를 기존 SVC Workbench에 전달하는 handoff
- API, ranking, persistence, UI/SSR 회귀 테스트

### 제외 범위

- 장르·인기도·사용자 취향을 반영한 ML ranking
- 추천 4위 이하 전체 목록 UI, 검색·필터·플레이리스트 공유
- 서버가 YouTube 원곡을 자동 다운로드하거나 사용자 대신 GPU 변환을 시작하는 동작
- 추천 shift를 SVC `pitch_shift`에 자동 적용하는 동작
- 추천 실행 이력 목록·계정별 동기화·다중 사용자 인증
- 기존 Modal 변환 API, advanced settings, 결과 재생·다운로드 계약의 변경
- 결과를 성종·건강·절대적 가창력 평가로 표현하는 동작

---

## 사용자 스토리

### US-1: 보컬 프로필로 추천 실행

**As a** 보컬 프로필을 만든 사용자  
**I want** 별도의 설정 없이 내 프로필로 노래 추천을 실행하고 싶다  
**So that** 100곡 중 내 음역에 상대적으로 맞는 노래를 빠르게 찾을 수 있다

**Acceptance Criteria:**

- [ ] 프로필 결과 화면에 성공한 USER VocalProfile ID로 추천을 시작하는 명확한 버튼이 있다.
- [ ] 중복 제출을 막고 계산·저장 진행 상태와 실패 사유를 표시한다.
- [ ] 존재하지 않거나 삭제된 profile, USER가 아닌 profile, 필수 metric이 없는 profile은 안정적인 오류 코드로 거절한다.
- [ ] F003 artifact 100곡 또는 대응하는 DB Song metadata가 준비되지 않으면 부분 추천을 만들지 않고 카탈로그 준비 오류를 반환한다.

### US-2: 상위 3곡과 추천 이유 확인

**As a** 노래방 곡을 고르는 사용자  
**I want** 상위 3곡의 점수와 추천 이유를 한눈에 비교하고 싶다  
**So that** 단순 순위가 아니라 내 음역과 어떤 점이 맞는지 이해할 수 있다

**Acceptance Criteria:**

- [ ] 정확히 3개의 결과 카드를 순위, 곡명, 가수와 함께 표시한다.
- [ ] 각 카드는 원키 점수, 추천 shift 적용 후 점수, `-6`~`+6` 정수 추천 키를 표시한다.
- [ ] 구조화 reason code를 음역 겹침, 고음/저음 부담, 키 이동 효과에 기반한 한국어 문장으로 변환한다.
- [ ] 수치가 관찰된 한 소절과 분석 version에 기반한 참고값이며 실제 노래방 음원·컨디션에 따라 달라질 수 있음을 표시한다.
- [ ] confidence가 낮으면 순위를 숨기지 않되 더 긴 재녹음을 권하는 경고를 우선 표시한다.

### US-3: 저장된 추천 결과 재조회와 삭제

**As a** 추천 결과를 확인 중인 사용자  
**I want** 새로고침 후에도 같은 실행 결과를 보고 필요하면 삭제하고 싶다  
**So that** 계산 근거를 재현하면서 불필요한 이력을 제거할 수 있다

**Acceptance Criteria:**

- [ ] 추천 생성 응답은 run ID, scoring version, 생성 시각, profile ID와 순위 1~3 item을 반환한다.
- [ ] run ID 단건 조회는 저장된 순위·점수·shift·reason code·metric을 같은 형태로 반환한다.
- [ ] 추천 실행 삭제는 RecommendationItem을 함께 삭제하고 이후 조회는 404를 반환한다.
- [ ] 삭제 후 연결된 USER profile과 녹음은 기존 F002 삭제 API로 다시 제거할 수 있다.

### US-4: 선택 곡을 합성 데모로 연결

**As a** 추천 곡을 내 목소리로 들어보고 싶은 사용자  
**I want** 결과 카드에서 기존 합성 Workbench로 이동하고 싶다  
**So that** 추천 맥락을 잃지 않고 이미 검증된 SVC 데모를 실행할 수 있다

**Acceptance Criteria:**

- [ ] 각 결과 카드에 합성 데모로 이동하는 동작이 있다.
- [ ] Workbench는 선택한 곡명·가수·추천 키와 추천 실행 context를 표시한다.
- [ ] 선택 context는 target 오디오를 자동 다운로드하거나 변환을 자동 시작하지 않는다.
- [ ] 사용자는 기존처럼 권한이 있는 reference/target 파일과 advanced settings를 확인한 뒤 직접 변환을 시작한다.
- [ ] 기존 queued/processing/succeeded/failed 상태, 결과 WAV 재생·다운로드·삭제 흐름은 그대로 동작한다.

---

## 기능 요구사항

### FR-1: 추천 실행 API

- `POST /api/recommendations`는 JSON `{ userVocalProfileId }`를 받는다.
- UUID 형식, USER source type, 필수 pitch/quality metric과 analyzer 호환성을 검증한다.
- versioned F003 artifact의 READY 100곡을 F004 `scoreCatalogKeyFits`로 평가한다.
- artifact의 `catalogOrder`와 DB Song 100개를 대응시키며 누락·중복·불일치가 있으면 저장 전 전체 요청을 실패시킨다.
- 계산과 DB 저장은 로컬 CPU에서 수행하고 Modal GPU를 사용하지 않는다.

### FR-2: 결정적 ranking

- 1차 정렬은 `adjustedScore` 내림차순이다.
- 동점은 `originalKeyScore` 내림차순, `abs(recommendedShift)` 오름차순, `catalogOrder` 오름차순으로 해소한다.
- 정렬 결과의 상위 3곡만 RecommendationItem으로 저장한다.
- rank는 1, 2, 3으로 연속적이며 같은 run 안에서 곡과 rank가 중복되지 않는다.
- 동일 profile metric·artifact·scoring version은 같은 상위 3곡, 순서, 점수와 shift를 생성한다.

### FR-3: 저장 계약

- RecommendationRun은 `userVocalProfileId`, `scoringVersion`, 생성 시각을 저장한다.
- RecommendationItem은 `songId`, rank, originalKeyScore, adjustedScore, recommendedShift, reasonCodes와 original/recommended breakdown metric을 저장한다.
- run과 3개 item은 하나의 Prisma transaction에서 생성한다.
- 실패한 계산은 부분 run 또는 item을 남기지 않는다.

### FR-4: 조회·삭제 API

- `GET /api/recommendations/{id}`는 profile metadata와 rank 순 item 3개를 직렬화한다.
- `DELETE /api/recommendations/{id}`는 run을 삭제하고 DB cascade로 item을 함께 제거한다.
- 존재하지 않는 run은 `RECOMMENDATION_NOT_FOUND` 404를 반환한다.
- 입력·카탈로그·scoring 오류는 `INVALID_PROFILE`, `INCOMPATIBLE_ANALYZER`, `CATALOG_NOT_READY`, `RECOMMENDATION_SAVE_FAILED` 등 안정적인 reason code와 retryable 여부를 제공한다.

### FR-5: 추천 결과 UI

- `/recommendations/{runId}`에서 저장된 실행을 조회해 상위 3곡을 표시한다.
- profile 결과에서 추천 생성 성공 후 해당 run URL로 이동한다.
- 각 카드에 원키와 조정 점수, 부호가 포함된 semitone shift, 핵심 이유 1~3개와 confidence 안내를 표시한다.
- reason formatter는 scorer의 reason code와 저장 metric만 사용하며 임의의 가창력 판단을 생성하지 않는다.
- loading, not-found, catalog/scoring error, 삭제 중·삭제 완료 상태를 구분한다.

### FR-6: SVC Workbench handoff

- 추천 카드 동작은 선택한 run/item을 식별할 수 있는 query로 기존 `/` Workbench에 이동한다.
- Workbench는 서버에서 저장된 item을 확인해 선택 곡과 추천 키 context를 표시한다.
- query의 곡명·점수 같은 표시값을 신뢰하지 않고 run/item DB 관계에서 조회한다.
- handoff는 기존 conversion multipart payload나 Modal API contract를 변경하지 않는다.
- 추천 shift는 노래방 시작 키 안내이며 SVC pitch setting과 동일하다고 가정하거나 자동 적용하지 않는다.

---

## 비기능 요구사항

- **성능·비용**: 추천 POST의 scoring 계산은 100곡 CPU 평가 목표 100ms 이내를 유지하며 DB·route overhead를 제외하고 GPU를 사용하지 않는다.
- **재현성**: run에 scorer version을 저장하고 item에 점수 breakdown을 보존해 같은 입력의 계산 근거를 재구성할 수 있어야 한다.
- **원자성**: run과 item 3개는 전부 저장되거나 모두 저장되지 않아야 한다.
- **설명 가능성**: 이유 문구는 저장된 reason code와 metric에서만 생성한다.
- **책임 있는 표현**: “이번 소절에서 관찰된 음역 기준”과 실제 결과가 달라질 수 있다는 문구를 유지한다.
- **보안·개인정보**: 서버 route만 Prisma와 artifact에 접근하고 profile/run ID를 검증하며 Secret이나 파일 경로를 클라이언트에 노출하지 않는다.
- **호환성**: 기존 F002 profile 생성·삭제, F004 scorer, SVC multipart/API·advanced settings·결과 흐름을 깨뜨리지 않는다.
- **검증**: TypeScript, ESLint, production build, Prisma validation, API/persistence/ranking 단위 테스트와 추천·handoff SSR 테스트를 통과해야 한다.

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-US-005`, `PRD-US-006`, `PRD-FR-011`, `PRD-FR-012`, `PRD-FR-013`, `PRD-FR-014`, `PRD-FR-015`, `PRD-NFR-006`, `PRD-NFR-007`
- Idea: `../../../ideas/I005-top-three-recommendations.md`
