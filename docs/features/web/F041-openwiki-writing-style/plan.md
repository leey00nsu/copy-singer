# Implementation Plan: openwiki-writing-style

## 개요

- **기능 ID**: F041
- **대상 레포**: copy-singer 전체 (web component에서 추적)
- **작성일**: 2026-09-04
- **상태**: Approved
- **Plan 검수**: Pending
- **Plan 검수 Evidence**: -
- **Plan 검수 Decision**: -
- **Plan 검수 Round**: -
- **Plan 검수 Spec Hash**: -
- **Plan 검수 Plan Hash**: -

## 적용 구조와 소유권

| 대상 | 소유 프로젝트 | F041에서 수행할 일 |
| --- | --- | --- |
| Writing skill·구성 기준·adapter·검사 로직 | lee-spec-kit | 제공된 로컬 버전을 적용한다 |
| 페이지 계획·생성·index·Claim metadata | OpenWiki | 생성 workflow를 실행하고 결과를 관찰한다 |
| 생성 입력과 소비자 검증 기록 | CopySinger | 프로젝트 지침 보존, 적용 효과와 원문 탐색을 확인한다 |

로컬 /Volumes/sn850x/programming-2/lee-spec-kit의 0.9.12 CLI로 OpenWiki 0.5.0/OKF 0.2를 실행한다. Skill은 OpenWiki 설정 디렉터리의 skills/lee-spec-kit-technical-writing에 설치된다. 적용 버전·해시는 .lee-spec-kit/openwiki-sync.json의 writingPolicy에서 확인한다. 문체 규칙 본문을 이 Plan에 복제하지 않는다.

## 실행 범위

1. CLI 버전, 프로젝트 감지, provider 준비와 이전 receipt를 확인한다.
2. Feature 문서 변경을 checkpoint로 기록한 뒤 workflow의 knowledge sync를 실행한다.
3. 생성 Knowledge, 사용자 INSTRUCTIONS 보존과 receipt를 검증한다.
4. 대표 문서의 읽기 편의·코드 탐색 링크·발견 사항을 기록한다.

생성 파일은 직접 편집하지 않는다. 정책 결함은 lee-spec-kit에서 수정하고 소비자에서 다시 적용한다. 중단 시 같은 입력으로 재개한다.

## Curated Documentation Impact

- **Schema**: 2
- **Assessment**: Complete
- **Product requirements**: NONE
- **System architecture**: NONE
- **Onboarding entrypoint**: NONE
- **Operational/runtime contract**: NONE
- **Reason**: 기존 OpenWiki 적용·검증 범위이며 제품 동작, curated 진입 경로와 실행 계약은 바뀌지 않는다.
- **Targets**: -

## Additional Curated Impacts

- **Assessment**: Complete
- **Decision**: NONE

| Kind | Decision | Target | Reason |
| ---- | -------- | ------ | ------ |

## Verification Contract

### 변경 분류

- **유형**: NEW_BEHAVIOR
- **위험도**: MEDIUM

### 관찰 가능한 계약

- **지원해야 하는 동작**: 제공 정책 적용, 사용자 지침 보존, 성공 receipt와 출처 검증, 소비자 표본 확인.
- **전제조건**: 로컬 build와 provider가 준비되고 기존 변경이 checkpoint로 기록된다.
- **성공 후 보장**: 적용 policy와 생성물의 검증 결과를 식별한다.
- **중요한 실패 후 보장**: 실패 결과를 성공 receipt나 완료 기록으로 승격하지 않는다.
- **의도적으로 지원하지 않는 사례**: CopySinger 전용 writing 정책·검사기, 수동 윤문, 고정 페이지 수·문장 snapshot.

### 테스트 결정

| 계약 | 결정 | 수준 | 독립적인 Oracle |
| --- | --- | --- | --- |
| FR-1 정책 적용 | NONE | CLI·설치 결과 | 버전·관리 블록·receipt policy hash |
| FR-2 생성 | NONE | 소비자 통합 | knowledge sync와 생성 metadata |
| FR-3 검증 | NONE | CLI·사람 관점 표본 | knowledge audit, 원문 링크, 실행·이해·변경 검증 문서 |

CopySinger에는 정책 내부 동작을 중복 검증하는 영구 테스트를 추가하지 않는다. 정책 전달과 검사 로직의 회귀 테스트는 lee-spec-kit에서 소유한다.

### 검증 실행

- **태스크 완료 전**: CLI --version, detect, knowledge doctor, workflow/commit audit.
- **Knowledge 완료 전**: sync, knowledge audit, 실제 생성 경로에서 대표 문서 선택 후 원문 탐색·읽기 편의 확인.
- **전체 테스트 필요 여부**: Feature 통합 시 기존 local-ff post-merge 검사를 따른다. 정책 적용 확인을 앱 테스트로 대체하지 않는다.

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
