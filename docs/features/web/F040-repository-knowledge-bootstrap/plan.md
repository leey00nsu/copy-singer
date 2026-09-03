# Implementation Plan: repository-knowledge-bootstrap

> 승인된 spec.md를 구현 기준으로 사용합니다.
> OpenWiki는 생성 산출물이며, 요구사항·정책·실행 가능한 사실의 SSOT를 대체하지 않습니다.

---

## 개요

- **기능 ID**: F040
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
| Workflow | lee-spec-kit 0.9.11 | Feature-scoped Knowledge receipt, audit와 전용 commit gate를 사용한다. |
| Generator | OpenWiki 0.5.0 / OKF 0.2 | 현재 lee-spec-kit이 검증하는 호환 버전과 출력 형식을 사용한다. |
| Configuration | `experimental.openwiki: true` | 부분 옵션 없이 하나의 실험 플래그로 Knowledge lifecycle 전체를 활성화한다. |
| Authority | SDD + curated docs + tracked runtime facts | OpenWiki를 파생 evidence로 제한하고 원본 자료의 책임을 유지한다. |

---

## 아키텍처

```text
PRD / Feature SDD / curated docs / tracked code·schema·config·tests
                              │
                              ▼
              lee-spec-kit knowledge sync F040
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
   openwiki/ + managed agent blocks     openwiki-sync receipt
              │                                │
              └───────────────┬────────────────┘
                              ▼
                    knowledge audit
                              │
                              ▼
              verified Knowledge-only commit
```

사람이 관리하는 README와 docs 가이드는 문서 권한과 진입 경로를 설명한다. `knowledge sync`는 tracked source에서 온보딩 자료를 생성하고, lee-spec-kit은 managed 파일 범위·source fingerprint·output hash·버전·Feature provenance를 receipt로 고정한다. audit이 통과한 결과만 workflow가 반환하는 전용 Knowledge 커밋에 포함한다.

---

## 파일 구조

```text
README.md                                      # 신규 개발자 Knowledge 진입 링크
AGENTS.md                                      # lee-spec-kit이 관리하는 OpenWiki agent block
CLAUDE.md                                      # 생성되는 OpenWiki agent 안내 위임
.openwikiignore                                # credential·runtime 파일 제외 규칙
.lee-spec-kit/openwiki-sync.json               # F040 source/output 검증 receipt
docs/
├── .lee-spec-kit.json                         # experimental.openwiki=true
├── README.md                                  # 문서 SSOT와 Knowledge 역할 설명
└── features/web/F040-repository-knowledge-bootstrap/
    ├── spec.md
    ├── plan.md
    ├── tasks.md
    └── decisions.md
openwiki/                                      # 생성된 파생 온보딩 Knowledge
```

---

## Curated Documentation Impact

> 생성형 OpenWiki 동기화는 이 판정과 별도의 workflow gate에서 검증합니다.

- **Schema**: 2
- **Assessment**: Complete
- **Product requirements**: NONE
- **System architecture**: NONE
- **Onboarding entrypoint**: UPDATE
- **Operational/runtime contract**: NONE
- **Reason**: 제품 동작과 시스템 런타임 경계는 바뀌지 않는다. 신규 개발자가 문서 권한과 OpenWiki 진입점을 찾을 수 있도록 프로젝트 README와 문서 구조 가이드를 갱신해야 한다.
- **Targets**: project:README.md, docs:README.md

---

## Additional Curated Impacts

- **Assessment**: Complete
- **Decision**: NONE

| Kind | Decision | Target | Reason |
| ---- | -------- | ------ | ------ |

`docs/.lee-spec-kit.json`, generated agent block, receipt와 `openwiki/**`는 curated 문서가 아니라 실행 설정 또는 생성·검증 산출물이므로 task와 Knowledge gate에서 별도로 추적한다.

---

## Verification Contract

### 변경 분류

- **유형**: NEW_BEHAVIOR
- **위험도**: MEDIUM

실서비스 애플리케이션 동작은 바뀌지 않지만, 플래그 활성화 후 모든 Feature 완료 경로에 Knowledge gate가 추가되므로 잘못된 receipt 또는 stale 생성물이 후속 작업을 차단할 수 있다.

### 관찰 가능한 계약

- **지원해야 하는 동작**:
  - `detect --json`이 `experimentalOpenwiki: true`를 반환한다.
  - README와 docs 가이드가 OpenWiki 진입점 및 SSOT 권한을 일관되게 설명한다.
  - `knowledge sync`가 F040을 가리키는 schema 2 receipt와 managed Knowledge surface를 생성한다.
  - `knowledge audit`과 `workflow-stage`가 동일한 source HEAD·fingerprint·output hash를 검증한다.
- **전제조건**: lee-spec-kit 0.9.11, OpenWiki 0.5.0과 유효한 로컬 provider 인증이 준비되어 있다.
- **성공 후 보장**: F039에 귀속된 OpenWiki 설정·receipt·커밋이 없고 F040 전용 Knowledge 커밋만 남는다.
- **중요한 실패 후 보장**: 생성 실패나 중단 시 검증되지 않은 Knowledge를 커밋하지 않으며 기존 소스·curated docs는 손상되지 않는다.
- **의도적으로 지원하지 않는 사례**: 생성 페이지 수동 편집, legacy Feature 일괄 migration, 원격 자동 스케줄 갱신.

### 테스트 결정

| 계약 / 요구사항 | 결정 | 테스트 수준 | 보호할 현실적인 회귀 | 독립적인 Oracle |
| --------------- | ---- | ----------- | -------------------- | ---------------- |
| FR-1 플래그 활성화 | NONE | 비테스트 CLI 검증 | 설정했지만 workflow가 비활성인 상태 | `detect --json` 결과 |
| FR-2 온보딩·SSOT 경계 | NONE | 문서 정적 검토 | OpenWiki를 SSOT로 오해하거나 진입 링크 누락 | 승인된 spec과 built-in Knowledge Architecture 정책 |
| FR-3 F040 기반 재생성 | NONE | 통합 CLI 검증 | stale F039 receipt 또는 잘못된 managed block 재사용 | `knowledge sync` receipt와 현재 Git HEAD |
| FR-4 검증된 커밋 | NONE | 통합 CLI 검증 | audit 실패 결과나 범위 밖 파일 커밋 | `knowledge audit`, `workflow-stage`, `commit-audit` |

### 의도적으로 제외하는 테스트

- OpenWiki 내부 생성 모델의 문장 단위 snapshot 테스트
- 생성 페이지의 고정 개수·고정 문구 테스트
- 사용자-facing 앱 코드에 대한 신규 테스트
- lee-spec-kit 자체 동작을 copy-singer 테스트로 중복 검증하는 테스트

### 검증 실행

- **구현 중**: `npx lee-spec-kit detect --json`, README 링크·권한 문구 정적 확인
- **태스크 완료 전**: `npx lee-spec-kit workflow-audit --json`, `npx lee-spec-kit commit-audit --json`
- **Feature 완료 전**: `npx lee-spec-kit knowledge audit F040-repository-knowledge-bootstrap --component web --json`, `npx lee-spec-kit workflow-stage F040 --component web --json`
- **수동/UI 검증**: 필요 없음. 필요 시 `openwiki visualize ./openwiki`는 read-only 확인에만 사용한다.
- **전체 테스트 필요 여부**: Yes — local-ff 정책의 post-merge checks(`pnpm test`, lint, typecheck)를 그대로 수행하되 이번 Feature는 앱 코드를 변경하지 않는다.

---

## 배포·마이그레이션

애플리케이션 배포나 DB migration은 없다. 기존 F001~F039의 legacy Curated Documentation Impact는 이번 범위에서 일괄 변경하지 않는다. OpenWiki 플래그와 초기 Knowledge가 main에 통합되면 이후 Feature부터 동일한 Knowledge gate를 따른다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- Project onboarding: `../../../../README.md`
- Documentation guide: `../../../README.md`
