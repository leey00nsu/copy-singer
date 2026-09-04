# Implementation Plan: openwiki-writing-style

> 승인된 spec.md를 구현 기준으로 사용합니다. OpenWiki는 생성 산출물이며 요구사항·정책·실행 가능한 사실의 SSOT를 대체하지 않습니다.

---

## 개요

- **기능 ID**: F041
- **대상 레포**: copy-singer 전체 (`web` component에서 추적)
- **작성일**: 2026-09-04
- **상태**: Approved
  - 값: Draft | Review | Approved
- **Plan 검수**: Pending
  - 값: Pending | Running | Done
- **Plan 검수 Evidence**: -
- **Plan 검수 Decision**: -
- **Plan 검수 Round**: -
- **Plan 검수 Spec Hash**: -
- **Plan 검수 Plan Hash**: -

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Workflow | 로컬 `lee-spec-kit@0.9.12` | 미배포 변경을 registry나 tarball 없이 실제 저장소에서 검증한다. |
| Generator | OpenWiki 0.5.0 / OKF 0.2 | CopySinger의 현재 호환 generator와 출력 형식을 유지한다. |
| Writing adapter | `lee-spec-kit-technical-writing` | OpenWiki와 writing style의 결합을 관리형 skill과 INSTRUCTIONS 어댑터로 제한한다. |
| Authority | SDD + curated docs + tracked runtime facts | writing style 적용 후에도 OpenWiki를 파생 onboarding evidence로 유지한다. |

---

## 아키텍처

```text
local lee-spec-kit 0.9.12
          │
          ├─ resolve and validate ~/.openwiki
          ├─ install/verify managed technical-writing skill
          └─ preserve custom INSTRUCTIONS + update one managed block
                              │
                              ▼
                    OpenWiki full generation
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        openwiki/ Knowledge       schema 3 sync receipt
                │                           │
                └─────────────┬─────────────┘
                              ▼
              provenance audit + human sample review
```

`knowledge sync`는 설정 디렉터리를 한 번 정규화해 skill 설치와 OpenWiki child process에 동일하게 전달한다. 생성 직전과 직후에 skill hash를 확인하며, skill 또는 관리 대상 INSTRUCTIONS가 동시에 바뀌면 성공 receipt를 기록하지 않는다. 기존 schema 2 receipt는 writing policy provenance가 없으므로 증분 성공으로 간주하지 않고 전체 생성으로 갱신한다.

---

## 파일 구조

```text
~/.openwiki/
└── skills/lee-spec-kit-technical-writing/       # 0.9.12가 설치하는 관리형 writing skill

.lee-spec-kit/openwiki-sync.json                 # schema 3 writingPolicy provenance
openwiki/
├── INSTRUCTIONS.md                              # 사용자 내용 + 단일 managed writing block
├── index.md
├── quickstart.md                                # 사람 관점 표본 1
├── architecture/system-map.md                   # 사람 관점 표본 2
└── workflows/vocal-profile-analysis.md          # 사람 관점 표본 3
```

---

## Curated Documentation Impact

- **Schema**: 2
- **Assessment**: Complete
- **Product requirements**: NONE
- **System architecture**: NONE
- **Onboarding entrypoint**: NONE
- **Operational/runtime contract**: NONE
- **Reason**: 제품 요구사항, 시스템 경계, onboarding 진입 경로와 런타임 계약은 바뀌지 않는다. 이번 Feature는 기존 OpenWiki 파생 문서의 표현 방식과 그 생성 provenance만 갱신한다.
- **Targets**: -

---

## Additional Curated Impacts

- **Assessment**: Complete
- **Decision**: NONE

| Kind | Decision | Target | Reason |
| ---- | -------- | ------ | ------ |

---

## Verification Contract

### 변경 분류

- **유형**: NEW_BEHAVIOR
- **위험도**: MEDIUM

애플리케이션 실행 동작은 바뀌지 않지만 외부 OpenWiki 설정 디렉터리와 추적 중인 generated Knowledge를 함께 갱신하므로, 소유권이나 provenance를 잘못 처리하면 사용자 파일을 덮거나 검증되지 않은 문서를 커밋할 수 있다.

### 관찰 가능한 계약

- **지원해야 하는 동작**:
  - 로컬 CLI가 `0.9.12`임을 확인하고 CopySinger를 OpenWiki 활성 프로젝트로 감지한다.
  - 관리형 writing skill과 단일 managed INSTRUCTIONS block이 같은 policy id/version/hash를 사용한다.
  - schema 2 receipt를 schema 3으로 갱신하고 `writingPolicy` provenance를 기록한다.
  - `knowledge audit`가 생성 문서, claim evidence, manifest와 receipt의 결속을 검증한다.
  - `quickstart.md`, `architecture/system-map.md`, `workflows/vocal-profile-analysis.md`가 결론 우선 구조, 일관된 용어, 직접적인 문장과 추적 가능한 근거를 제공한다.
- **전제조건**: `/Volumes/sn850x/programming-2/lee-spec-kit`의 build가 `0.9.12`이고 OpenWiki provider 인증이 준비되어 있다.
- **성공 후 보장**: CopySinger의 Knowledge와 receipt가 F041 및 관리형 writing policy에 결속되고, 기존 custom INSTRUCTIONS는 보존된다.
- **중요한 실패 후 보장**: 사용자 소유 skill이나 동시 수정된 INSTRUCTIONS를 덮어쓰지 않고, 생성 중 policy가 바뀌거나 audit이 실패하면 성공 receipt와 Knowledge commit을 만들지 않는다.
- **의도적으로 지원하지 않는 사례**: 생성 Markdown 수동 교정, 앱 코드 변경, writing style 문구 snapshot 고정, OpenWiki 모델 출력의 완전한 의미 정확성 보장.

### 테스트 결정

| 계약 / 요구사항 | 결정 | 테스트 수준 | 보호할 현실적인 회귀 | 독립적인 Oracle |
| --------------- | ---- | ----------- | -------------------- | ---------------- |
| FR-1 로컬 policy 설치 | NONE | 비테스트 CLI 검증 | 다른 버전이나 registry 패키지를 잘못 사용 | CLI `--version`, 설치된 ownership manifest와 hash |
| FR-2 지침 연결·보존 | NONE | 정적 검증 | custom 내용 손실, managed block 중복 | sync 전후 INSTRUCTIONS 및 managed marker 개수 |
| FR-3 schema 3 재생성 | NONE | 통합 CLI 검증 | schema 2 receipt 재사용, policy provenance 누락 | `knowledge sync` 결과와 receipt JSON |
| FR-4 audit·가독성 | NONE | 통합 CLI + 수동 문서 검토 | 무결성은 맞지만 읽기 어려운 Knowledge 생성 | `knowledge audit`와 승인된 writing skill 기준 |

CopySinger에는 lee-spec-kit 내부 adapter 동작을 중복 테스트하는 영구 테스트를 추가하지 않는다. 실제 0.9.12 CLI 결과와 생성물 검증이 이 소비자 저장소의 안정적인 관찰 경계다.

### 의도적으로 제외하는 테스트

- OpenWiki 문장 단위 snapshot과 페이지 수 고정
- lee-spec-kit의 symlink, race, config path 단위 테스트 재작성
- 사용자-facing 앱의 신규 E2E·시각 회귀 테스트
- 생성 문서가 모든 코드 의미를 완전하게 설명한다는 주관적 전수 판정

### 검증 실행

- **구현 중**: 로컬 CLI `--version`, `detect --json`, `knowledge doctor --json`, 기존 receipt와 INSTRUCTIONS baseline 확인
- **태스크 완료 전**: `workflow-audit --json`, `commit-audit --json`
- **Feature 완료 전**: `knowledge audit F041-openwiki-writing-style --component web --json`, receipt/skill/managed block 정적 검사, 대표 문서 3개 표본 검토
- **수동/UI 검증**: `openwiki visualize ./openwiki`는 선택적인 read-only 탐색에만 사용하고 생성 파일은 수정하지 않는다.
- **전체 테스트 필요 여부**: Yes — local-ff 정책의 post-merge checks(`pnpm test`, lint, typecheck)를 그대로 수행한다.

---

## 배포·마이그레이션

애플리케이션 배포나 DB migration은 없다. registry publish 전에 로컬 0.9.12로 CopySinger 소비자 검증을 수행한다. CopySinger에는 이전 writing policy owner가 없으므로 구형 owner migration은 만들지 않고, 기존 schema 2 receipt만 정상적인 full regeneration 경로로 교체한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- Previous Knowledge baseline: `../F040-repository-knowledge-bootstrap/`
