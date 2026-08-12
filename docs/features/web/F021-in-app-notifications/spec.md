# Feature Spec: in-app-notifications

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F021
- **기능명**: in-app-notifications
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-11
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

분석과 믹싱은 사용자가 현재 화면을 떠난 뒤에도 완료될 수 있지만, 지금은 사용자가 해당 목록이나 상세를 직접 다시 열어야 결과를 알 수 있다. 인증 제품 header의 Bell과 영속 알림 이력을 제공해 중요한 terminal 결과와 티켓 지급을 놓치지 않고 관련 화면으로 바로 이동할 수 있게 한다.

---

## 사용자 스토리

### US-1: 백그라운드 작업 결과 확인

**As a** 로그인 사용자
**I want** 보컬 분석과 AI 믹싱의 완료 또는 최종 실패를 header 알림에서 확인하고 싶다
**So that** 작업 화면을 계속 열어두지 않고도 결과를 놓치지 않을 수 있다

**Acceptance Criteria:**

- [ ] retry 가능한 중간 실패에는 알림을 만들지 않고 `SUCCEEDED` 또는 최종 `FAILED` 전환에만 알림을 한 번 생성한다.
- [ ] 성공 알림은 생성된 프로필 또는 믹스 상세로, 분석 실패는 보컬 프로필 라이브러리로, 믹싱 실패는 믹스 상세로 이동한다.
- [ ] 알림 본문은 내부 error code·error detail·외부 저장소 URL을 노출하지 않는다.

### US-2: 티켓 지급 확인

**As a** 로그인 사용자
**I want** 운영자가 티켓을 추가했을 때 알림을 받고 싶다
**So that** 잔액이 변경된 사실과 이유를 확인할 수 있다

**Acceptance Criteria:**

- [ ] 양수 `ADMIN_ADJUSTMENT`가 원장에 새로 기록된 경우에만 지급 수량을 포함한 알림을 생성하고 `/account`로 이동한다.
- [ ] `SIGNUP_GRANT`, `MIXING_REFUND`, 차감과 idempotency 재요청은 별도 티켓 추가 알림을 만들지 않는다.

### US-3: 읽음 상태와 알림 이력

**As a** 로그인 사용자
**I want** 새 알림 수와 과거 알림을 확인하고 읽음 상태를 관리하고 싶다
**So that** 아직 확인하지 않은 항목을 구분할 수 있다

**Acceptance Criteria:**

- [ ] 데스크톱 Bell은 계정 메뉴 왼쪽, 모바일 Bell은 제품 메뉴 왼쪽에 표시되고 unread badge는 99개를 초과하면 `99+`로 표시한다.
- [ ] Bell 메뉴는 최신 알림을 제공하며 메뉴를 여는 것만으로 읽음 처리하지 않는다.
- [ ] 알림 클릭은 해당 사용자 알림만 읽음 처리한 뒤 내부 경로로 이동하고 `모두 읽음`을 제공한다.
- [ ] `/notifications`는 최신순 페이지네이션, loading·empty·error 상태와 읽음 구분을 제공한다.
- [ ] 로그인하지 않은 header에는 Bell을 표시하지 않는다.

### US-4: 계정 메뉴에서 티켓 잔액 확인

**As a** 로그인 사용자
**I want** 프로필 아바타 메뉴를 열었을 때 현재 잔여 티켓을 바로 확인하고 싶다
**So that** 내 계정 화면으로 이동하지 않고도 AI 믹싱 가능 여부를 판단할 수 있다

**Acceptance Criteria:**

- [ ] 계정 메뉴 최상단에 `잔여 티켓`과 현재 티켓 수를 표시한다.
- [ ] 메뉴를 다시 열면 owner-scoped API에서 최신 잔액을 조회하며 loading·error 상태에서도 메뉴 동작을 유지한다.

---

## 기능 요구사항

### FR-1: 영속 알림과 중복 방지

알림은 사용자 소유 DB row로 저장하며 type, title, message, href, source identity, dedupe key, readAt, createdAt을 포함한다. terminal event별 결정적 dedupe key에 DB unique invariant를 적용한다.

### FR-2: 도메인 이벤트 연결

관리자 양수 티켓 조정, 보컬 분석 성공·최종 실패, 믹싱 성공·최종 실패의 실제 영속 상태 변경 경계에서 알림을 생성한다. worker retry나 client polling 결과로 알림을 추론하지 않는다.

### FR-3: 사용자 소유 API

알림 목록·unread count 조회, 개별 읽음, 모두 읽음 API는 인증 세션을 요구하고 항상 session user로 scope를 제한한다. 목록은 cursor 또는 page 기반의 제한된 page size를 사용한다.

### FR-4: Header Bell과 알림 센터

공통 ProductHeader에 Bell을 배치하고 최신 알림, unread badge, 모두 읽음, 전체 보기 이동을 제공한다. TanStack Query polling과 window focus 갱신으로 다른 화면에서도 새 알림을 반영한다.

### FR-5: 알림 수명과 안전한 이동

알림은 source의 사용자용 text snapshot을 보존한다. target resource가 삭제된 경우 상세 route의 기존 not-found 동작을 따르며 알림 목록 자체는 계속 읽을 수 있다. 이번 범위에서는 자동 보관 삭제, 이메일, 브라우저 push를 구현하지 않는다.

### FR-6: 계정 메뉴 티켓 요약

인증된 계정 메뉴는 최상단에 현재 사용 가능한 티켓 수를 표시한다. 잔액 조회는 session user로 제한한 전용 응답 계약을 사용하고 메뉴가 열릴 때 stale data를 다시 확인한다.

(상세 설명)

---

## 비기능 요구사항

- **성능**: header 조회는 최신 5개와 unread count만 반환하고 기본 30초 polling 및 window focus refetch를 사용한다. 전체 이력은 page size 상한을 둔다.
- **보안**: 모든 조회·mutation은 server session user로 scope하며 client가 userId, title, message, href 또는 dedupe key를 지정해 알림을 생성할 수 없게 한다.
- **접근성**: Bell은 `알림, 읽지 않은 알림 N개` 이름과 keyboard focus를 제공하고, unread는 색상만으로 구분하지 않는다.
- **신뢰성**: worker 재시도·동시 실행·ticket idempotency 재요청에도 알림은 event별 최대 한 건이다.

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-US-011`, `PRD-US-027`, `PRD-FR-051`, `PRD-FR-058`, `PRD-DATA-012`, `PRD-NFR-005`, `PRD-NFR-009`, `PRD-NFR-010`
  - 이미 원문 요구사항 문서에 정의된 ID만 적으세요. `spec.md`나 `tasks.md`에서 임의로 PRD ID를 만들지 않습니다.
  - 레거시 요구사항 문서에 아직 PRD ID가 없다면, 먼저 원문에 ID를 backfill한 뒤 이 필드와 `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 요구사항/스코프 변경 시 PRD 문서 + 이 필드 + `tasks.md` 태스크 태그를 함께 갱신하세요.
  - 구현 중 더 나은 사용자 동작이 발견되어 최종 요구사항이 바뀌었다면, 이를 영구적인 `[NON-PRD]` 예외로 두지 말고 PRD 업데이트로 취급하세요.
