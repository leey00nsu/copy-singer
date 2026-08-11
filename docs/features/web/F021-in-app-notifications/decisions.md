# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D021: in-app-notifications 결정 (2026-08-11)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 영속 event notification과 polling 전달 (2026-08-11)

- **Context**: 보컬 분석과 믹싱은 background worker에서 끝나며 사용자는 해당 화면을 떠난 뒤 결과를 놓칠 수 있다.
- **Constraints**: worker는 retry·lease recovery로 같은 terminal 경계를 다시 실행할 수 있고 현재 별도 realtime infra가 없다. 티켓 원장은 이미 idempotent하며 가입 지급·믹싱 환불은 작업 알림과 중복될 수 있다.
- **Options**: client가 job 상태 차이를 감지해 ephemeral toast 생성, DB 알림 + WebSocket/SSE, DB 알림 + polling.
- **Decision**: terminal persistence 경계에서 dedupe key를 가진 DB 알림을 생성하고 header는 30초 polling과 focus refetch로 전달한다. 가입 지급·믹싱 환불은 별도 credit 알림에서 제외한다.
- **Rationale**: 브라우저 종료와 재접속에도 이력을 보존하고 기존 worker·TanStack Query 구조 안에서 중복 없이 구현하면서 realtime 운영 복잡도를 피한다.
- **Trace**:
  - **DOING 시작 시점**: `TicketLedger`는 idempotency key를 갖고 analysis/mixing worker는 terminal update를 명시적으로 수행하므로 이 경계에서 알림을 기록할 수 있음을 확인했다. 공통 `ProductHeader`는 client component이고 TanStack Query provider가 이미 전역에 있어 polling consumer를 추가할 수 있다.
  - **DONE 전 확정 시점**: `Notification`에 user/type/text/internal href/source/dedupe/readAt/createdAt을 저장하고 global namespaced dedupe key unique를 적용했다. Prisma concurrent upsert가 unique 경합에서 P2002를 반환함을 통합 테스트에서 확인해 `createMany(skipDuplicates)` 후 기존 row의 전체 identity를 검증하는 방식으로 확정했다. 목록·unread count·개별/전체 읽음은 항상 userId로 scope한다.
  - **DONE 전 확정 시점(T02)**: 관리자 ticket feature는 양수 adjustment 원장 ID로만 credit 알림을 생성해 가입 지급·환불·차감을 제외한다. analysis와 mixing worker는 retry branch에는 알림을 만들지 않고 terminal DB update와 notification create를 같은 transaction에 묶었다. 성공 알림은 profile/mix 상세, 분석 실패는 profile library, 믹싱 실패는 job 상세의 내부 경로를 snapshot한다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 커밋 해시 또는 링크
  - **PR**: PR 링크
  - **Test/Log**: `pnpm exec prisma migrate deploy`, `pnpm run db:validate`, `pnpm run typecheck`, `node --conditions react-server --import tsx --test tests/notification-service.integration.ts`
- **Consequences**: 새 알림 반영에는 최대 약 30초 지연이 있을 수 있다. 이후 WebSocket/SSE를 추가해도 DB notification과 API 계약은 유지할 수 있다.

## D002: 알림 읽음과 source snapshot (2026-08-11)

- **Context**: 프로필·믹스가 삭제되거나 이름이 바뀐 뒤에도 과거 알림 문장은 이해 가능해야 하며 메뉴 open과 실제 확인을 구분해야 한다.
- **Constraints**: source deletion lifecycle과 알림 retention은 다르고, 알림 item은 내부 route만 허용해야 한다.
- **Options**: source join으로 매번 문장 생성, title/message snapshot 저장; 메뉴 open 시 모두 읽음, 개별 click/명시적 모두 읽음.
- **Decision**: 생성 시 사용자용 title/message와 allowlisted 내부 href를 snapshot하고, 메뉴 open은 읽음으로 간주하지 않으며 개별 click 또는 `모두 읽음`만 `readAt`을 기록한다.
- **Rationale**: source lifecycle과 분리된 안정적 이력을 제공하고 사용자가 실제로 확인한 상태를 badge에 반영한다.
- **Trace**:
  - **DOING 시작 시점**: 현재 profile과 mixing 삭제 route가 존재하므로 source relation에 표시 문장을 의존하면 과거 알림이 사라지거나 깨질 수 있음을 확인했다.
  - **DONE 전 확정 시점**: Bell dropdown과 `/notifications` 모두 동일한 snapshot item을 렌더링하며 메뉴를 여는 것만으로는 읽음 처리하지 않는다. 개별 item은 owner-scoped read mutation 완료를 시도한 뒤 snapshot된 allowlisted 내부 href로 이동하고, 명시적인 `모두 읽음`만 전체 unread를 갱신한다. header는 인증 사용자에게만 렌더링하며 desktop 계정 메뉴와 mobile 제품 메뉴 바로 왼쪽에 같은 Bell을 공유한다.
  - **머지 후 확인**: 통합 후 보강 예정.
- **Evidence**:
  - **Commit**: `e4090a2` (API/client state), Header Bell·알림 센터 구현 커밋
  - **PR**: local workflow
  - **Test/Log**: `pnpm run test:storybook --run src/_pages/notifications/ui/notifications-list.stories.tsx src/widgets/product-shell/ui/product-shell.stories.tsx`, `pnpm run build`, Browser QA
- **Consequences**: 이름 변경 후에도 과거 알림에는 이벤트 당시 이름이 남고, 삭제된 target은 기존 not-found/list fallback 동작을 따른다.
