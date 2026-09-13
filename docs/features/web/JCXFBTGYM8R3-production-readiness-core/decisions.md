# Decisions Log

## D001: 감사의 핵심 5개를 하나의 Feature로 묶음 (2026-09-13)

- **Context**: 사용자가 Production Readiness Audit의 마지막 5개 개선을 하나의 Feature로 진행하도록 요청했다.
- **Constraints**: 토이 프로젝트 규모, PostgreSQL·Next.js·Modal 유지, 현재 spec 승인 필요, 원격 배포 전 결과 준비.
- **Options**: 5개 독립 Feature 또는 하나의 cross-component Feature.
- **Decision**: JCXFBTGYM8R3 하나로 관리하며 web 주 책임 아래 data·modal-api 변경을 포함한다. 구현 plan/tasks는 spec 승인 후 작성한다.
- **Rationale**: lease·외부 timeout·파일 정리는 동일한 실패 구간을 공유하고, 접수 제한·가입 지급도 티켓 transaction과 연결된다. 별도 구현 시 중간 상태의 계약 충돌이 생기기 쉽다.
- **Trace**: main b333d64의 읽기 전용 감사에서 현재 timeout/lease/파일/세션 경로를 확인했다. 이전 턴의 기존 비외부 테스트 26개 통과는 이번 Feature 구현 검증으로 계산하지 않는다. 이번 요청을 구체 spec 승인 또는 merge 승인으로 간주하지 않는다.
- **Evidence**:
  - **Commit**: b333d64 (감사 기준)
  - **Code**: `src/_app/background-jobs/mixing/worker.ts`, `src/shared/media/media-service.ts`, `src/features/authentication/api/session.ts`
  - **Workflow**: `npx lee-spec-kit workflow-stage JCXFBTGYM8R3 --json` → spec_write, implementationAllowed=false.
- **Consequences**: 승인 전에는 spec과 PRD를 구체화한다. 전체 감사의 나머지 이슈는 이번 완료 판정에 포함하지 않는다.


## D002: 서브에이전트 스펙 리뷰의 정책 공백 3개 보완 (2026-09-13)

- **Context**: 사용자가 요청한 읽기 전용 spec 리뷰에서 changes_requested 판정과 P1 2개, P2 1개가 반환됐고 사용자가 맞게 수정하도록 요청했다.
- **Constraints**: spec 승인 전 문서 수정만 수행하며, 분석·믹싱의 서로 다른 기존 환불 계약을 보존한다. Leemage의 확인되지 않은 기능을 전제로 삼지 않는다.
- **Options**: 불명 작업 무한 대기 또는 제한된 자동 복구 후 운영자 확인; 외부 파일 전 구간 자동 삭제 보장 또는 확인된 provider 계약 범위 보장; 과거 미지급분 현재 환경값 적용 또는 운영자 명시 금액.
- **Decision**: FR-1 상태/환불 표와 AC-16, FR-4 provider 확인·보장 한계와 AC-17, FR-5 운영자 CLI/지급 의도 정책과 AC-18을 추가하고 PRD-NFR-013/016/017을 동기화했다.
- **Rationale**: 사용자 슬롯은 제한 시간 내 반환하고 불명 외부 비용은 추적한다. 식별 불가능한 외부 예약의 제거를 과장하지 않는다. 과거 정책을 추측하지 않으면서 신규 가입 금액은 재시도 중 변하지 않게 한다.
- **Trace**: reviewer /root/spec_review의 읽기 전용 결과 3개를 반영했다. 이는 사용자 요청 spec 리뷰이며 workflow Plan 리뷰가 아니다. 수정 후 재리뷰 승인이나 사용자 spec 승인으로 기록하지 않는다.
- **Evidence**:
  - **Review**: 현재 작업의 /root/spec_review terminal 응답 — changes_requested; 외부 접수 불명 종료(P1), presign 응답 유실(P1), 과거 가입 누락 금액(P2).
  - **Documents**: spec.md의 FR-1/FR-4/FR-5 및 AC-16~18, docs/prd/copy-singer-prd.md의 PRD-NFR-013/016/017.
- **Consequences**: provider 계약 확인은 plan 확정의 선행 조건이다. 확인 불가 구간은 명시된 운영자 추적 기준으로 완료 여부를 판단하며 모든 외부 파일의 자동 제거를 완료 조건으로 주장하지 않는다.

## D003: 수정 스펙 승인 (2026-09-13)

- **Context**: 정상 동작 보존 및 과부하·장애 시 변경 사항을 설명한 뒤 사용자가 “진행 ㄱㄱ”로 진행을 승인했다.
- **Decision**: 수정 spec을 Approved로 전환하고 plan/tasks를 작성한다.
- **Rationale**: 구체 스펙과 변경 동작에 대한 사용자 승인이다. 구현 결과 승인과 local merge 승인은 별도 경계로 유지한다.
- **Trace/Evidence**: 현재 대화의 사용자 승인 메시지 및 workflow-stage spec_approve.
