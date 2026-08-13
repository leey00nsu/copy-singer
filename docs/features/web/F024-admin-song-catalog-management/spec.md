# Feature Spec: admin-song-catalog-management

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F024
- **기능명**: admin-song-catalog-management
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-13
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

현재 추천 런타임은 배포 artifact인 `tj-2607-song-profiles.json`과 정확히 100곡이라는 계약에 묶여 있어 곡 추가·출처 교체마다 파일 수정과 재배포가 필요하다. 배포 전 브레이킹 변경으로 곡·출처·분석·카탈로그의 런타임 SSOT를 PostgreSQL로 전환하고, 관리자 화면에서 준비 상태를 확인한 뒤 안전하게 공개할 수 있게 한다. JSON은 초기 bootstrap과 export/fixture 용도로 축소한다.

---

## 사용자 스토리

### US-1: 관리자 곡 추가

**As a** 허용된 관리자
**I want** 제목·아티스트·YouTube 출처와 사용 권한이 있는 target audio를 등록하고 분석된 원키와 처리 상태를 확인하고 싶다.
**So that** 코드나 JSON을 수정·재배포하지 않고 추천 카탈로그를 확장할 수 있다.

**Acceptance Criteria:**

- [ ] 서버에서 관리자 권한, 입력값, 중복 곡을 검증하고 HTTPS YouTube URL에서 video ID를 추출한다.
- [ ] 관리자는 전용 `음원 관리` 페이지의 `음원 추가` 버튼에서 제목·아티스트·YouTube URL과 분석·믹싱용 음원 파일만 한 번에 등록한다.
- [ ] 원키는 Modal 분석 결과와 신뢰도로 표시하며, 관리자가 해당 revision을 공개할 때 곡의 원키로 확정한다.
- [ ] 등록된 곡은 분석과 target asset이 준비되기 전까지 추천에 포함되지 않는다.
- [ ] 관리자는 대기·처리·실패·준비 상태와 실패 사유를 확인하고 실패 작업을 재시도할 수 있다.

### US-2: 영상 출처 교체

**As a** 허용된 관리자
**I want** 잘못된 영상 출처를 새 출처와 음원으로 교체하고 싶다.
**So that** 기존 추천을 불완전한 중간 상태에 노출하지 않고 새 분석 결과와 믹싱 target을 적용할 수 있다.

**Acceptance Criteria:**

- [ ] 기존 출처·분석 이력은 보존하고 새 source/analysis revision을 생성한다.
- [ ] 새 분석과 target이 모두 준비되면 한 트랜잭션으로 active revision을 전환한다.
- [ ] 전환 실패 또는 분석 실패 중에는 기존 READY revision이 계속 사용된다.
- [ ] 이번에 교체한 순위 47·62·70·76의 신규 video ID와 로컬 target audio를 적용하고 네 기존 잘못된 로컬 음원 파일을 삭제한다.

### US-3: 사용자 추천 안정성

**As a** 로그인 사용자
**I want** 관리자 변경 중에도 READY 곡만 대상으로 일관된 추천을 받고 싶다.
**So that** 카탈로그 수정이나 재배포 상태 때문에 전체 추천이 실패하지 않는다.

**Acceptance Criteria:**

- [ ] 추천은 published catalog entry와 READY active analysis를 DB에서 조회한다.
- [ ] 곡 수를 100으로 고정하지 않고 현재 공개된 전체 곡을 결정적으로 정렬한다.
- [ ] 추천은 현재 보컬 프로필·카탈로그 revision·scoring version 조합으로 요청 시 계산하고 결과 스냅샷을 영속하지 않는다.
- [ ] 카탈로그 공개 revision이 바뀌면 이전 TanStack Query 캐시와 분리된 키로 최신 READY 곡을 재계산한다.
- [ ] 믹싱 작업은 접수 시 검증한 보컬 프로필·곡 분석·target asset·추천 키 revision 입력을 영속한다.

### US-4: 관리자 커스텀 믹싱

**As a** 허용된 관리자
**I want** 내 보컬 프로필을 선택하고 임시 음원 파일을 업로드해 커스텀 믹싱을 실행하고 싶다.
**So that** 카탈로그에 등록하지 않은 음원을 운영·검증 목적으로 Modal SoulX에서 믹싱할 수 있다.

**Acceptance Criteria:**

- [ ] `/admin/custom-mixing`은 서버 관리자 권한이 없는 요청에 내용을 노출하지 않는다.
- [ ] 관리자는 자신의 `USER` 보컬 프로필만 선택하고 target audio 파일을 업로드할 수 있다.
- [ ] 서버는 선택한 프로필의 저장된 reference asset과 요청 중인 target bytes를 Modal `/v1/conversions`에 전달하고, custom target을 Leemage·PostgreSQL·프로젝트 파일에 영구 저장하지 않는다.
- [ ] 관리자는 queued/processing/succeeded/failed 상태와 결과 오디오 재생·다운로드·삭제를 확인할 수 있다.
- [ ] `/dev/svc`, `/mixing-history`, `/vocal-profiles` 목록 페이지는 제거하고 `/vocal-profiles/[id]` 상세와 `/library?tab=profiles` 복귀 흐름은 유지한다.

---

## 기능 요구사항

### FR-1: DB 카탈로그 SSOT

`Song`, `SongSource`, `SongAnalysis`, `Catalog`, `CatalogEntry`를 분리하고 출처·분석 교체를 revision으로 보존한다. `Song.catalogOrder`, JSON runtime import와 정확히 100곡 검증은 제거한다. 초기 TJ 2026-07 데이터는 idempotent bootstrap으로 적재한다.

### FR-2: 관리자 카탈로그 API와 UI

기존 `ADMIN_EMAILS` allowlist 권한을 서버에서 검증하는 전용 `/admin/songs` 음원 관리 페이지와 목록·등록·상세·출처 교체·분석 재시도·공개/보관 API를 제공한다. `음원 추가`는 제목·아티스트·HTTPS YouTube URL과 음원 파일만 하나의 multipart 요청으로 등록한다. 서버는 URL에서 video ID를 추출하고 출처 라벨을 부여하며, mutation은 idempotency와 DB transaction으로 중복 등록·부분 활성화를 방지한다. 일회성 운영 스크립트는 사용자 흐름으로 제공하지 않는다.

### FR-3: 비동기 분석 및 공개 게이트

신규 source revision은 durable analysis job을 생성한다. 관리자가 업로드한 READY target audio를 분석 입력으로 사용해 Modal CPU 함수에서 Demucs·음역 분석과 chroma 기반 원키 추정을 수행하고, 외부 작업 ID를 DB에 보존해 서버 재시작 후에도 결과를 회수한다. GPU는 곡 믹싱/합성 경로에서만 사용한다. analyzer 응답과 원키·신뢰도는 DB `SongAnalysis` revision에 저장하며 관리자 명시 공개 시 READY analysis와 READY target asset을 active pointer로 전환하고 `Song.originalKey`를 갱신한다. 업로드 원본과 stem은 Modal 작업 단위 임시 디렉터리에서만 처리하고 작업 종료 시 삭제한다.

### FR-4: 교체된 4곡 정리

순위 47 `HdTUQhHHJEg`, 62 `vepz3RlTd4M`, 70 `saK6H76TyMI`, 76 `zBTINvN-rCk`를 새 source revision으로 분석하고 저장된 신규 m4a를 target asset으로 교체한다. 기존 `WABhOy9wm3c`, `0NBmnq-uG_g`, `lVwtHrwlrF0`, `vPkOZm-2cNA` 로컬 파일은 신규 파일 검증 후 삭제한다.

### FR-5: on-demand 추천과 revision 캐시

`RecommendationRun`과 `RecommendationItem` 영속 스냅샷을 제거하고 `/recommendations/{vocalProfileId}`에서 현재 공개 카탈로그를 즉시 비교한다. `Catalog.revision`은 곡 공개·교체·보관처럼 추천 집합이나 active analysis가 바뀌는 transaction에서 증가한다. 추천 응답은 보컬 프로필 ID, catalog revision과 scoring version을 제공하며 TanStack Query key는 이 조합을 사용한다. 보컬 프로필 상세의 action은 항상 `추천 결과 보기`로 표시한다. 믹싱 접수는 추천 item row 대신 서버가 현재 결과에서 검증한 `vocalProfileId`, `songAnalysisId`, `targetAssetId`, `recommendedShift`, catalog/scoring revision을 `MixingJob`에 고정한다.

### FR-6: 관리자 커스텀 믹싱과 legacy 경로 정리

- 관리자 커스텀 믹싱은 기존 SoulX `/v1/conversions` 계약을 서버 전용 adapter로 재사용하되 관리자 세션·프로필 소유권을 먼저 검증한다.
- target multipart는 요청 처리 중에만 스트리밍하거나 OS 임시 파일로 전달하며, custom target용 `MediaAsset`, `CatalogTargetAsset`, `MixingJob`, 티켓 원장을 생성하지 않는다.
- conversion 상태·오디오·삭제 proxy는 `/api/admin/custom-mixing/*` 아래에 두고 client는 해당 route만 사용한다. 기존 `/api/conversions/*`, `/api/health`와 `development-conversion` feature는 제거한다.
- `/admin`에는 커스텀 믹싱 진입 링크를 제공하고, `/admin/custom-mixing`은 프로필 선택·파일 업로드·상태 polling·결과 player를 제공한다.
- 독립 `/mixing-history`와 `/vocal-profiles` 목록 page/링크를 제거하되, 사용자 소유 상세 `/vocal-profiles/[id]`와 `/api/vocal-profiles/*`는 유지한다. 목록 복귀 링크는 `/library?tab=profiles`를 사용한다.

---

## 비기능 요구사항

- **성능**: 추천 요청은 외부 분석을 실행하지 않고 READY DB row만 읽으며, 공개 카탈로그 조회와 상태 목록에 필요한 복합 index를 둔다.
- **보안**: 모든 관리자 API는 서버 세션과 allowlist를 검증한다. 업로드는 허용 MIME·크기·빈 파일을 검증하고 외부 저장소 credential과 URL을 클라이언트에 노출하지 않는다.
- **내구성**: 분석 작업은 서버 재시작 후 재개·재시도 가능하고 동일 source revision을 중복 활성화하지 않는다.
- **격리성**: 카탈로그 분석과 보컬 진단은 각각 별도 Modal CPU 함수로 운영하고, GPU는 곡 믹싱/합성 함수에만 할당해 workload별 timeout·메모리·autoscaling 경계를 독립적으로 유지한다.
- **재현성**: 추천 응답은 보컬 프로필·카탈로그·곡 분석 revision과 scoring version을 식별하고, 영속 믹싱 작업은 접수 시 사용한 revision 입력을 저장한다.
- **호환성**: 서비스가 아직 배포되지 않았으므로 기존 DB와 JSON runtime 계약의 하위 호환은 요구하지 않으며 reset/bootstrap을 허용한다.

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-US-028`, `PRD-US-029`, `PRD-FR-005`, `PRD-FR-006`, `PRD-FR-007`, `PRD-FR-010`, `PRD-FR-019`, `PRD-FR-020`, `PRD-FR-026`, `PRD-FR-049`, `PRD-FR-050`, `PRD-FR-057`, `PRD-FR-059`, `PRD-FR-060`, `PRD-FR-061`, `PRD-DATA-001`, `PRD-DATA-002`, `PRD-DATA-004`, `PRD-DATA-006`, `PRD-DATA-007`, `PRD-DATA-010`, `PRD-DATA-013`, `PRD-DATA-014`, `PRD-NFR-003`, `PRD-NFR-004`, `PRD-NFR-005`, `PRD-NFR-009`
  - 이미 원문 요구사항 문서에 정의된 ID만 적으세요. `spec.md`나 `tasks.md`에서 임의로 PRD ID를 만들지 않습니다.
  - 레거시 요구사항 문서에 아직 PRD ID가 없다면, 먼저 원문에 ID를 backfill한 뒤 이 필드와 `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 요구사항/스코프 변경 시 PRD 문서 + 이 필드 + `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 구현 중 더 나은 사용자 동작이 발견되어 최종 요구사항이 바뀌었다면, 이를 영구적인 `[NON-PRD]` 예외로 두지 말고 PRD 업데이트로 취급하세요.
