# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D015: client-server-state-query 결정 (2026-08-09)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: Query provider와 typed API 오류 경계 (2026-08-09)

- **Context**: Client Component마다 fetch, 오류 parsing, retry와 timer를 직접 관리해 동일 API도 처리 기준이 달라진다.
- **Constraints**: Next.js 16.3 Server/Client Component 경계를 유지하고 authenticated cache를 server request 또는 browser storage 사이에 공유하지 않아야 한다. 기존 Node test runner를 유지해야 한다.
- **Options**: component마다 QueryClient 생성, module browser singleton과 server request별 instance, root에서 dehydration을 항상 사용하는 구성을 검토한다.
- **Decision**: server에서는 render별 QueryClient, browser에서는 단일 안정 instance를 사용하는 provider와 `ApiError`/Zod schema 기반 `requestJson`을 공통 기반으로 사용한다. 기본 query retry는 retryable network/429/5xx에만 최대 2회 허용한다.
- **Rationale**: 동일 browser render에서 cache를 공유하면서 SSR request 간 private data 누출을 막고, 현재 initial props에는 전역 dehydration 비용을 추가하지 않기 위해서다.
- **Trace**:
  - **DOING 시작 시점**: TanStack 공식 SSR guidance와 로컬 Next.js provider 문서를 기준으로 provider는 필요한 범위에 두고, 공통 오류는 UI에 raw response를 노출하지 않는 최소 metadata만 유지한다.
  - **DONE 전 확정 시점**: `requestJson`이 valid payload만 반환하고 4xx·contract error를 재시도하지 않으며 retryable 5xx/network만 재시도 대상으로 분류함을 5개 Node test로 확인했다. MSW postinstall은 browser worker가 필요 없는 F015 범위에서 실행하지 않도록 pnpm `allowBuilds`에 명시했다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: docs `bb05b2d`, project `477e6f9`
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: `pnpm run test:query` PASS (5), `pnpm run typecheck` PASS, `pnpm run check:architecture` PASS, `pnpm run lint` PASS (2026-08-09)
- **Consequences**: query cache는 브라우저 메모리에만 유지되고, endpoint schema 불일치는 재시도하지 않는 contract error가 된다.

---

## D002: Zod 계약 소유권과 streaming 검증 경계 (2026-08-09)

- **Context**: response type이 화면 또는 server serializer 근처에 수기로 흩어져 있고 JSON body/route param 검증도 endpoint마다 type guard와 정규식으로 반복된다.
- **Constraints**: 현재 wire field/status/error envelope를 바꾸지 않아야 하며, Modal conversion proxy는 WAV 두 개를 메모리에 buffering하지 않고 `request.body`를 그대로 전달해야 한다.
- **Options**: 모든 schema를 Shared에 집중, Route Handler별 schema 배치, resource response는 Entity/action request는 Feature에 배치하는 방식을 검토한다.
- **Decision**: resource response schema는 browser-safe Entity model, action request/response schema는 Feature model에 두고 `z.infer`로 type을 파생한다. Route Handler는 parse 가능한 JSON/param/query/FormData metadata만 `safeParse`하고 conversion stream body는 parse하지 않는다.
- **Rationale**: FSD domain 소유권을 유지하면서 client와 server가 같은 계약을 재사용하고, runtime validation이 업로드 메모리 특성을 악화시키지 않게 하기 위해서다.
- **Trace**:
  - **DOING 시작 시점**: 기존 serializer와 UI type을 valid fixture 기준으로 삼고 schema가 legacy payload를 좁히지 않는지 contract test로 확인한다. stream route는 source-level 회귀와 long upload test로 보호한다.
  - **DONE 전 확정 시점**: Entity/Feature schema와 `safeParse` Route Handler 경계를 적용하고 legacy 대표 payload, invalid request, 25MB 제한, UUID/page와 stream source 회귀를 검증했다. Modal upload는 Zod 적용 후에도 body를 parse하지 않는다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: docs `5ad4ee7`, project `db7ade9`
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: `pnpm run test:query` PASS (10), 관련 기존 test PASS (12), `pnpm run typecheck`/`lint`/`check:biome`/`check:architecture` PASS, `pnpm run build` PASS (2026-08-09)
- **Consequences**: client가 소비하는 success JSON은 runtime contract를 가지지만 binary/audio response와 server-to-server stream은 기존 전용 경계를 유지한다.

---

## D003: Vocal analysis durable job을 Query cache로 표현 (2026-08-09)

- **Context**: workbench와 job cards가 각각 job response를 local state에 복제하고 while/setInterval polling을 직접 관리한다. 분석 job ID는 새로고침 후에도 이어져야 한다.
- **Constraints**: localStorage에는 job ID만 유지하고 authenticated response payload는 저장하지 않는다. 기존 1.5초/3초 polling, idempotency key, terminal toast와 완료 후 profile UI를 보존해야 한다.
- **Options**: job payload를 component state와 Query cache에 이중 저장, localStorage payload persistence, job ID만 local state에 두고 response는 Query cache에서 파생하는 방식을 검토한다.
- **Decision**: job ID와 로컬 audio UI만 component/localStorage에 두고 health/job/list response는 Query cache의 단일 server-state로 사용한다. retryable network 오류에서는 durable detail polling을 계속하고 succeeded/failed에서는 interval을 중단한다.
- **Rationale**: 새로고침 복구를 유지하면서 stale response 이중화를 제거하고, terminal 상태에서 timer가 남지 않게 하기 위해서다.
- **Trace**:
  - **DOING 시작 시점**: submit 성공 payload를 detail cache에 seed하고, terminal side effect는 job ID/status 조합당 한 번만 실행한다. list에서 active job이 사라지면 기존처럼 server-rendered profile 목록을 reload한다.
  - **DONE 전 확정 시점**: workbench와 job cards의 response state/수동 timer를 Query cache와 함수형 interval로 교체했다. retryable detail 오류는 1.5초 polling을 유지하고 terminal 상태에서는 `false`를 반환하며, SSR QueryClient는 GC timer를 만들지 않도록 server `gcTime: Infinity`로 보정했다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: docs `b79309e`, project `d95a650`
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: `pnpm run test:query` PASS (12), `pnpm run test:vocal-profile-history` PASS (6), recorder/profile/effect test PASS (8), `pnpm run lint`/`typecheck`/`check:biome`/`check:architecture` PASS, `pnpm run build` PASS (2026-08-09)
- **Consequences**: 완료된 profile은 terminal detail query cache에서 표시하며 cache 자체는 storage에 persist하지 않는다.

---

## D004: Recommendation item 단위 cache patch와 서버 재동기화 (2026-08-09)

- **Context**: recommendation 화면은 run 전체를 local state로 복제해 합성 item 한 개의 준비/실패 상태를 수정하고, mixing history는 page payload를 별도 state와 timer로 갱신한다.
- **Constraints**: 100개 item 중 요청한 항목만 즉시 반응해야 하며 idempotency, 5초 polling, 실패 상세, 삭제 navigation과 server truth를 보존해야 한다.
- **Options**: run 전체 optimistic replacement, mutation 완료까지 UI를 그대로 유지, item synthesis만 cache patch하고 완료 후 detail/history invalidate하는 방식을 검토한다.
- **Decision**: query key는 recommendation detail과 mixing history page를 분리한다. mixing mutation은 대상 item synthesis만 `preparing` 또는 `failed`로 patch하고 성공 시 recommendation detail과 모든 mixing history key를 invalidate한다.
- **Rationale**: 즉시 사용자 피드백을 유지하면서 임시 client 상태의 범위를 최소화하고, 최종 상태는 기존 serializer가 제공하는 server response로 수렴시키기 위해서다.
- **Trace**:
  - **DOING 시작 시점**: active synthesis/history가 있는 동안만 5초 interval을 반환하고 initialData는 30초 stale 정책으로 mount 직후 중복 fetch를 막는다.
  - **DONE 전 확정 시점**: detail/history initialData와 함수형 5초 polling을 적용하고 대상 item만 cache patch한 뒤 detail/history를 invalidate하도록 구현했다. `react-server` 조건 test에서 browser Query client 재수출을 발견해 Recommendation `index.model.ts` 및 Mixing server public API를 분리했다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: docs `0ff2808`, project `50d1191`
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: `pnpm run test:query` PASS (13), `pnpm run test:recommendation` PASS (18), `pnpm run test:mixing:ui` PASS, effect inventory PASS (2), `pnpm run lint`/`typecheck`/`check:architecture` PASS, `pnpm run build` PASS (2026-08-09)
- **Consequences**: mutation 중 임시 상태는 Query cache에만 존재하고 성공 직후 server detail로 교체된다.

---

## D005: Conversion stream과 관찰 가능한 server state의 경계 (2026-08-09)

- **Context**: 개발용 변환 화면은 추천 handoff, health, 변환 job과 티켓 조정을 component fetch/state/timer로 관리하지만 conversion Route Handler는 대용량 multipart body를 upstream으로 stream해야 한다.
- **Constraints**: 변환 WAV 본문을 `formData()`나 JSON helper로 읽어 buffering하지 않고 기존 2.5초 polling, terminal toast, URL handoff 및 ticket UX를 유지해야 한다. MSW는 Node test에서만 사용해야 한다.
- **Options**: 업로드 body까지 공통 JSON client로 통합, server state만 query/mutation으로 이동하고 FormData 전송은 typed endpoint client에서 유지, 기존 component fetch를 유지하는 방식을 검토한다.
- **Decision**: 파일·설정·job ID는 component local state에 남기고 health, recommendation handoff와 conversion job은 Query cache에서 파생한다. FormData는 typed mutation client가 그대로 fetch body로 전달하고 성공 JSON만 Zod로 검증한다. ticket adjustment도 typed mutation으로 전환하며 MSW는 Node server와 test fixture에서만 시작한다.
- **Rationale**: 원격 응답의 이중 state와 component timer를 제거하면서 browser multipart boundary와 Route Handler의 `request.body` stream 전달을 보존하고, production bundle에 mock runtime을 넣지 않기 위해서다.
- **Trace**:
  - **DOING 시작 시점**: browser가 만든 FormData는 그대로 fetch body로 전달하고 response JSON만 Zod parse한다. job ID와 파일/입력값은 local UI state로 남기며 health/handoff/job response는 Query cache에서 파생한다.
  - **DONE 전 확정 시점**: Next.js 비동기 `searchParams`에서 handoff ID를 전달하고 Query가 recommendation을 검증하도록 전환했다. conversion은 queued/processing에서만 2.5초 polling하며 terminal toast를 job/status당 한 번 표시한다. 64MB lazy stream의 동일 body reference가 upstream fetch로 전달되는 회귀 test와 MSW success/4xx/5xx/contract/sequence/cache test를 통과했다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: task commit 후 갱신 예정
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: `pnpm run test:query` PASS (20), `pnpm run test:tickets` PASS (2), `pnpm run test:admin` PASS (2), effect inventory PASS (1), `pnpm run check:biome`/`lint`/`typecheck`/`check:architecture` PASS, `pnpm run build` PASS (2026-08-09)
- **Consequences**: 변환 본문은 client와 proxy에서 JSON 변환 없이 stream 경계를 유지하며 mock handler는 test teardown 때 reset된다.
