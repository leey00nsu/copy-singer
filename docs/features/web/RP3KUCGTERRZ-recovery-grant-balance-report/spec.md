# Feature Spec: recovery-grant-balance-report

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: RP3KUCGTERRZ
- **기능명**: recovery-grant-balance-report
- **대상 레포**: copy-singer-web
- **작성일**: 2026-09-19
- **상태**: Approved
  - 값: Draft | Review | Approved
- **주 컴포넌트**: web

---

## 목적

`pnpm run tickets:recover-signup`가 실행하는 가입 지급 복구 CLI는 `--apply` 없이 실행하면 원장을 바꾸지 않는 dry-run으로 동작하지만, 결과 JSON에 지급 예정 금액만 담고 지갑 잔액은 담지 않는다. 그래서 운영자는 DB를 따로 조회하지 않고는 "현재 몇 장을 가진 사용자에게 몇 장이 더해지는지"를 판단할 수 없다. dry-run·중복 복구·실제 지급 결과에 지갑 잔액(지급 전/후)을 함께 실어, 승인 전 검토 한 번으로 지급 규모와 중복 여부를 확인할 수 있게 한다.

지급 로직, 멱등 키, 충돌 검사, 원장 스키마는 바꾸지 않는다. 출력 필드만 additive로 늘린다.

---

## 사용자 스토리

### US-1: 지급 승인 전에 잔액 변화를 확인한다

**As a** 가입 지급 누락을 복구하는 운영자
**I want** dry-run 결과에서 현재 잔액과 지급 후 잔액을 함께 보기를
**So that** DB를 따로 조회하지 않고도 지급 규모를 검토하고 승인할 수 있다

**Acceptance Criteria:**

- [ ] AC-01: `--apply` 없는 실행이 `balanceBefore`와 `balanceAfter`(지급 후 예상)를 반환하고, 지갑 행이 없으면 0에서 시작한다.
- [ ] AC-02: 중복 복구(`NOOP`)는 `balanceBefore == balanceAfter`로 반환하고, 실제 지급(`GRANTED`)은 반영된 지갑 잔액을 `balanceAfter`로 반환한다. dry-run은 DB를 바꾸지 않는다.
- [ ] AC-03: 지급 로직·멱등 키·충돌 검사·원장 스키마·기존 필드 이름은 그대로다. 기존 소비자는 새 필드를 무시해도 동작한다.
- [ ] AC-04: `pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`가 통과한다.

---

## 기능 요구사항

### FR-1: 복구 결과에 지갑 잔액 포함

`recoverSignupGrant`가 트랜잭션 안에서 대상 사용자·종류의 `TicketWallet`을 한 번 읽어 `balanceBefore`를 얻고, 세 결과 모두에 `balanceBefore`/`balanceAfter`를 담는다.

- `WOULD_GRANT`(dry-run): `balanceAfter = balanceBefore + amount`. 변경 계획일 뿐이며 DB에 쓰지 않는다.
- `NOOP`(이미 `SIGNUP_GRANT` 원장 존재): `balanceAfter = balanceBefore`. 아무것도 바꾸지 않는다.
- `GRANTED`(실제 지급): 원장 행에 저장되는 `balanceAfter`를 그대로 써서 출력과 원장이 어긋나지 않게 한다.

지갑 행이 없으면 0으로 간주한다(지급 경로의 지갑 생성은 기존 로직이 담당한다). 사용자 잠금(`FOR UPDATE`) 안에서 읽어 동시 실행에서도 값이 일관되게 나온다.

---

## 비기능 요구사항

- **성능**: 트랜잭션 안 조회 1회가 늘어난다. 지급 경로는 이미 지갑을 갱신하므로 실질 비용은 무시할 수 있다.
- **보안**: 출력에 자격 증명·토큰을 추가하지 않고 기존 운영자 전용 실행 경로를 유지한다.
- **호환성**: 필드 추가만 한다. 기존 필드의 이름·의미·타입을 바꾸지 않는다.

---

## 관련 문서

- PRD: [copy-singer-prd.md](../../../prd/copy-singer-prd.md)
- PRD Refs: PRD-NFR-017 — 운영자 전용 복구 CLI의 상위 요구사항이다. 이 Feature는 그 CLI의 검토 출력을 강화하고 지급 규칙 자체는 바꾸지 않는다.
- Architecture: [system-architecture.md](../../../prd/system-architecture.md)
- Plan: [plan.md](./plan.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- Design Refs: 없음 — UI/디자인 변경 Feature가 아니다.
