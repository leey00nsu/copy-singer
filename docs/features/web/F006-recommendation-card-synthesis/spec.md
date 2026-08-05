# Feature Spec: recommendation-card-synthesis

> 기술 스택과 구현 구조는 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F006
- **기능명**: recommendation-card-synthesis
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

F005의 추천 상위 3곡을 사용자의 테스트 녹음 목소리로 자동 합성하고 각 추천 카드에서 바로 재생할 수 있게 한다. 사용자는 reference와 target 파일이나 SVC 옵션을 직접 준비하지 않고도 “내 목소리에 맞는 곡을 발견하고 실제 데모를 들어본다”는 제품 흐름을 끝까지 경험한다.

현재 자유 reference/target 및 advanced settings를 제공하는 SoulX-Singer Workbench는 모델·API 검증을 위한 개발용 화면으로 유지한다. 일반 사용자 추천 흐름에서는 Workbench로 이동하지 않고 추천 카드가 합성 lifecycle과 결과를 소유한다.

### 포함 범위

- 추천 생성 직후 상위 3곡의 합성 작업 자동 시작
- 사용자 VocalProfile의 원본 테스트 녹음을 합성 reference로 사용
- allowlist된 카탈로그 URL에서 target 원곡을 작업 중에만 임시 다운로드
- 추천 item별 합성 job ID, 상태, 오류와 결과 만료 metadata 저장
- 카드별 준비·대기·믹싱·완료·실패 상태와 독립 재시도
- 완료 카드 안의 결과 WAV 재생·다운로드
- 원곡 pitch를 따르는 고정 제품 preset
- 추천 삭제 시 실행 중 job 취소와 결과 제거 요청
- 기존 Workbench를 `/dev/svc` 개발·진단용 화면으로 유지
- API·DB·orchestration·UI lifecycle과 cleanup 회귀 테스트

### 제외 범위

- 추천 4위 이하 곡의 자동 합성
- 사용자가 카드 합성 preset을 변경하는 UI
- 추천 노래방 키를 SVC pitch shift에 적용하는 동작
- 원본 음원·분리 stem·다운로드 URL을 사용자에게 제공하는 동작
- 원본 또는 결과 오디오를 PostgreSQL이나 프로젝트 저장소에 넣는 동작
- 장기 결과 보관, 사용자 계정별 quota·결제·과금 UI
- Modal 실제 배포와 production authentication/rate limiting
- F005 ranking·reason·score 계산식 변경

---

## 사용자 스토리

### US-1: 추천과 동시에 세 곡 데모 생성

**As a** 보컬 프로필로 노래를 추천받는 사용자  
**I want** 추천된 세 곡이 별도 파일 선택 없이 자동으로 합성되기를 원한다  
**So that** 추천 결과를 내 목소리의 실제 데모로 바로 비교할 수 있다

**Acceptance Criteria:**

- [ ] 프로필 화면의 추천 CTA는 추천 계산과 세 곡 데모 생성을 함께 시작한다는 점을 명확히 알린다.
- [ ] RecommendationRun과 item 3개가 생성되면 사용자 추가 클릭 없이 정확히 세 개의 합성 lifecycle이 시작된다.
- [ ] 같은 run/item에 대한 중복 요청·새로고침·React 재실행은 추가 GPU job을 만들지 않는다.
- [ ] reference 녹음이 만료·삭제·손상됐으면 target 다운로드나 GPU job 전에 전체 preflight를 실패시키고 재녹음을 안내한다.

### US-2: 카드별 믹싱 상태 확인

**As a** 자동 합성을 기다리는 사용자  
**I want** 각 추천 카드에서 현재 진행 상태를 보고 싶다  
**So that** 세 곡이 순차 대기해도 앱이 멈춘 것으로 오해하지 않는다

**Acceptance Criteria:**

- [ ] 각 카드는 `preparing`, `queued`, `processing`, `succeeded`, `failed` 상태를 독립적으로 표시한다.
- [ ] 준비·대기·처리 중에는 “믹싱 중이에요”를 중심 문구로 사용하고 세부 상태를 보조 문구로 구분한다.
- [ ] 한 곡 실패가 다른 두 곡의 polling·완료·재생을 막지 않는다.
- [ ] 실패 카드에는 안전한 오류 안내와 해당 item만 다시 시도하는 동작이 있다.
- [ ] 새로고침 후 DB와 Modal의 최신 상태를 다시 조정하고 기존 job을 이어서 표시한다.

### US-3: 추천 카드에서 결과 청취

**As a** 세 곡의 합성이 완료된 사용자  
**I want** 추천 카드에서 결과를 바로 재생하고 저장하고 싶다  
**So that** 추천 이유와 실제 목소리 데모를 같은 맥락에서 비교할 수 있다

**Acceptance Criteria:**

- [ ] 성공한 각 카드는 합성 결과 WAV 플레이어와 다운로드 동작을 표시한다.
- [ ] 플레이어/다운로드는 Copy Singer API를 경유하며 Modal URL과 API key를 노출하지 않는다.
- [ ] 원곡 오디오 또는 분리 stem의 재생·다운로드 endpoint는 제공하지 않는다.
- [ ] 기존 순위·원키/추천 점수·추천 노래방 키·이유 문구는 합성 상태와 함께 유지된다.

### US-4: 개발용 Workbench 분리

**As a** 개발자  
**I want** 자유 reference/target과 advanced settings Workbench를 계속 사용하고 싶다  
**So that** 자동 제품 preset과 별도로 Modal API를 진단할 수 있다

**Acceptance Criteria:**

- [ ] Workbench는 `/dev/svc`에서 기존 파일 업로드·advanced settings·job 결과 흐름을 유지한다.
- [ ] 일반 추천 카드에는 Workbench 이동 CTA를 표시하지 않는다.
- [ ] 개발용 화면임을 헤더나 안내 문구로 명시한다.
- [ ] 자동 카드 합성 계약 변경이 기존 multipart `/api/conversions` route를 깨뜨리지 않는다.

---

## 기능 요구사항

### FR-1: 합성 preflight와 reference

- 합성 시작 전에 RecommendationRun, 정확히 3개의 item, USER VocalProfile, 연결 Recording과 원본 만료 시각을 검증한다.
- profile 생성 때 보존된 원본 테스트 녹음만 reference로 사용하고 브라우저를 통해 재업로드하지 않는다.
- reference 조회는 recording ID와 저장 관계를 서버에서 확인하며 storage path를 클라이언트에 노출하지 않는다.
- 세 job 중 하나라도 시작하기 전에 reference 접근 가능성을 한 번 검증해 불필요한 target 다운로드와 부분 과금을 줄인다.

### FR-2: allowlist target의 임시 사용

- target URL은 요청 query/body가 아니라 저장된 RecommendationItem → Song metadata 관계에서 읽는다.
- URL과 video ID가 F003의 100곡 allowlist와 일치할 때만 다운로드한다.
- 다운로드한 원곡은 target vocal separation과 accompaniment remix를 위해 서버 간에만 전달한다.
- 원곡, 분리 보컬, 반주와 중간 파일은 성공·실패·취소와 관계없이 작업 종료 시 삭제한다.
- 사용자에게는 합성 결과 WAV만 제공한다.

### FR-3: 고정 제품 preset

추천 카드 합성은 다음 값을 서버에서 고정하고 클라이언트 입력을 받지 않는다.

| 설정 | 값 | 의미 |
| --- | --- | --- |
| `prompt_vocal_separation` | `false` | 사용자 테스트 녹음을 깨끗한 reference로 사용 |
| `target_vocal_separation` | `true` | 반주 포함 원곡에서 target vocal 분리 |
| `auto_pitch_shift` | `false` | 원곡의 멜로디 pitch 유지 |
| `auto_mix_accompaniment` | `true` | 변환 보컬을 원곡 반주와 다시 믹스 |
| `pitch_shift` | `0` | 수동 semitone 이동 없음 |
| `steps` | `32` | 현재 검증된 기본값 |
| `cfg` | `1.0` | 현재 검증된 기본값 |
| `seed` | `42` | MVP 재현성 기본값 |

F004의 추천 노래방 키는 사람이 부를 때의 시작 키 안내로 계속 표시하지만 자동 합성 preset에는 적용하지 않는다.

### FR-4: item별 idempotent job lifecycle

- RecommendationItem은 synthesis job ID, 상태, 오류, 시작·완료·결과 만료 metadata를 보존한다.
- item별 시작 API는 row-level/transaction guard로 job이 없는 상태에서만 한 번 시작한다.
- 상태 조회는 저장 상태와 Modal 상태를 조정하며 상태가 뒤로 가지 않게 한다.
- `failed` item만 명시적 재시도가 가능하고 새 job ID로 교체할 때 이전 실패 trace를 보존한다.
- 세 item은 독립적으로 실패할 수 있지만 한 run당 활성/완료 대상은 정확히 3개다.

### FR-5: 카드 UI와 polling

- 추천 결과 페이지는 run 로드 후 시작되지 않은 item을 자동 시작한다.
- terminal 상태가 아닌 카드가 하나라도 있으면 제한된 주기로 상태를 갱신하고 페이지 이탈 시 polling을 정리한다.
- `preparing`은 reference/target 준비, `queued`는 Modal GPU 대기, `processing`은 변환·믹싱 중으로 설명한다.
- `succeeded`는 audio player와 WAV 다운로드를 표시하고 기존 점수·reason 영역을 숨기지 않는다.
- `failed`는 retryable 여부에 따라 재시도 또는 재녹음/관리자 확인 안내를 표시한다.

### FR-6: 삭제와 cleanup

- RecommendationRun 삭제는 item의 non-terminal Modal job을 취소하고 모든 결과 삭제를 요청한 후 DB run/item을 제거한다.
- 외부 cleanup 실패 시 DB 삭제를 성공으로 오인하지 않고 retryable 오류를 반환한다.
- Modal의 24시간 cleanup은 안전망으로 유지하되 정상 경로는 가능한 즉시 원본·중간 파일을 삭제한다.
- 결과가 만료되면 카드는 재합성 가능한 만료 상태로 정규화한다.

### FR-7: 개발용 Workbench

- 기존 `/` Workbench는 `/dev/svc`로 이동하거나 동일 컴포넌트의 개발용 alias로 제공한다.
- 제품 경로는 `/profile`과 `/recommendations/{runId}`를 중심으로 유지한다.
- Workbench의 수동 `auto_pitch_shift` 토글은 개발용으로 유지하되 자동 카드 preset과 공유 상태를 만들지 않는다.

---

## 비기능 요구사항

- **비용·동시성**: 추천 1회당 새 GPU job은 최대 3개이며 중복 시작을 차단한다. Modal `max_containers=1` 환경의 순차 대기를 UI에 표시한다.
- **보안**: Modal key, analyzer storage path와 내부 source URL 전달 계약은 서버에만 존재하며 브라우저에는 run/item ID와 직렬화된 상태만 제공한다.
- **저작권·개인정보**: 원곡을 직접 제공하지 않고 결과만 제공한다. 사용자 녹음·결과 삭제와 24시간 만료 정책을 유지한다.
- **원자성**: recommendation 저장과 외부 job 생성 사이의 분산 실패를 재시도 가능한 상태 machine으로 복구하며 중복 job을 만들지 않는다.
- **관찰 가능성**: item별 외부 job ID, 상태 변경 시각과 안전한 오류 code를 추적한다.
- **호환성**: F005 ranking·API 조회 구조와 기존 수동 conversion route를 유지한다.
- **검증**: TypeScript, ESLint, production build, Prisma validation/migration, Python unit tests, idempotency·partial failure·cleanup·UI polling 테스트를 통과해야 한다.
- **배포 경계**: 이번 feature에서는 로컬 코드와 테스트까지 완료하고 Modal deploy는 실행하지 않는다. 새 Modal endpoint가 필요하면 배포 전 별도 사용자 승인을 받는다.

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-US-007`, `PRD-FR-016`, `PRD-FR-017`, `PRD-FR-018`, `PRD-FR-019`, `PRD-FR-020`, `PRD-DATA-006`, `PRD-DATA-007`, `PRD-NFR-001`, `PRD-NFR-002`, `PRD-NFR-003`, `PRD-NFR-005`, `PRD-NFR-006`, `PRD-NFR-008`
- Idea: `../../../ideas/I006-recommendation-card-synthesis.md`
- Predecessor: `../F005-top-three-recommendations/spec.md`
