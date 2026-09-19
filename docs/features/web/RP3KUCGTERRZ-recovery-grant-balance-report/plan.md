# Implementation Plan: recovery-grant-balance-report

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: RP3KUCGTERRZ
- **대상 레포**: copy-singer-web
- **작성일**: 2026-09-19
- **상태**: Approved
  - 값: Draft | Review | Approved
- **Plan 검수**: Pending
  - 값: Pending | Running | Done
- **Plan 검수 Evidence**: -
  - 예: `docs/features/F001-foo/decisions.md` 또는 docs 루트 아래의 실제 리뷰 산출물
- **Plan 검수 Decision**: -
  - 형식: `결정: approve|changes_requested|blocked ...` 또는 `decision: ...`
- **Plan 검수 Round**: -
  - `workflow-stage --json`이 반환한 양의 정수이며 첫 리뷰는 `1`
- **Plan 검수 Spec Hash**: -
  - `workflow-stage --json`이 반환한 정확한 `specHash`
- **Plan 검수 Plan Hash**: -
  - `workflow-stage --json`이 반환한 정확한 `planHash`

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| 언어/런타임 | TypeScript, Prisma 7 | 기존 티켓 도메인 서비스와 같은 트랜잭션 경로를 유지한다 |
| 실행 경로 | 기존 `pnpm run tickets:recover-signup` | `scripts/recover-signup-grant.ts`가 결과 JSON을 그대로 출력하므로 스크립트 변경이 필요 없다 |
| 정적 검사 | `pnpm exec tsc --noEmit`, `pnpm run lint` | 저장소 표준 검사이며 새 도구를 도입하지 않는다 |
| 통합 테스트 | 기존 `tests/signup-recovery.integration.ts` | 지갑·원장·가입 지급 의도를 이미 격리 DB로 검증한다 |

---

## 아키텍처

운영자 CLI → `recoverSignupGrant`(entities/ticket) → Prisma 트랜잭션 순서는 그대로다. 트랜잭션 안에서 대상 사용자 행을 잠그고, 가입 지급 의도와 기존 `SIGNUP_GRANT` 원장을 확인한 뒤 지갑을 한 번 읽어 `balanceBefore`를 얻는다. 결과는 세 갈래로 나뉜다.

- 원장이 이미 있으면 아무것도 쓰지 않고 `NOOP`과 현재 잔액을 반환한다.
- `apply`가 없으면 쓰지 않고 `WOULD_GRANT`과 지급 후 예상 잔액을 반환한다.
- `apply`가 있으면 의도를 upsert하고 원장을 만들며, 원장 행에 기록된 `balanceAfter`를 그대로 반환한다.

잔액은 사용자 잠금 안에서 읽으므로 동시 실행에서도 출력과 원장이 어긋나지 않는다.

---

## 파일 구조

```
src/entities/ticket/api/ticket-service.ts   # recoverSignupGrant 결과에 잔액 추가
tests/signup-recovery.integration.ts        # dry-run·NOOP·GRANTED 잔액 단언 추가
```

---

## Curated Documentation Impact

README 보호와 보조 산출물 위치는 `agents` 문서의 해당 규칙을 우선합니다. README 불일치는 수정 요청이 없으면 `decisions.md`의 경로·근거·보류 사유를 참조하는 `NONE`으로 기록할 수 있으며, 이 예외에 별도 후속 항목이나 수정 승인을 요구하지 않습니다. 보존할 Feature 보조 산출물은 활성 Feature의 `artifacts/`에 저장하고 상대경로로 연결합니다.

발견한 문서 불일치는 `decisions.md`에만 남기고 종료하지 않습니다. 현재 사실의 명백한 오류가 승인 범위 안에 있으면 `UPDATE`/`ADD`와 task `Docs`로 연결합니다. 제품 의도 확인이나 범위 확장이 필요하면 충돌한 문서 경로·근거, 확인할 질문, 보류 이유와 실제 후속 task/Feature/issue 참조를 기록합니다. 없는 번호나 승인을 만들지 않습니다. 추적 항목 생성에 승인이 필요하면 사용자 확인 전 해결된 것으로 기록하지 않습니다. `NONE`의 근거에는 알려진 불일치가 없거나, 남은 불일치가 해당 후속 항목으로 추적되고 있음을 설명합니다. 코드나 OpenWiki에 맞추기 위해 미구현 PRD 요구를 삭제하지 않습니다.

> 모든 결정이 `NONE`이어도 영향 판정을 완료합니다. `NONE`은 사람이 관리하는 상위 문서를 검토했지만 변경할 필요가 없다는 뜻입니다. 생성형 OpenWiki 동기화는 별도로 판정합니다.

- **Schema**: 2
- **Assessment**: Complete
  - 값: Pending | Complete
- **Product requirements**: NONE
  - 값: NONE | UPDATE | ADD
- **System architecture**: NONE
  - 값: NONE | UPDATE | ADD
- **Onboarding entrypoint**: NONE
  - 값: NONE | UPDATE | ADD
- **Operational/runtime contract**: NONE
  - 값: NONE | UPDATE | ADD
- **Reason**: 운영자 전용 복구 CLI의 결과 필드만 늘리고 지급 규칙·원장 스키마·런타임 계약은 바꾸지 않는다. 복구 절차와 dry-run 원칙은 이미 PRD-NFR-017과 system-architecture.md에 기술돼 있고, 이번 변경은 검토 화면에 잔액을 더할 뿐이다. 상위 curated 문서의 UPDATE·ADD가 필요하지 않다.
- **Targets**: -
  - UPDATE 또는 ADD가 하나라도 있으면 쉼표로 구분한 `docs:<path>`와 `project:<path>` 대상을 기록합니다.
  - `docs:<path>`는 설정된 docs 디렉터리 기준이고 `project:<path>`는 프로젝트 저장소 루트 기준입니다. 루트 이름을 반복하지 마세요(예: `docs:docs/agents/constitution.md`가 아니라 `docs:agents/constitution.md`).
  - 모든 대상은 task `Docs` 목록에 연결하고 Feature 리뷰 전에 활성 Feature scope로 커밋합니다.

---

## Additional Curated Impacts

> constitution/custom, 디자인 시스템, API·데이터, 보안, 배포, 관측성처럼 조건부로 존재하는 상위 문서를 판정합니다. 해당 영향이 없으면 `Decision: NONE`을 명시하고 표는 비워 둡니다.

- **Assessment**: Complete
- **Decision**: NONE
  - 값: NONE | DECLARED

| Kind | Decision | Target | Reason |
| ---- | -------- | ------ | ------ |
| -    | -        | -      | -      |

생성형 OpenWiki 동기화는 별도로 판정한다. 가입 복구 절차와 결과 필드를 다루는 `openwiki/operations/recovery-runbook.md`(필요하면 `openwiki/concepts/ticket-ledger.md`)가 이 변경으로 stale해지므로 통합 검증 뒤 `knowledge publish` gate에서 갱신하고, 다시 쓰인 페이지 범위를 `decisions.md`에 기록한다. 생성 Wiki와 receipt는 Feature 커밋·리뷰에 넣지 않는다.

허용 Kind: `engineering-agent-policy`, `design-system-ux`, `api-data-contract`, `security-privacy`, `release-deployment`, `observability`, `other-curated`

`DECLARED` 행의 Decision은 `UPDATE` 또는 `ADD`이고, Target은 `docs:<path>` 또는 `project:<path>`여야 합니다. 모든 Target은 task `Docs` 목록에 연결합니다.
`docs:<path>`는 설정된 docs 디렉터리에서, `project:<path>`는 프로젝트 저장소 루트에서 해석합니다.

---

## Verification Contract

Feature 완료 전 검사는 실제 `workflow.featureChecks`(컴포넌트 override 포함)를 기준으로 작성합니다. 추가 자동 검사는 실행 설정에도 등록하세요. build 포함 여부와 중복 생략 근거, 수동 검증 증거를 명시하세요.


### 변경 분류

- **유형**: NEW_BEHAVIOR
- **위험도**: LOW

### 관찰 가능한 계약

- **지원해야 하는 동작**: 복구 CLI의 세 결과(`WOULD_GRANT`·`NOOP`·`GRANTED`)가 지갑 잔액(지급 전·후)을 함께 반환한다.
- **전제조건**: 운영자 전용 실행 경로, 인자 계약, 사용자 잠금, 멱등 키가 그대로다.
- **성공 후 보장**: dry-run은 DB를 바꾸지 않고도 지급 후 예상 잔액을 보여주며, 실제 지급의 `balanceAfter`는 원장에 기록된 값과 일치한다.
- **중요한 실패 후 보장**: 지급이 거부되면(충돌·미존재 사용자) 아무 값도 바뀌지 않고 오류만 반환한다. 부분 지급이 남지 않는다.
- **의도적으로 지원하지 않는 사례**: 지갑·원장 스키마 변경, 지급 금액 규칙 변경, 조회 모드(인자 없는 목록) 추가, 사용자용 API 노출.

### 테스트 결정

| 계약 / 요구사항 | 결정                  | 테스트 수준                     | 보호할 현실적인 회귀 | 독립적인 Oracle            |
| --------------- | --------------------- | ------------------------------- | -------------------- | -------------------------- |
| AC-01·AC-02 잔액 필드 | UPDATE | 통합 | dry-run이 잔액을 빠뜨리거나 변경 후 값이 원장과 어긋나는 회귀 | 지갑·원장 테이블에서 직접 읽은 값과 대조 |
| AC-03 계약 불변 | NONE | 통합 | 기존 필드·충돌 거부·멱등 동작이 바뀌는 회귀 | 기존 `tests/signup-recovery.integration.ts` 단언 |
| AC-04 정적 검사 | NONE | 비테스트 | 타입·lint 회귀 | `pnpm exec tsc --noEmit`, `pnpm run lint` |

### 의도적으로 제외하는 테스트

- 새 테스트 파일: 기존 통합 테스트가 같은 계약을 이미 다루므로 단언만 추가한다.
- JSON 문자열 스냅샷: 직렬화는 `scripts/recover-signup-grant.ts`의 기존 동작이라 새로 고정하지 않는다.
- 실제 DB에 `--apply`를 반복 실행하는 수동 검증: 원장을 변경하므로 격리 테스트 밖에서는 하지 않는다.

### 검증 실행

- **구현 중**: `pnpm exec tsc --noEmit`, `pnpm run lint`, `node --conditions react-server --import tsx --test tests/signup-recovery.integration.ts`
- **태스크 완료 전**: 위 통합 테스트와 `pnpm test`
- **Feature 완료 전**: `.lee-spec-kit.json`의 `workflow.featureChecks`(`pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`)를 실행하고, 통합 검증 뒤 `knowledge publish`로 갱신 범위를 확인한다.
- **수동/UI 검증**: 로컬 DB에서 테스트 사용자로 dry-run만 실행해 JSON에 잔액이 실리는지 눈으로 확인한다. `--apply`는 격리 테스트에서만 실행한다.
- **전체 테스트 필요 여부**: Yes — 티켓 도메인은 지급·환불·가입 지급이 같은 원장을 공유하므로 전체 검사를 통과해야 한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
