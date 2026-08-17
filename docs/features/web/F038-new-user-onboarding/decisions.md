# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D038: new-user-onboarding 결정 (2026-08-17)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: new-user-onboarding 결정 (2026-08-17)

- **Context**: 최초 인증 진입에서만 온보딩을 보여 주고 확인한 사용자는 기기·세션과 무관하게 다시 보지 않아야 한다. 기존 인증 session helper는 로그인 요청마다 가입 티켓 지급을 먼저 보장한다.
- **Constraints**: 기존 사용자는 배포 후 새 모달을 보지 않아야 하고, 신규 계정은 Better Auth가 직접 생성한다. 완료 mutation은 다른 사용자 식별자를 신뢰할 수 없으며 React client prop은 serializable해야 한다.
- **Options**: `localStorage`/cookie, 별도 onboarding event table, `User` nullable timestamp를 검토한다. 초기 payload는 client GET waterfall과 ProductLayout server snapshot을 비교한다.
- **Decision**: `User.onboardingCompletedAt` nullable timestamp를 계정 단위 SSOT로 사용한다. 기존 row는 migration 실행 시 backfill하고 신규 row는 `null`로 둔다. 미완료 snapshot은 기존 ticket service의 두 wallet을 반환하며 완료는 session 사용자만 POST Route Handler에서 조건부 update한다.
- **Rationale**: 별도 event table 없이 재로그인·다른 기기를 지원하고 완료 시각도 보존한다. column default 없이 기존 row만 명시적으로 backfill해야 migration 이후 신규 계정을 정확히 구분할 수 있다. 조건부 update와 최종 row 조회 조합은 동시 요청도 같은 저장 결과로 수렴시킨다.
- **Trace**:
  - **DOING 시작 시점**: Next.js 16.3.0 내장 문서에서 layout/page는 기본 Server Component이고 interactive leaf만 Client Component로 두며 전달 props가 serializable해야 함을 확인했다. Route Handler의 POST는 기본 비캐시이며 Web Request/Response API를 사용한다.
  - **DONE 전 확정 시점**: 실제 PostgreSQL migration을 적용하고 신규 사용자 두 명으로 미완료 snapshot, 현재 분석 5장·믹싱 1장, 동시 완료, 다른 사용자 미변경과 완료 후 `required: false`를 검증했다.
  - **머지 후 확인**: 대기 중
- **Evidence**:
  - **Test/Log**: `pnpm run test:onboarding` PASS (3 tests), `pnpm exec tsc --noEmit` PASS, `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- **Consequences**: 서버 전용 DB 모듈은 `server-only`로 보호하고 client에는 plain object/number/string/null만 전달한다. 향후 온보딩 버전별 재노출이 필요하면 별도 version 정책을 새 Feature로 추가해야 한다.

## D002: 온보딩 UI는 server snapshot을 받는 단일 client dialog로 구성한다 (2026-08-17)

- **Context**: 제품 shell은 이미 client component이며 인증 ProductLayout이 session을 서버에서 판정한다.
- **Constraints**: 완료 여부와 티켓 잔액을 client 상수로 추정할 수 없고, 개발 인증 bypass는 실제 신규 계정 흐름을 막지 않아야 한다. 저장 실패를 완료로 낙관 처리하면 다시 노출하지 않는 계약을 위반한다.
- **Options**: client mount 후 GET, ProductLayout server snapshot, 각 제품 page별 조회를 비교했다. dismissible dialog와 완료 action 전용 dialog도 비교했다.
- **Decision**: ProductLayout이 가입 지급 이후 snapshot을 조회해 ProductShell에 plain prop으로 전달하고, `NewUserOnboardingDialog`에서만 mutation과 open state를 관리한다. 완료 action 성공만 dialog를 닫으며 close button·ESC·backdrop dismissal은 제공하지 않는다. 조회 실패는 제품 화면을 유지하면서 이번 응답의 모달만 생략한다.
- **Rationale**: 완료 사용자 flash와 client GET waterfall을 피하면서 interactive JavaScript 경계를 dialog로 제한할 수 있다.
- **Trace**:
  - **At DOING start**: ProductLayout server snapshot과 단일 client dialog로 server/client 경계를 최소화하는 가설을 세웠다.
  - **Before DONE**: Chromium Storybook에서 desktop/mobile, 저장 중 disabled, 성공 후 닫힘, 실패 후 dialog·재시도 유지, 완료 사용자와 개발 bypass 미노출을 검증했다. 최초 별도 feature slice는 ProductShell 한 곳에서만 소비돼 Steiger가 insignificant slice로 판정했으므로 widget 내부로 통합하고 app에는 client/server public API만 노출했다.
  - **Post-merge check**: 대기 중
- **Evidence**:
  - **Test/Log**: `pnpm run test:storybook --run src/widgets/product-shell/ui/new-user-onboarding-dialog.stories.tsx src/widgets/product-shell/ui/product-shell.stories.tsx` PASS (12 tests), `pnpm run check:architecture` PASS
- **Consequences**: onboarding snapshot 조회 장애는 인증 제품 자체를 중단하지 않지만 사용자는 다음 정상 요청까지 모달을 보지 않을 수 있다. 미완료 dialog는 명시적 완료 저장을 요구하므로 각 단계는 한 화면에 들어오는 짧은 카피를 유지해야 한다.

## D003: 최종 검증은 계약·통합·Storybook·실제 렌더링을 함께 사용한다 (2026-08-17)

- **Context**: 온보딩은 DB 영속성, 인증 shell 결합, 모달 상호작용과 작은 viewport 레이아웃을 모두 바꾼다.
- **Constraints**: 기존 저장소 전체 Biome에는 F038과 무관한 오류가 남아 있어 전체 `pnpm run check` 결과만으로 이번 변경의 품질을 판정할 수 없다. UI는 360px에서 카피·티켓·완료 action이 실제 viewport에 들어와야 한다.
- **Options**: targeted 검사만 실행, 전체 검사만 실행, 계층별 targeted+전체 회귀+실제 렌더링을 조합하는 방식을 비교했다.
- **Decision**: DB/API targeted tests, 인증·티켓·전체 Storybook 회귀, F038 변경 파일 Biome, 전체 ESLint·TypeScript·Steiger architecture와 production build를 통과 기준으로 사용한다. 전체 `pnpm run check`의 기존 무관 Biome 실패는 숨기지 않고 기준선으로 기록한다. 실제 Storybook은 1280×800과 360×800에서 캡처하고 완료 상호작용까지 확인한다.
- **Rationale**: 단일 테스트 계층으로는 server-owned 상태와 브라우저 시각 회귀를 동시에 증명할 수 없다.
- **Trace**:
  - **At DOING start**: targeted tests 뒤 전체 정적 검사·build와 desktop/mobile 실제 렌더링을 함께 확인하기로 했다.
  - **Before DONE**: 인증 DB 3건, 티켓 4건, 전체 Storybook 175건, onboarding DB/API 3건, API 계약 10건, ESLint·TypeScript·architecture·build가 통과했다. 360×800에서 document/dialog 가로 overflow 0, action viewport 노출, ESC 유지와 완료 후 닫힘을 확인했다.
  - **Post-merge check**: 대기 중
- **Evidence**:
  - **Test/Log**: `/tmp/lee-spec-kit/pr-assets/F038-onboarding-desktop.png`, `/tmp/lee-spec-kit/pr-assets/F038-onboarding-mobile-360.png`, `pnpm run build` PASS, `pnpm run check:architecture` PASS
- **Consequences**: 전체 `pnpm run check`는 기존 무관 Biome 오류 6건으로 계속 실패하지만 F038 변경 파일은 Biome을 통과한다. 해당 기준선 정리는 이 Feature에서 무관 파일을 수정하지 않고 별도 품질 작업으로 남긴다.

## D004: 온보딩은 브랜드 마크와 공용 퍼널 stepper를 사용한다 (2026-08-17)

- **Context**: 사용자는 범용 장식 아이콘을 브랜드 마크로 바꾸고 기존 3단계 생성 퍼널 UI를 재사용해 온보딩을 3단계로 나누도록 요청했다.
- **Constraints**: ProductShell과 CreationFunnel은 서로 다른 widget이므로 직접 import할 수 없다. 단계 이동은 완료 API와 분리되어야 하고, 브랜드 마크는 기존 asset을 재사용하며 신규 이미지나 임의의 상태색을 만들지 않아야 한다.
- **Options**: 생성 퍼널 stepper 직접 cross-widget import, 시각 복제, generic shared stepper 추출을 비교했다. 단계별 다색 icon과 오디오·데이터 `data-accent` 단일 계열도 비교했다.
- **Decision**: 기존 stepper의 상태 계산·연결선·lifecycle marker·`aria-current` 구현을 generic `shared/ui/funnel-stepper`로 추출하고 `CreationFunnelStepper`는 기존 API를 유지하는 adapter로 둔다. 온보딩 header는 `ProductMark`를 사용하고, 단계 icon과 티켓 surface는 `data-accent` 단일 계열, 완료 step은 기존 foreground, 예정 step은 muted 규칙을 사용한다. 분석→추천→믹싱은 local state로 이동하고 마지막 `시작하기`만 완료 mutation을 호출한다.
- **Rationale**: 기존 상태·연결선·접근성 표현을 그대로 유지하면서 widget 간 직접 의존을 피하고 브랜드·도메인 의미를 명확히 한다.
- **Trace**:
  - **At DOING start**: 기존 stepper를 shared generic component로 추출하고 단계 icon은 data-accent 단일 계열로 제한하는 방향을 세웠다.
  - **Before DONE**: 기존 creation funnel 4개 story와 온보딩·ProductShell story를 합친 Chromium 17개가 통과했다. 실제 1280×800에서 분석·추천 단계를, 360×800에서 믹싱 단계를 확인해 브랜드 마크, 완료/현재/예정 색 위계, 가로 overflow 0과 모든 action 노출을 검증했다.
  - **Post-merge check**: 대기 중
- **Evidence**:
  - **Test/Log**: `pnpm run test:storybook --run src/widgets/product-shell/ui/new-user-onboarding-dialog.stories.tsx src/widgets/product-shell/ui/product-shell.stories.tsx src/widgets/creation-funnel/ui/creation-funnel.stories.tsx` PASS (17 tests), `/tmp/lee-spec-kit/pr-assets/F038-onboarding-3step-desktop.png`, `/tmp/lee-spec-kit/pr-assets/F038-onboarding-3step-recommendation.png`, `/tmp/lee-spec-kit/pr-assets/F038-onboarding-3step-mobile-360.png`
- **Consequences**: 앞으로 생성 퍼널의 시각 상태 변경은 shared stepper에서 두 사용처에 함께 반영된다. 제품별 단계 목록과 카피는 각 widget이 소유한다.

## D005: dialog 진입 직후의 시각 assertion은 표시 완료를 기다린다 (2026-08-17)

- **Context**: 전체 Storybook 회귀에서 Desktop story가 dialog 진입 애니메이션 중 브랜드 마크를 찾은 직후 `toBeVisible`을 실행해 간헐적으로 실패했다. 같은 실행에서 F038 외 story 세 건도 타이밍성 실패 후 개별 재실행에서는 통과했다.
- **Constraints**: 실제 제품 애니메이션과 브랜드 마크 렌더링은 변경하지 않고 interaction test가 사용자에게 표시되는 최종 상태를 검증해야 한다.
- **Options**: 애니메이션 제거, 고정 sleep 추가, Testing Library `waitFor`로 visibility 완료를 기다리는 방식을 비교했다.
- **Decision**: 브랜드 마크와 dialog 안내 element 선택은 유지하고 `waitFor` 안에서 `toBeVisible`을 평가한다. 전체 회귀 부하에서 비동기 canvas 준비를 기다리는 생성 퍼널 검사는 5초의 명시적 timeout을 사용한다.
- **Rationale**: 임의 시간 지연 없이 dialog가 실제 표시 상태에 도달했다는 조건만 기다리므로 실행 속도와 사용자 동작을 모두 보존한다.
- **Evidence**: 온보딩 Storybook Chromium 5 tests PASS, 같은 전체 실행에서 실패했던 F038 외 story Chromium 25 tests 개별 재실행 PASS.
- **Consequences**: dialog transition 속도에 따른 거짓 실패를 줄이며 브랜드 마크가 최종적으로 보이지 않는 실제 회귀는 계속 실패한다.
