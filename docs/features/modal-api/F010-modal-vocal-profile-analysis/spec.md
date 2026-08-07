# Feature Spec: modal-vocal-profile-analysis

> 기술 스택과 sync/async transport 선택은 plan.md와 decisions.md에서 다룹니다.

---

## 개요

- **기능 ID**: F010
- **기능명**: modal-vocal-profile-analysis
- **대상 레포**: copy-singer-modal-api
- **작성일**: 2026-08-08
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

현재 사용자 보컬 프로필 분석은 로컬 Docker Compose의 `vocal-profile-api`가 담당한다. 이 구조에서는 실행 중인 analyzer 이미지와 repository source의 배포 시점이 달라질 수 있고, F009 구현 중 실제로 오래된 analyzer가 `smart-reference-v1` 계약을 누락한 채 실행되는 version drift가 발생했다.

이 Feature는 프로덕션 사용자 보컬 프로필 분석을 **Modal의 CPU 실행 환경으로 배포 가능한 형태로 이전**하고, 로컬 analyzer와 동일한 분석 코어·계약 테스트를 공유하게 한다. 목표는 GPU를 사용하지 않으면서 analyzer 코드와 dependency version을 배포 artifact에 고정하고, 요청 단위 임시 파일 정리와 명시적인 capability 검증으로 조용한 버전 불일치를 막는 것이다.

사용자 관점에서는 기존 최대 60초 분석, 보컬 프로필 통계, `smart-reference-v1` 최대 30초 합성 reference와 Leemage 저장 동작이 유지되어야 한다. Modal 이전은 분석 결과의 의미나 추천·믹싱 계약을 바꾸는 작업이 아니다.

---

## 사용자 스토리

### US-1: 배포 환경에서도 동일한 보컬 프로필 분석

**As a** 테스트 가창을 제출하는 로그인 사용자
**I want** 로컬 개발과 배포 환경에서 같은 분석 계약으로 보컬 프로필을 만들고 싶다
**So that** 서버 배포 상태에 따라 프로필 결과나 지원 기능이 달라지지 않는다

**Acceptance Criteria:**

- [ ] 프로덕션 분석은 Modal CPU 실행 환경에서 처리되며 프로필 분석 때문에 GPU가 할당되지 않는다.
- [ ] 동일 fixture를 local analyzer와 Modal analyzer에 넣었을 때 허용 오차 내 동일한 핵심 pitch/quality 통계와 동일한 versioned descriptor 계약을 반환한다.
- [ ] 배포된 analyzer가 필요한 capability/version을 제공하지 않으면 새 프로필을 조용히 저장하지 않고 명시적인 비호환 오류를 반환한다.
- [ ] production Modal analyzer 장애 시 다른 analyzer로 조용히 fallback하여 분석 버전이 바뀌지 않는다.

### US-2: 기존 60초 분석과 smart reference 동작 보존

**As a** 녹음 또는 업로드로 보컬 프로필을 만드는 사용자
**I want** 분석 backend가 바뀌어도 현재 프로필과 AI 믹싱 reference 동작이 유지되길 원한다
**So that** 추천 결과와 AI 믹싱 품질에 예기치 않은 회귀가 생기지 않는다

**Acceptance Criteria:**

- [ ] 입력은 현재와 동일하게 최초 유효 음성부터 최대 60초인 지원 오디오만 분석한다.
- [ ] `AnalyzerProfile`의 pitch, tessitura, quality, histogram, pitch trace와 analyzer/version metadata 계약을 유지한다.
- [ ] `descriptors.synthesisReference`와 synthesis reference response는 `smart-reference-v1` 계약을 유지하고 최대 30초를 넘지 않는다.
- [ ] 저·중·고 source range 선택, 부족 budget 재분배, 반복/padding 금지와 기존 legacy profile 호환 정책을 변경하지 않는다.
- [ ] 프로필 저장 후 추천·믹싱은 기존과 동일하게 준비된 `SYNTHESIS_REFERENCE`를 우선 사용하고 필요한 legacy fallback만 유지한다.

### US-3: 실패해도 사용자 오디오와 저장 상태가 일관되게 정리됨

**As a** 보컬 프로필 분석을 요청하는 사용자
**I want** 네트워크나 분석 인프라가 실패해도 중복 프로필이나 남은 임시 파일이 생기지 않길 원한다
**So that** 재시도와 삭제가 예측 가능하고 개인 음성이 불필요하게 남지 않는다

**Acceptance Criteria:**

- [ ] 사용자 source, 분석용 WAV와 smart reference 중간 파일은 Modal의 요청별 임시 저장소에서만 처리하고 성공·실패 시 영구 Volume에 남기지 않는다.
- [ ] 분석 성공 전 Modal 쪽에는 사용자별 영구 데이터나 Leemage resource를 만들지 않는다.
- [ ] Leemage 영구 저장과 PostgreSQL profile/asset 연결 책임은 Next.js server에 남으며 Modal analyzer에는 Leemage API Key를 제공하지 않는다.
- [ ] 동일 operation/recording ID에 대한 인프라 재시도는 Modal 쪽 영구 side effect를 만들지 않고, Next.js persistence 단계에서 중복 profile/asset 생성을 방지한다.
- [ ] Modal 성공 후 Leemage 또는 DB 저장 실패 시 현재 보상 정리 규칙에 따라 이미 생성된 외부 asset을 삭제하거나 cleanup 대상으로 기록한다.

### US-4: 분석 지연과 비용을 측정 가능한 상태로 운영

**As a** 서비스 운영자
**I want** Modal CPU 분석의 cold/warm latency, 자원 사용과 요청당 비용을 확인하고 싶다
**So that** 사용자 대기 시간과 무료/유료 compute 예산을 근거 있게 조정할 수 있다

**Acceptance Criteria:**

- [ ] 10초·30초·60초 fixture에 대해 cold/warm 실행 시간과 요청한 CPU·memory 조건을 기록한다.
- [ ] 동기 HTTP 방식을 채택할 경우 60초 fixture의 cold path가 Modal Web Function 제한에 충분한 여유를 두고 완료되는지 검증하며, 그렇지 않으면 비동기 submit/polling 방식으로 전환한다.
- [ ] 현재 Modal 공식 CPU·memory 가격을 기준으로 benchmark 시점의 요청당 예상 compute cost를 기록하고 가격 숫자를 코드 상수로 고정하지 않는다.
- [ ] 기본 운영 정책은 scale-to-zero를 허용하며, `scaledown_window`나 warm container 증가는 실제 latency/cost evidence가 있을 때만 적용한다.

---

## 기능 요구사항

### FR-1: 배포 가능한 Modal CPU analyzer

- 사용자 보컬 프로필 분석용 Modal app/function을 별도의 배포 단위로 제공한다.
- GPU resource를 요청하지 않고 CPU와 memory를 명시적으로 설정할 수 있어야 한다.
- 기존 `services/vocal-profile-api`의 분석 코어를 복제해서 분기시키지 않고 재사용 가능한 모듈 경계로 공유한다.
- Modal image는 analyzer Python dependency와 FFmpeg를 versioned build artifact로 포함한다.
- deployment/health 응답에서 analyzer name/version과 `smart-reference-v1` capability를 확인할 수 있어야 한다.

### FR-2: 기존 analyzer transport 계약 호환

- Next.js는 deployment-neutral analyzer adapter를 통해 local FastAPI 또는 Modal endpoint를 호출한다.
- 요청은 `recordingId`, 최대 60초 audio, MIME과 현재 지원하는 optional segment/preset metadata를 전달할 수 있어야 한다.
- 성공 응답은 기존 `AnalyzerProfile` 의미를 보존하고 smart synthesis reference artifact를 Next.js가 영구 저장할 수 있는 형태로 전달한다.
- expected analysis rejection은 현재 `reasonCode`, `detail`, `retryable` 형식을 유지한다.
- transport/cold-start/timeout 같은 인프라 실패는 사용자 입력 품질 오류와 구분되는 안정적인 reason code로 매핑한다.

### FR-3: 임시 파일과 artifact lifecycle

- Modal 분석은 요청 단위 임시 디렉터리를 사용하고 persistent Modal Volume에 사용자 source, 중간 WAV, synthesis reference를 저장하지 않는다.
- analyzer 응답을 만들기 전에 요청 임시 디렉터리 정리가 완료되었음을 검증 가능한 방식으로 테스트한다.
- Next.js는 분석 성공 후 source와 synthesis reference를 Leemage에 저장하고 PostgreSQL에 metadata와 relation만 기록한다.
- 저장 실패 시 현재 `discardMediaAsset`/cleanup queue와 동등한 보상 semantics를 유지한다.

### FR-4: 인증과 secret 경계

- production Modal HTTP endpoint는 공개 무인 호출을 허용하지 않고 Modal이 지원하는 server-to-server 인증 수단으로 보호한다.
- endpoint credential은 Next.js server 환경에만 두고 client bundle에 노출하지 않는다.
- Modal analyzer에는 PostgreSQL, Better Auth 또는 Leemage credential을 주입하지 않는다.
- 사용자 audio bytes, 인증 header와 secret 값을 application log에 기록하지 않는다.

### FR-5: local/Modal parity 검증

- local analyzer와 Modal analyzer가 같은 analysis/reference Python 코드와 contract fixture를 사용한다.
- 최소 10초·30초·60초 fixture 및 품질 rejection fixture에 대해 response schema, analyzer version, smart-reference descriptor와 핵심 수치 허용 오차를 비교한다.
- local 전용 FastAPI는 개발·회귀 테스트 경로로 유지할 수 있지만 production fallback으로 조용히 사용하지 않는다.

### FR-6: latency·retry·idempotency 정책

- Modal expected 4xx analysis rejection은 자동 재시도하지 않는다.
- transient infrastructure failure를 재시도하는 경우 분석 함수가 외부 영구 side effect를 갖지 않아 같은 입력을 안전하게 다시 실행할 수 있어야 한다.
- HTTP sync와 async job/polling 중 최종 transport는 benchmark와 timeout 제약을 근거로 선택하고 decisions.md에 기록한다.
- sync 방식이 선택되면 client/server timeout과 Modal HTTP timeout 사이에 명시적인 safety margin을 둔다.
- async 방식이 필요하면 Modal call ID를 직접 사용자 식별자로 사용하지 않고 서버 소유 operation 상태와 연결한다.

### FR-7: 전환과 rollback 경계

- 새 Modal analyzer가 parity/benchmark/cleanup 검증을 통과하기 전에는 production analyzer endpoint를 전환하지 않는다.
- 전환 후에도 local analyzer 코드는 contract test와 개발 fallback 용도로 유지하며 즉시 삭제하지 않는다.
- production endpoint 설정은 명시적으로 local 또는 Modal을 선택하며 실패 시 자동 backend 교체를 하지 않는다.
- 기존 저장 profile과 `smart-reference-v1` artifact는 migration 없이 계속 사용할 수 있어야 한다.

---

## 비기능 요구사항

- **성능**: 10/30/60초 fixture의 cold/warm latency를 측정한다. sync HTTP를 채택하려면 최대 60초 입력이 외부 HTTP timeout보다 충분히 짧은 budget에서 완료됨을 실제 Modal 실행으로 증명해야 한다.
- **비용**: 프로필 분석은 CPU만 사용한다. CPU·memory·warm policy별 요청당 비용을 benchmark 결과와 당시 Modal 공식 가격으로 계산하며 상시 warm container는 evidence 없이 활성화하지 않는다.
- **보안**: Modal endpoint는 server-to-server 인증을 사용하고 client에는 endpoint credential, Leemage key 또는 원본 storage URL을 노출하지 않는다.
- **개인정보**: Modal에는 사용자 오디오를 영구 저장하지 않는다. 요청별 임시 source/중간 WAV/reference와 실패 경로의 파일까지 실행 종료 전에 정리한다.
- **재현성**: local/Modal이 같은 analyzer code/version과 fixture를 사용하며 response에 analyzer version을 계속 저장한다.
- **호환성**: F009의 `AnalyzerProfile`, `smart-reference-v1`, Leemage asset 종류와 mixing snapshot semantics를 깨지 않는다.
- **관찰 가능성**: recording/user audio 내용 없이 request/operation 식별자, analyzer version, duration bucket, execution latency, outcome reason code를 진단 가능한 수준으로 기록한다.

---

## 범위 제외

- SoulX-Singer 모델, SVC algorithm 또는 L4 GPU preset 변경
- 프로필 분석에 GPU 사용
- 100곡 카탈로그의 yt-dlp/Demucs 분석 파이프라인 재설계
- Modal Volume에 사용자 보컬을 영구 저장
- Leemage 또는 PostgreSQL 교체
- 보컬 프로필 scoring/추천 알고리즘 의미 변경
- `smart-reference-v1` 선택 알고리즘 자체의 품질 튜닝
- 프로덕션 Next.js hosting provider 선정

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-US-008`, `PRD-US-009`, `PRD-US-018`, `PRD-FR-002`, `PRD-FR-003`, `PRD-FR-004`, `PRD-FR-021`, `PRD-FR-022`, `PRD-FR-027`, `PRD-FR-042`, `PRD-DATA-005`, `PRD-NFR-003`, `PRD-NFR-004`, `PRD-NFR-005`, `PRD-NFR-006`
- Idea: `../../../ideas/I007-modal-vocal-profile-analysis.md`
