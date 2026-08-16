# Feature Spec: admin-song-catalog-first-import

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F037
- **기능명**: admin-song-catalog-first-import
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-16
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

빈 PostgreSQL 환경에서도 관리자 음원 관리 페이지에 진입해 카탈로그 snapshot을 최초 import할 수 있도록 초기 상태와 카탈로그 의존 action을 정리한다.

현재 `/admin/songs`는 snapshot import API가 카탈로그를 생성할 수 있음에도 페이지 조회가 먼저 고정 slug의 카탈로그를 요구한다. 신규 배포 DB에서는 `CATALOG_NOT_FOUND`가 발생해 import UI에 도달할 수 없으므로, 관리자 UI라는 정식 복원 경로를 사용하지 못하고 브라우저 콘솔이나 DB 수동 조작이 필요해진다. 이 Feature는 빈 DB를 정상적인 최초 복원 상태로 취급해 관리 화면 안에서 snapshot을 가져올 수 있게 한다.

---

## 사용자 스토리

### US-1: 빈 DB에 최초 카탈로그 복원

**As a** 배포 환경의 관리자
**I want** 카탈로그가 아직 없는 DB에서도 음원 관리 화면을 열고 로컬에서 내보낸 snapshot을 가져오고 싶다.
**So that** 콘솔·SQL·별도 초기화 스크립트 없이 관리자 UI만으로 새 배포 환경을 복원할 수 있다.

**Acceptance Criteria:**

- [ ] 관리자 세션으로 `/admin/songs`에 접근했을 때 대상 카탈로그가 없어도 서버 오류 페이지가 아닌 최초 복원 상태가 표시된다.
- [ ] 최초 복원 상태에서 JSON snapshot 가져오기 action을 사용할 수 있다.
- [ ] snapshot 가져오기는 기존 import API의 transaction·schema validation·idempotent upsert 계약을 유지하며 카탈로그 row를 생성한다.
- [ ] 가져오기 성공 후 같은 관리 화면이 새 카탈로그 목록을 표시한다.
- [ ] 카탈로그가 없는 동안 내보내기, 검색, 곡 추가 등 기존 카탈로그를 요구하는 action은 실행되지 않으며 이유가 화면에 명확히 표시된다.
- [ ] 기존 카탈로그가 있는 환경의 조회·검색·추가·내보내기·snapshot 반복 import 동작은 바뀌지 않는다.

---

## 기능 요구사항

### FR-1: 카탈로그 부재를 정상 초기 상태로 표현

관리자 페이지의 서버 조회는 `CATALOG_NOT_FOUND`를 렌더링 실패로 전파하지 않고 식별 가능한 초기 상태로 변환해야 한다. 다른 DB 오류나 권한 오류는 초기 상태로 오인하지 않고 기존 오류 경계를 유지해야 한다.

### FR-2: 최초 snapshot import 진입점 유지

초기 상태에서도 기존 관리자 snapshot import dialog와 `/api/admin/catalog/import`를 사용할 수 있어야 한다. import 성공 시 route refresh를 통해 일반 카탈로그 관리 상태로 전환해야 한다.

### FR-3: 카탈로그 의존 action 제한

초기 상태에서는 내보내기, 검색·필터, 곡 추가와 목록 관리 action을 숨기거나 비활성화하고 카탈로그 snapshot을 먼저 가져와야 한다는 안내를 제공해야 한다. 읽기 요청만으로 빈 카탈로그 row를 자동 생성하지 않는다.

### FR-4: 회귀 방지

빈 DB 페이지 렌더링과 최초 import 전환을 자동화된 테스트로 검증하고, 카탈로그가 이미 존재하는 기존 관리자 화면 및 import API의 권한·검증 계약을 보존해야 한다.

---

## 비기능 요구사항

- **성능**: 초기 상태 판별은 현재 카탈로그 조회 외 별도 외부 요청이나 전체 테이블 스캔을 추가하지 않는다.
- **보안**: 페이지와 import API는 기존 `requireAdminPage`·`requireAdminApi` 서버 권한 검증을 유지하며, 카탈로그 부재를 인증 우회 조건으로 사용하지 않는다.

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-007`, `PRD-FR-059`, `PRD-NFR-009`
  - 이미 원문 요구사항 문서에 정의된 ID만 적으세요. `spec.md`나 `tasks.md`에서 임의로 PRD ID를 만들지 않습니다.
  - 레거시 요구사항 문서에 아직 PRD ID가 없다면, 먼저 원문에 ID를 backfill한 뒤 이 필드와 `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 요구사항/스코프 변경 시 PRD 문서 + 이 필드 + `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 구현 중 더 나은 사용자 동작이 발견되어 최종 요구사항이 바뀌었다면, 이를 영구적인 `[NON-PRD]` 예외로 두지 말고 PRD 업데이트로 취급하세요.
- Design Refs: - (선택 사항, 명시적인 UI/UX 디자인 작업에만 프로젝트 루트 기준 경로 사용)
  - Design System: - (예: `docs/designs/design-system.md`)
  - Visual Brief: - (예: `docs/designs/<feature-visual-brief>.md`)
