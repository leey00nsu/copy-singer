# Feature Spec: repository-knowledge-bootstrap

> 기술 스택과 문서 영향 판정은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F040
- **기능명**: repository-knowledge-bootstrap
- **대상 레포**: copy-singer 전체 (`web` component에서 추적)
- **작성일**: 2026-09-04
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

신규 개발자가 저장소에 처음 진입했을 때 실제 코드 구조, 주요 런타임 흐름과 검증 경로를 빠르게 찾을 수 있도록 OpenWiki 기반의 파생 Knowledge 계층을 도입한다.

기존 SDD와 사람이 관리하는 프로젝트 문서는 요구사항·변경 범위·의사결정·정책의 SSOT로 유지한다. OpenWiki는 tracked 코드, 스키마, 설정과 테스트를 바탕으로 생성하는 온보딩·코드 탐색 증거로만 사용하며 직접 편집하지 않는다. 과거 F039에 잘못 귀속됐던 실험 결과와 stale receipt는 재사용하지 않고 F040 범위에서 0.9.11로 새로 생성·검증한다.

---

## 사용자 스토리

### US-1: 신규 개발자의 코드베이스 탐색

**As a** copy-singer 저장소에 처음 참여하는 개발자
**I want** 프로젝트의 주요 경계, 도메인, 런타임 흐름과 테스트 진입점을 한곳에서 탐색한다.
**So that** 낡은 경로 설명이나 개별 Feature 이력만으로 전체 구조를 추측하지 않고 실제 코드 근거를 빠르게 확인할 수 있다.

**Acceptance Criteria:**

- [ ] 저장소 루트의 onboarding entrypoint에서 OpenWiki의 위치와 역할을 찾을 수 있다.
- [ ] 생성된 Knowledge가 시스템 경계, 주요 도메인·통합, 핵심 워크플로와 검증 경로를 tracked source에 근거해 설명한다.
- [ ] 중요한 사실은 코드·스키마·설정·테스트에서 다시 검증해야 한다는 안내가 명시된다.

### US-2: 명확한 문서 권한과 갱신 절차

**As a** Feature를 구현하거나 리뷰하는 개발자
**I want** SDD, curated docs, 실행 가능한 코드와 OpenWiki의 권한 및 갱신 방식이 구분된다.
**So that** 생성 문서를 요구사항이나 정책의 정본으로 오해하지 않고 Feature 변경과 함께 올바른 문서를 갱신할 수 있다.

**Acceptance Criteria:**

- [ ] PRD, 활성 Feature SDD, curated docs, tracked runtime facts와 OpenWiki의 역할이 onboarding 문서에 구분되어 있다.
- [ ] OpenWiki 생성·갱신은 `lee-spec-kit knowledge sync`로만 수행하고 생성 페이지를 손으로 수정하지 않는다.
- [ ] 검증된 receipt가 F040과 현재 source fingerprint를 가리키고 `knowledge audit`를 통과한다.

---

## 기능 요구사항

### FR-1: 단일 실험 플래그로 Knowledge 계층 활성화

`docs/.lee-spec-kit.json`의 `experimental.openwiki`를 `true`로 설정한다. 별도의 부분 활성화 옵션을 추가하지 않으며, 활성화된 workflow가 반환하는 Knowledge 준비·동기화·커밋 gate를 따른다.

### FR-2: 온보딩 진입점과 SSOT 경계 정리

`README.md`, `docs/README.md`와 lee-spec-kit이 관리하는 agent 안내에서 다음 권한을 일관되게 설명한다.

- PRD: 장기 제품 요구사항
- 활성 Feature SDD: 현재 변경의 범위, 설계, 태스크와 결정
- curated project docs: 사람이 관리하는 프로젝트 전체 설명과 정책
- tracked 코드·스키마·설정: 실행 가능한 런타임 사실
- OpenWiki: 위 자료에서 파생된 온보딩·코드 탐색 증거

### FR-3: 0.9.11 기반 초기 Knowledge 재생성

과거 생성 실패 또는 다른 Feature에 귀속된 `openwiki/`, agent block과 receipt를 재사용하지 않는다. 0.9.11의 `knowledge sync F040-repository-knowledge-bootstrap` 경로로 전체 Knowledge를 생성하고, 생성된 managed surface와 receipt가 현재 source HEAD 및 fingerprint에 일치해야 한다.

### FR-4: 검증된 전용 Knowledge 커밋

`knowledge audit`가 출력 범위, managed agent block, OpenWiki/OKF 버전, output hash와 source freshness를 모두 검증한 후에만 `workflow-stage`가 반환하는 정확한 대상과 제목으로 Knowledge 커밋을 만든다.

---

## 비기능 요구사항

- **재현성**: 같은 tracked source와 설정에서 Knowledge audit이 검증 가능한 receipt와 output hash를 제공해야 한다.
- **보안**: 환경 변수, OAuth token, credential과 ignored secret 파일은 Knowledge 입력·출력 및 커밋에 포함하지 않는다.
- **유지보수성**: 생성 페이지를 직접 수정하지 않고 잘못된 설명은 source 또는 curated docs를 수정한 뒤 다시 생성한다.
- **제품 영향**: 사용자-facing 애플리케이션 동작, API, DB schema와 배포 런타임은 변경하지 않는다.

---

## 제외 범위

- F001~F039 전체의 Curated Documentation Impact를 일괄 마이그레이션하는 작업
- OpenWiki를 요구사항·정책·런타임 사실의 SSOT로 승격하는 작업
- 생성된 `openwiki/**` 페이지의 수동 편집
- 애플리케이션 기능, API, 데이터 모델 또는 배포 구조 변경
- 자동 스케줄 또는 원격 CI 기반 Knowledge 갱신 도입

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: - (내부 온보딩·개발 workflow 변경)
- Plan: [plan.md](./plan.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- Project onboarding: `../../../../README.md`, `../../../README.md`
- Design Refs: - (UI/UX 변경 없음)
