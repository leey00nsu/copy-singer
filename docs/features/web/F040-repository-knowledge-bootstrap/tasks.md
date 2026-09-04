# Tasks: repository-knowledge-bootstrap

## 태스크 규칙

- **상태**: 기본은 `[TODO]` → `[DOING]` → `[DONE]`; workflow가 task review를 요구하면 `[REVIEW]`를 거칩니다.
- 한 번에 하나의 태스크만 진행하며, 완료 시 Acceptance와 Checklist를 함께 갱신합니다.
- `[NON-PRD]`는 제품 동작을 바꾸지 않는 내부 문서·tooling 작업에 사용합니다.
- generated OpenWiki surface는 일반 태스크 커밋이 아니라 workflow의 Knowledge 전용 gate와 커밋으로 관리합니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer 전체 (`web` component에서 추적)
- **브랜치**: `feat/repository-knowledge-bootstrap`
- **대기 중 변경 요청**: 기존 프로젝트의 curated 문서 baseline reconciliation과 WHY 탐색 경로를 F040에 포함한다.
- **Feature 리뷰**: -
- **Feature 리뷰 Evidence**: -
- **Feature 리뷰 Decision**: -
- **Feature 리뷰 Round**: -
- **Feature 리뷰 Head**: -
- **Feature 리뷰 Tree**: -

---

## 태스크 목록

- [DONE][NON-PRD] T-F040-repository-knowledge-bootstrap-01 OpenWiki 설정과 온보딩 진입점 정리
  - Date: 2026-09-04
  - Acceptance:
    - `experimental.openwiki`가 하나의 boolean 플래그로 활성화되고 `detect --json`에서 확인된다.
    - 프로젝트 README와 docs 가이드가 OpenWiki 위치, 갱신 방법과 SSOT 권한을 일관되게 설명한다.
    - 사용자-facing 애플리케이션 코드, API, schema와 런타임 동작은 변경되지 않는다.
  - Checklist:
    - [x] `docs/.lee-spec-kit.json`에 `experimental.openwiki: true`를 설정한다.
    - [x] `README.md`에 신규 개발자용 Knowledge 진입 링크와 검증 원칙을 추가한다.
    - [x] `docs/README.md`에 PRD·Feature SDD·curated docs·tracked runtime facts·OpenWiki의 권한을 구분한다.
    - [x] `detect --json`과 문서 정적 검토로 설정 및 링크를 검증한다.
  - Docs:
    - docs:.lee-spec-kit.json
    - project:README.md
    - docs:README.md

- [DONE][NON-PRD] T-F040-repository-knowledge-bootstrap-02 curated 문서 기준선 복구와 WHY 탐색 연결
  - Date: 2026-09-04
  - Acceptance:
    - 시스템 아키텍처와 web component 가이드에서 제거·이동된 legacy 경로가 현재 코드 탐색 경로로 교체된다.
    - constitution은 현재 장기 원칙을 유지하고 빠르게 낡는 lee-spec-kit 고정 버전을 제거한다.
    - PRD와 custom policy는 현재 제품 의도·운영 규칙 기준으로 검토되고 임의로 코드에 맞춰 변경되지 않는다.
    - onboarding 문서가 OpenWiki → tracked source → Git F-ID → Feature `decisions.md`의 WHY 탐색 순서를 설명한다.
  - Checklist:
    - [x] `system-architecture.md`를 현재 FSD·API·durable worker·외부 서비스 경계와 대조해 갱신한다.
    - [x] `docs/features/web/README.md`의 코드 탐색 지도를 현재 `app/`, `src/`, `services/`, `tests/` 구조로 갱신한다.
    - [x] `constitution.md`의 기술·아키텍처 원칙과 버전 표기를 현재 기준선에 맞춘다.
    - [x] PRD와 `custom.md`의 의도·정책 유효성을 검토하고 결과를 `decisions.md`에 기록한다.
    - [x] README와 docs 가이드에 질문별 SSOT 및 Git F-ID → `decisions.md` 탐색 절차를 추가한다.
  - Docs:
    - project:README.md
    - docs:README.md
    - docs:prd/system-architecture.md
    - project:docs/features/web/README.md
    - docs:agents/constitution.md

---

## Knowledge Sync

- **Policy**: `.lee-spec-kit.json`의 `experimental.openwiki`에서 파생
- **Receipt**: `.lee-spec-kit/openwiki-sync.json`
- **Expected trigger**: `F040-repository-knowledge-bootstrap`
- **Commit policy**: task checkpoint 이후 workflow가 반환하는 exact Knowledge sync·commit action을 따른다.

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며, 각 태스크의 `Acceptance` 검증 및 `Checklist` 체크 완료 <!-- lee-spec-kit:completion:all-tasks -->
- [ ] 테스트·CLI 검증 실행 및 통과 <!-- lee-spec-kit:completion:tests -->
- [ ] 최종 결과를 공유했고 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함 <!-- lee-spec-kit:completion:final-outcome -->

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `npx lee-spec-kit detect --json` | `2026-09-04` | `PASS — PROJECT_DETECTED, experimentalOpenwiki=true` |
| `npx lee-spec-kit workflow-audit --json` | `2026-09-04` | `PASS — WORKFLOW_IN_SYNC` |
| `npx lee-spec-kit knowledge audit F040-repository-knowledge-bootstrap --component web --json` | `2026-09-04` | `PASS — OPENWIKI_VERIFIED, source=944780e, output=sha256:95b6177e…e8d8a` |
| curated 문서 baseline 정적 대조 | `2026-09-04` | `PASS — legacy 경로·고정 버전 제거, 참조 경로 존재 확인` |
| `pnpm run check:architecture` | `2026-09-04` | `PASS — Steiger 및 FSD boundary 4 tests` |
| `npx lee-spec-kit docs-audit --json` | `2026-09-04` | `WARN — 기존 design 문서 2개의 DOC_KIND_MISSING; F040 제외 범위` |
| local-ff post-merge checks | `-` | `-` |

<!-- lee-spec-kit:workflow-sync sha256:c97edef4c4a4f1035c0e6557a761aa3e697fb3ade862d8534b65a5641e4d4b8b -->
