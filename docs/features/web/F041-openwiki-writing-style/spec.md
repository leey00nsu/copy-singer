# Feature Spec: openwiki-writing-style

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F041
- **기능명**: openwiki-writing-style
- **대상 레포**: copy-singer-web
- **작성일**: 2026-09-04
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

OpenWiki가 생성하는 Knowledge 문서에 lee-spec-kit 0.9.12의 관리형 technical writing style을 적용하고 결과의 가독성과 출처 무결성을 검증한다.

현재 OpenWiki 문서는 코드 탐색용 근거로는 유용하지만, 문서마다 설명 순서와 문장 밀도가 달라 신규 개발자가 핵심 구조를 빠르게 파악하기 어렵다. 배포 전인 로컬 `lee-spec-kit@0.9.12`를 직접 사용해 관리형 writing skill을 적용하고, 기존 Knowledge를 새 정책으로 다시 생성한다.

---

## 사용자 스토리

### US-1: 일관된 온보딩 문서 읽기

**As a** CopySinger 코드베이스에 처음 참여하는 개발자
**I want** 현재 코드 구조와 런타임 흐름이 일관된 기술 문서 형식으로 설명되기를 원한다
**So that** 저장소를 탐색하는 데 필요한 맥락을 빠르게 얻고 원문 코드까지 추적할 수 있다

**Acceptance Criteria:**

- [ ] 생성된 Knowledge가 관리형 technical writing policy를 사용했다는 receipt를 남긴다.
- [ ] 대표적인 진입 문서와 개념·런타임 흐름 문서가 결론 우선, 일관된 용어, 짧고 직접적인 문장으로 작성된다.
- [ ] 생성된 설명의 중요한 사실은 기존 repo-file provenance와 Markdown 링크로 원문까지 추적할 수 있다.

---

## 기능 요구사항

### FR-1: 로컬 0.9.12 writing policy 설치

Registry publish나 tarball 설치 없이 `/Volumes/sn850x/programming-2/lee-spec-kit`의 로컬 `0.9.12` CLI를 사용한다. Knowledge 동기화 전에 `lee-spec-kit-technical-writing` skill을 OpenWiki 설정 디렉터리에 설치하고, 사용자 소유의 같은 이름 skill이 있다면 덮어쓰지 않는다.

### FR-2: OpenWiki 생성 지침 연결

`openwiki/INSTRUCTIONS.md`의 사용자 작성 내용은 보존하면서 lee-spec-kit 관리 블록을 정확히 하나 유지하고, OpenWiki가 Knowledge 작성 시 관리형 writing skill을 사용하도록 지시한다.

### FR-3: 새 정책으로 전체 Knowledge 갱신

기존 schema 2 receipt를 writing policy provenance가 포함된 최신 receipt로 교체한다. 증분 결과가 새 정책 적용을 증명하지 못하면 전체 재생성을 수행하며, 성공한 검증 결과에 대해서만 receipt를 기록한다.

### FR-4: 사람과 에이전트가 함께 읽을 수 있는 결과 검증

생성 후 `knowledge audit`를 통과해야 한다. 또한 onboarding 진입점, 주요 개념, 핵심 런타임 흐름을 대표하는 문서를 표본 검토해 문장 구조와 정보 계층이 사람의 탐색에도 적합한지 확인한다.

---

## 비기능 요구사항

- **성능**: 재생성은 OpenWiki의 기존 timeout 정책 안에서 완료하거나 재개 가능한 중단 상태를 정확히 보고해야 한다.
- **보안**: 기존 사용자 skill과 `INSTRUCTIONS.md`의 동시 편집을 덮어쓰지 않으며, 생성 중 writing skill이 바뀌면 receipt를 기록하지 않는다.
- **호환성**: CopySinger 애플리케이션 코드와 제품 동작은 변경하지 않는다.

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: -
  - 이미 원문 요구사항 문서에 정의된 ID만 적으세요. `spec.md`나 `tasks.md`에서 임의로 PRD ID를 만들지 않습니다.
  - 레거시 요구사항 문서에 아직 PRD ID가 없다면, 먼저 원문에 ID를 backfill한 뒤 이 필드와 `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 요구사항/스코프 변경 시 PRD 문서 + 이 필드 + `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 구현 중 더 나은 사용자 동작이 발견되어 최종 요구사항이 바뀌었다면, 이를 영구적인 `[NON-PRD]` 예외로 두지 말고 PRD 업데이트로 취급하세요.
- Design Refs: - (선택 사항, 명시적인 UI/UX 디자인 작업에만 프로젝트 루트 기준 경로 사용)
  - Design System: - (예: `docs/designs/design-system.md`)
  - Visual Brief: - (예: `docs/designs/<feature-visual-brief>.md`)
