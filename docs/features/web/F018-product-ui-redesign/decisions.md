# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D018: product-ui-redesign 결정 (2026-08-09)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D018: 시각 정본과 실행 가능한 Design System의 책임 분리 (2026-08-09)

- **Context**: 네 개의 디자인 보드는 목표 화면과 상태를 폭넓게 보여 주지만 현재 제품 계약에 없는 온보딩, 프로젝트, 플레이리스트, 가격제와 메타데이터도 포함한다. 기존 UI는 shadcn primitive와 CSS token을 사용하면서도 일부 전역 class와 경로 설정이 현재 FSD 구조와 어긋나 있다.
- **Constraints**: 기존 shadcn/ui, Tailwind, Lucide와 FSD public API를 유지하고 새 UI library를 추가하지 않는다. 실제 API·인증·미디어 계약에 없는 정보를 화면에 생성하지 않으며 Next.js 16 App Router 경계를 지킨다.
- **Options**:
  1. 디자인 보드의 모든 화면과 데이터를 mock으로 그대로 재현한다.
  2. 현재 페이지의 색과 간격만 국소적으로 바꾼다.
  3. 보드는 visual reference, `design-system.md`는 장기 규칙, token·Shared UI·Storybook은 실행 정본으로 분리하고 실제 제품 계약 안에서 플로우를 재구성한다.
- **Decision**: 옵션 3을 채택한다. 공통 token과 primitive를 먼저 정리하고 이후 화면은 같은 token·상태 언어·responsive 규칙을 재사용한다. 보드에만 존재하는 제품 개념은 F018 범위에서 구현하지 않는다.
- **Rationale**: 시각적 일관성을 코드로 검증하면서도 가짜 기능을 노출하지 않고, 후속 페이지 작업에서 중복 스타일과 상태 표현의 분기를 줄일 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 디자인 문서, 현재 route/API 계약, shadcn 구성과 Storybook 구성을 대조해 foundation을 첫 태스크로 고정했다. `components.json` alias와 CSS 진입점부터 교정한 뒤 primitive와 상태 component를 확장하는 순서를 가설로 삼았다.
  - **DONE 전 확정 시점**: shadcn 4.16 registry의 Base UI 구현을 FSD public API로 정리하고, warm neutral canvas·black primary·status/data token과 낮은 radius/elevation을 적용했다. `StatePanel`과 `PageSkeleton`을 추가했으며 전체 Storybook 47개 browser test와 production build에서 실제 상태를 검증했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-01 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run check`, `pnpm run test:storybook --run` (24 files, 47 tests), `pnpm run build-storybook`, `pnpm run test:base-ui`, `pnpm run test:process-scripts`
- **Consequences**: 후속 화면은 foundation 변경을 먼저 소비해야 하며, 디자인 보드와 실제 계약의 의도된 차이는 이 로그에 계속 기록한다.

## D019: 전역 legacy component class의 단계적 제거 순서 (2026-08-09)

- **Context**: `globals.css`에는 token과 base rule 외에도 F013 이전 화면 구성을 위해 만든 전역 component class가 남아 있다. 이를 foundation 변경에서 한 번에 삭제하면 현재 보컬 분석, 추천, dev SVC 화면을 깨뜨린다.
- **Constraints**: 기존 route 동작을 유지하면서 F018 태스크 순서에 맞춰 화면을 교체해야 한다. 전역 token과 접근성 base rule은 계속 `_app`이 소유하지만 화면 조합 class는 각 FSD slice가 소유해야 한다.
- **Options**:
  1. 첫 태스크에서 전역 class를 모두 삭제하고 모든 소비 화면을 동시에 수정한다.
  2. 전역 class를 영구적인 비공식 design system으로 유지한다.
  3. 사용처를 고정한 뒤 후속 화면 태스크에서 slice-local composition으로 옮기고 마지막 회귀 태스크에서 잔여 class를 제거한다.
- **Decision**: 옵션 3을 채택한다.
  - T-F018-02에서 `site-header`, `brand-mark`의 사용자 route 사용을 제거하고 navigation은 `ProductShell`로 대체한다.
  - T-F018-03에서 보컬 분석 화면의 `page-shell` content rail을 slice-local layout으로 옮기고 recording/waveform 상태는 해당 Page slice와 Shared audio UI로 이동한다.
  - T-F018-05에서 추천 화면의 `page-shell` content rail을 목록 전용 responsive layout으로 대체한다.
  - T-F018-09에서 `hero-copy`, `workbench-grid`, `audio-card*`, `result-card`, `settings-*`, `dropzone*`, `waveform*`, `*-orbit`, `result-column`, `convert-button` 등 dev SVC 전용 class를 slice-local style로 전환하거나 의도된 개발 도구 예외로 확정한다.
  - T-F018-10에서 `rg`로 사용처가 없는 전역 class를 삭제한다.
- **Rationale**: 화면별 완료 시점에 회귀를 검증할 수 있고, foundation 태스크가 기능 화면 전체를 무리하게 다시 쓰는 것을 피하면서 전역 CSS의 장기 소유권도 명확히 할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: `globals.css`의 component selector별로 `app`·`src` 사용처를 검색했다. `page-shell`, `site-header`, `brand-mark`만 사용자 flow와 dev SVC에 함께 쓰이고 나머지 조합 class는 dev SVC 전용임을 확인했다.
  - **DONE 전 확정 시점**: 새 Shared UI에는 전역 component class를 추가하지 않았고 selector별 실제 소비 위치를 기준으로 T-F018-02, 03, 09, 10의 제거 순서를 확정했다.
  - **T-F018-03 확인**: `/profile`에서 `page-shell`과 완료 결과·추천 action을 제거하고 Page slice의 responsive content rail과 Voice Scan 전용 composition으로 전환했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-01 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `rg` selector inventory, `src/_app/styles/globals.css`
- **Consequences**: F018 중간 단계에는 일부 legacy class가 남지만 새 사용자 화면이나 새 Shared UI에는 추가하지 않는다.

## D020: URL을 보존하는 public/product route group과 인증 shell 분리 (2026-08-09)

- **Context**: 현재 Root Layout이 모든 route에 provider와 고정 `UserMenu`를 함께 렌더링해 public Landing·Login, 사용자 제품 화면, Admin과 dev SVC가 같은 navigation 책임을 공유한다. 인증된 사용자 화면에는 일관된 navigation이 필요하지만 public 화면과 개발 도구에는 같은 shell이 적합하지 않다.
- **Constraints**: 기존 URL, Google-only 인증, safe callback, Admin 권한, logout과 dev SVC 접근을 유지한다. Next.js 16 App Router의 root layout, route group과 Server/Client Component 경계를 따른다.
- **Options**:
  1. Root Layout의 전역 header를 시각적으로만 수정한다.
  2. 사용자 URL 자체를 `/app/*` 아래로 이동한다.
  3. URL에 영향을 주지 않는 `(public)`·`(product)` route group으로 adapter를 재배치하고 인증된 layout만 `ProductShell`을 렌더링한다.
- **Decision**: 옵션 3을 채택한다. Root Layout은 HTML, metadata와 provider만 소유하고, `(product)` layout이 session을 확인해 인증된 화면에만 shell을 제공한다. 각 제품 Page의 기존 session guard는 정확한 callback URL을 보존하며, Admin과 dev SVC는 독립 adapter를 유지한다.
- **Rationale**: URL 호환성을 지키면서 navigation과 인증 책임을 실제 화면 경계에 맞게 분리하고, 후속 Library·detail route가 같은 shell을 재사용할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 현재 App tree, Root Layout, auth service, login callback과 사용자 route별 session 처리 위치를 다시 확인한 뒤 route 이동 목록과 redirect 책임을 고정한다.
  - **DONE 전 확정 시점**: 기존 URL을 유지한 채 public/product adapter를 route group으로 이동했다. 1280×720과 360×800 실제 브라우저에서 Landing·ProductShell·mobile Sheet를 확인했고, 검은 primary token 적용, 가로 overflow 없음, 현재 route 표시와 콘솔 오류 없음까지 검증했다. 사용자가 로그인하지 않은 경우에는 Page별 guard가 callback을 결정하도록 Product Layout이 children을 그대로 전달한다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-02 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run test:auth-navigation` (4/4), `pnpm run check`, `pnpm run test:storybook --run` (26 files, 51 tests), `pnpm run build-storybook`, `pnpm run build`, local browser smoke (1280×720·360×800)
- **Consequences**: 후속 사용자 route는 `(product)` layout 아래 adapter만 추가하면 동일 navigation·content rail·mobile Sheet를 사용한다.

## D021: Voice Scan 입력 상태와 durable 분석 상태의 분리 (2026-08-09)

- **Context**: 현재 `/profile` workbench는 마이크 녹음, 파일 업로드·trim, 준비된 오디오, 분석 mutation, durable job polling과 완료 결과를 한 Client Component에서 조립한다. 사용자는 입력 장치 상태와 서버 분석 상태를 같은 카드에서 해석해야 하고 권한 거부·재시도·복구의 다음 행동이 충분히 분리되어 있지 않다.
- **Constraints**: 5초 최소·10초 권장·60초 최대, 25MB upload, long-audio trim/compress, idempotency, localStorage 복구, Query polling과 media cleanup 계약을 유지한다. 서버가 제공하지 않는 진행률이나 분석 단계를 만들지 않는다.
- **Options**:
  1. 기존 workbench의 문구와 색상만 바꾼다.
  2. 녹음·업로드·분석을 별도 route와 새 server model로 분리한다.
  3. 기존 계약과 단일 `/profile` route를 유지하면서 입력 준비와 durable 분석 상태를 독립된 UI 책임으로 분리하고 명시적 recorder state를 둔다.
- **Decision**: 옵션 3을 채택한다. recorder는 `idle → requesting_permission → recording → stopping → ready | error`와 media resource만 소유하고, `VoiceScanInput`은 녹음·upload·prepared preview를, `AnalysisStatus`는 실제 durable job 상태만 표현한다. 성공 결과는 workbench에 다시 그리지 않고 `/vocal-profiles/[id]`로 이동한다.
- **Rationale**: 10초 권장과 5초 최소를 구분하면서 권한·장치 오류의 upload 대안을 입력 가까이에 유지할 수 있다. 동시에 서버의 pending/processing/retry/failed보다 정밀한 진행률을 만들지 않고 localStorage 복구와 Query polling을 그대로 재사용한다.
- **Trace**:
  - **DOING 시작 시점**: 기존 recorder, workbench, analysis Query와 cleanup test를 다시 읽고 상태 전이·resource 소유권을 먼저 고정한 뒤 시각 composition을 교체한다.
  - **DONE 전 확정 시점**: 녹음 취소와 60초 자동 종료 모두 `record-end`에서 mic을 중지하고 unmount 시 listener, Record plugin과 mic을 정리하도록 고정했다. 5초 미만 prepared audio는 제출을 막되 5–10초는 허용하며 권장 문구만 표시한다. 성공 시 health/jobs Query를 invalidate하고 profile detail로 이동한다. 1280×720·360×800 브라우저에서 권한 요청·취소 중에도 upload 대안, overflow 없음과 콘솔 오류 0건을 확인했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-03 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run test:voice-scan` (12/12), `pnpm run test:vocal-profile-analysis-queue` (5/5), `pnpm run test:query` (20/20 + streaming 1/1), `pnpm run test:vocal-profile-history` (6/6), `pnpm run test:storybook --run` (28 files, 61 tests), `pnpm run check`, `pnpm run build-storybook`, `pnpm run build`, local browser smoke (1280×720·360×800)
- **Consequences**: Voice Scan은 입력과 분석 진행에 집중하고 완성된 결과 해석·추천 action은 profile detail이 소유한다.
