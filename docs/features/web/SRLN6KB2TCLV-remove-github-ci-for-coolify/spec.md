# Feature Spec: remove-github-ci-for-coolify

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: SRLN6KB2TCLV
- **기능명**: remove-github-ci-for-coolify
- **대상 레포**: copy-singer-web
- **작성일**: 2026-09-21
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

운영 배포는 Coolify의 기존 자동 배포를 단일 경로로 유지한다. 새로 추가된 GitHub Actions Browser E2E workflow는 PR마다 별도 CI를 실행하지만 Coolify 배포를 제어하지 않으므로 제거한다. 로컬 E2E 실행 환경과 테스트 스크립트는 보존해 필요할 때 수동 검증할 수 있게 한다.

---

## 사용자 스토리

### US-1: Coolify를 단일 자동 배포 경로로 유지한다

**As a** 운영자
**I want** GitHub Actions Browser E2E workflow를 제거하고 Coolify 자동 배포는 그대로 유지하기를
**So that** 중복되거나 별도로 관리되는 CI 없이 기존 배포 흐름을 사용할 수 있다

**Acceptance Criteria:**

- [ ] AC-01: `.github/workflows/e2e.yml`이 저장소에서 제거된다.
- [ ] AC-02: 다른 GitHub Actions workflow를 추가하거나 Coolify 설정·애플리케이션 런타임 코드를 변경하지 않는다.
- [ ] AC-03: `pnpm run test:e2e`와 `pnpm run test:e2e:compare` 및 `tests/e2e/` 테스트 자산은 유지된다.
- [ ] AC-04: E2E 운영 문서에서 PR마다 GitHub Actions가 실행된다는 설명을 제거하고 로컬 수동 실행 경계를 명시한다.

---

## 기능 요구사항

### FR-1: GitHub Actions Browser E2E 제거

`.github/workflows/e2e.yml`만 삭제한다. GitHub Actions를 Coolify 배포 선행 조건이나 webhook으로 대체하지 않는다. Coolify 구성과 자동 배포 동작은 현재 외부 설정을 그대로 사용한다.

### FR-2: 로컬 E2E 검증 수단 유지

`package.json`의 E2E 명령과 `tests/e2e/` 구현은 변경하지 않는다. `tests/e2e/TESTING.md`는 CI가 아니라 운영자가 필요할 때 실행하는 로컬 검증 절차로 설명한다.

---

## 비기능 요구사항

- **성능**: 애플리케이션 런타임과 Coolify 빌드·배포 성능에 영향이 없다.
- **보안**: secret, 환경변수, 배포 credential을 변경하거나 노출하지 않는다.
- **운영**: GitHub Actions 실패는 더 이상 배포 게이트가 아니다. 배포 전 품질 확인은 기존 로컬 검사와 Coolify 운영 절차가 담당한다.

---

## 관련 문서

- PRD: 없음 — 배포 도구 선택에 관한 내부 운영 변경이다.
- PRD Refs: 없음 (`NON-PRD`)
- Operational reference: `tests/e2e/TESTING.md`
- Design Refs: 없음 — UI 변경이 아니다.
