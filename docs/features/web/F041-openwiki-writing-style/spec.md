# Feature Spec: openwiki-writing-style

## 개요

- **기능 ID**: F041
- **기능명**: openwiki-writing-style
- **대상 레포**: copy-singer-web
- **작성일**: 2026-09-04
- **상태**: Approved

## 목적

lee-spec-kit이 제공하는 OpenWiki Knowledge 구조와 기본 writing skill을 CopySinger에 적용하고, 신규 개발자가 생성 문서를 읽고 원문 코드로 이동할 수 있는지 검증한다.

F041은 소비자 적용 Feature다. Writing skill의 문체·구성 규칙, planner 계약, adapter와 검사 로직의 설계·유지보수는 lee-spec-kit이 소유한다. CopySinger는 이를 중복 구현하거나 독자적인 문체 정책으로 정의하지 않는다.

## 사용자 스토리

### US-1: 제공된 writing skill이 적용된 온보딩 문서 읽기

**As a** CopySinger에 새로 참여하는 개발자
**I want** 제공된 writing skill이 적용된 현재 코드 설명을 읽고 원문을 확인한다
**So that** 로컬 실행과 코드 변경에 필요한 문서를 찾을 수 있다

**Acceptance Criteria:**

- [ ] 설치된 관리형 skill과 receipt가 적용한 policy의 버전·해시를 식별한다.
- [ ] 사용자 INSTRUCTIONS를 보존하고 관리 블록이 하나만 유지된다.
- [ ] 생성 결과가 제공된 Knowledge 검증을 통과하고 주요 설명에서 tracked source로 이동할 수 있다.
- [ ] 실행·시스템 이해·변경 검증 문서를 표본 검토해 적용 효과와 잔여 품질을 기록한다.

## 기능 요구사항

### FR-1: 로컬 정책 적용

Registry publish나 tarball 설치 없이 로컬 lee-spec-kit 0.9.12 CLI를 사용한다. 관리형 skill 설치·소유권 확인·지침 갱신은 제공된 knowledge sync가 담당한다.

### FR-2: 제공된 Knowledge 구조로 생성

experimental.openwiki=true의 workflow를 사용한다. Policy가 변경되면 CLI의 재생성 경로를 따른다. 특정 문서 수·디렉터리 분류·문장 종결형을 CopySinger에서 별도 규정하지 않는다.

### FR-3: 적용 결과 검증

knowledge audit로 생성물·출처·manifest·receipt의 결속을 검증한다. 대표 문서의 읽기 편의와 원문 탐색 경로를 표본 검토한다. 정책·생성기 문제는 소비자 발견 사항으로 기록하고 해당 소유 프로젝트에서 개선한다.

## 비기능 요구사항

- **실패 처리**: 실패 시 부분 결과를 보존하고 성공으로 기록하지 않는다.
- **보안**: 사용자 skill·지침·비밀 정보를 보호하는 제공 정책을 따른다.
- **호환성**: 앱 동작과 API·DB 계약은 변경하지 않는다.

## 제외 범위

- Writing skill·adapter·문체 검사기 자체 구현
- 생성 Markdown 수동 윤문
- Curated 정책의 대체
- 모든 생성 문서의 의미 정확성 또는 특정 윤문본과 동일한 편집 품질 보장

## 관련 문서

- PRD Refs: -
- Plan: [plan.md](./plan.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
