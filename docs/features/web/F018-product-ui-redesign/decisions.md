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
  - **T-F018-10 최종 확인**: 사용자 product route에는 legacy component class와 신규 raw color가 없음을 diff inventory로 확인했다. `page-shell`, `site-header`, `hero-copy`, `workbench-grid`, `audio-card`, `settings-*`, `dropzone*`, `waveform*`, `*-orbit`, `result-column`, `convert-button`의 남은 사용처는 전면 redesign 제외 범위인 `/dev/svc`뿐이므로 개발 도구 예외로 유지한다.
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

## D022: 측정값만 사용하는 보컬 프로필 presentation mapper (2026-08-09)

- **Context**: 현재 보컬 프로필 상세는 음역·품질·차트·레퍼런스를 동일한 위계로 표시하고, 목록은 여러 rounded metric card를 반복한다. 디자인 보드의 `Warm Tenor` 같은 label은 현재 분석 계약이 직접 증명하지 않는 성별·음색 의미를 포함한다.
- **Constraints**: min/max, tessitura, median, voiced ratio, pitch stability, clipping과 RMS만 사용한다. 기존 descriptor, chart, source/reference audio, 삭제와 추천 action을 보존하고 저장 schema나 analyzer를 변경하지 않는다.
- **Options**:
  1. 디자인 보드의 vocal type과 trait를 고정 문구로 표시한다.
  2. 새 AI 분류를 서버와 DB에 추가한다.
  3. 현재 측정값을 입력으로 받는 결정적 presentation mapper가 중립적인 label·trait·quality 문구를 생성하고 UI는 summary/detail 두 수준으로 배치한다.
- **Decision**: 옵션 3을 채택한다. 순수 presentation mapper가 observed/practical range 폭, median, voiced ratio, pitch stability, clipping과 RMS만으로 중립적 label과 최대 세 가지 observable trait를 만든다. 같은 mapper를 상세 summary와 history row가 함께 사용한다.
- **Rationale**: 저장 schema나 분석기를 확장하지 않고도 같은 측정값에 항상 같은 설명을 제공하며, UI가 성별·건강·음색·장르처럼 증명할 수 없는 의미를 만들지 않게 한다. threshold와 비정상 수치 fallback을 순수 함수 테스트로 고정해 문구 분기를 검토 가능하게 유지한다.
- **Trace**:
  - **DOING 시작 시점**: 저장된 분석 계약과 현재 detail/history UI를 다시 대조하고, 데이터로 직접 설명할 수 없는 성별·건강·장르·음색 표현을 배제한 mapper 출력을 먼저 설계한다.
  - **DONE 전 확정 시점**: 실용 음역 폭에 따른 `넓게/균형 있게/집중되어 관찰된 실용 음역`, 안정도와 입력 품질 문구를 mapper에 고정했다. 상세는 label·CTA와 private source audio를 먼저, range·histogram·pitch와 quality·reference를 뒤에 배치했고 차트의 raw green을 semantic data token으로 교체했다. history와 durable analysis job은 desktop row/mobile stacked row로 통합했으며 추천 생성·최근 추천 이동·삭제 확인 동작을 상세 화면에 복원했다. Storybook을 1280×720과 360×800에서 확인해 가로 overflow가 없고 모바일 제목이 한 줄로 자연스럽게 배치됨을 확인했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-04 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run test:vocal-profile-presentation` (12/12), `pnpm run test:vocal-profile-history` (UI 3/3 + private/ownership 3/3), visualization/results (10/10), `pnpm run test:storybook --run` (29 files, 63 tests), `pnpm run check`, `pnpm run build-storybook`, `pnpm run build`, Storybook browser smoke (1280×720·360×800)
- **Consequences**: 동일 분석값은 모든 목록·상세·Storybook에서 같은 요약 언어를 사용하고, 기존 세부 분석은 필요할 때 펼쳐 확인한다.

## D023: 저장된 추천 run의 클라이언트 목록 projection (2026-08-10)

- **Context**: 추천 API는 한 run에 100개 item과 점수·추천 shift·reason·합성 상태를 반환하지만 현재 화면은 각 item마다 큰 Card와 waveform player를 렌더링해 비교와 탐색 비용이 높다.
- **Constraints**: 새 server pagination이나 도메인 필드를 만들지 않는다. title, artist, score, recommended shift와 실제 synthesis 상태만 검색·정렬·필터에 사용하고 mixing mutation·polling·idempotency·결과 재생·run 삭제 semantics를 보존한다.
- **Options**:
  1. 서버 pagination과 검색 endpoint를 새로 만든다.
  2. 100개 Card를 유지하고 상단 control만 추가한다.
  3. 저장된 run을 공통 Query cache에서 읽고 순수 client projection으로 검색·정렬·필터한 뒤 desktop table/mobile row를 렌더링한다.
- **Decision**: 옵션 3을 채택한다. Zod로 정규화한 URL query를 projection state의 정본으로 사용하고, 저장된 run의 원본 배열은 변경하지 않은 채 순수 helper가 검색·필터·stable sort를 수행한다. 목록은 단일 semantic table DOM을 desktop table/mobile stacked row로 반응형 전환하며 mixing action과 성공 result audio는 행 단위로 분리해 필요할 때만 mount한다.
- **Rationale**: API·DB 계약을 확장하지 않고도 100곡의 비교 밀도를 높이며 URL 복원성과 Query cache의 상태 일관성을 함께 보존한다. 초기 화면에 waveform player를 만들지 않아 행 수가 늘어도 audio instance 비용이 비례해 증가하지 않고, 정수 적합도·추천 shift·실제 synthesis 상태만으로 증명 가능한 비교를 제공한다.
- **Trace**:
  - **DOING 시작 시점**: recommendation response, Query polling, mixing mutation과 기존 Storybook/test를 다시 읽고 100개 행에서 유지해야 할 실제 상태와 lazy audio 경계를 먼저 고정한다.
  - **DONE 전 확정 시점**: 검색·점수·shift·status 필터와 rank·score·title 정렬을 순수 projection helper로 고정했다. URL은 `useSyncExternalStore`로 읽고 유효하지 않은 값은 Zod 기본값으로 복구하며 reset/빈 결과 동작을 제공한다. desktop/mobile은 같은 table 행을 사용하고 모바일에서 score와 shift를 한 줄 비교로 배치했다. start/retry/idempotency/polling/cache 갱신과 result download는 유지하고 성공 audio는 사용자가 `결과 듣기`를 선택한 행에만 mount한다. 삭제는 공통 Dialog로 전환했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-05 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run test:recommendation` (presentation 10/10 + UI 11/11), `pnpm run test:query` (20/20 + streaming 1/1), `pnpm run test:storybook --run` (29 files, 66 tests), `pnpm run check`, `pnpm run build-storybook`, `pnpm run build`, Storybook browser smoke (1280×800·360×800, horizontal overflow 없음, 초기 waveform 0개)
- **Consequences**: 필터 결과는 저장 run의 client projection이며 원본 rank와 Query cache를 변경하지 않는다. 서버 pagination이 필요해질 만큼 dataset이 커질 때는 URL contract를 유지한 채 query backend만 교체할 수 있다.

## D024: Song Detail의 additive snapshot 계약과 동일 run cache (2026-08-10)

- **Context**: 추천 item에는 점수와 이유가 저장되어 있지만 곡 음역과 original key는 응답에 없고, 디자인 보드의 album art·genre·lyrics·preview는 현재 도메인 계약에 존재하지 않는다.
- **Constraints**: PostgreSQL migration 없이 기존 `Song.originalKey`와 연결된 `Song.vocalProfile`만 사용한다. 상세 주소는 run 소유권과 item 포함 여부를 모두 확인해야 하며 목록의 mixing 상태와 분리된 client state를 만들지 않는다.
- **Options**:
  1. Song Detail 전용 API와 Query key를 새로 만든다.
  2. route param만 신뢰하고 catalog에서 song을 직접 조회한다.
  3. recommendation run 응답에 nullable song snapshot을 additive로 포함하고 상세도 같은 run Query key에서 item을 선택한다.
- **Decision**: 옵션 3을 채택한다. recommendation run serializer가 `Song.originalKey`와 완전하고 순서가 유효한 `SONG` vocal profile만 nullable additive field로 제공하며 legacy payload는 Zod default로 `null` 복구한다. Song Detail Server Page는 UUID, session, run ownership과 item 포함 여부를 확인하고 client는 목록과 같은 `recommendationKeys.detail(runId)` cache에서 선택한 item을 읽는다.
- **Rationale**: 기존 run API가 이미 점수 snapshot과 mixing 상태의 정본이므로 별도 상세 API를 만들면 polling·optimistic patch가 갈라질 위험이 있다. 작은 nullable profile을 같은 응답에 더하면 DB migration 없이 목록과 상세의 상태가 자동으로 일치하고, 불완전한 곡 분석은 명시적 unavailable state로 처리할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: `Song.originalKey`, `Song.vocalProfile`, recommendation serializer·Zod contract와 기존 mixing mutation/polling을 확인했다. DB schema는 이미 필요한 값을 소유하므로 migration과 별도 상세 API를 배제했다.
  - **DONE 전 확정 시점**: `/recommendations/[id]/songs/[itemId]`에 얇은 App adapter와 loading/not-found boundary를 추가했다. 상세는 사용자·곡의 실용/관측 음역, 원키·추천 키 점수, 실제 reason과 overlap·고음 초과·confidence breakdown만 표시하고 HTTP(S) source URL만 `target="_blank" rel="noreferrer noopener"` 외부 링크로 노출한다. 목록의 mixing action과 mutation을 `features/create-mixing`으로 승격해 start/retry/idempotency/polling/result lazy mount가 두 화면에서 같은 cache를 사용하도록 했다. Storybook 정상·음역 없음·진행·성공·실패 상태와 1280×800/360×800 browser smoke에서 horizontal overflow와 clipping이 없음을 확인했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-06 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run test:recommendation` (ranking 10/10 + presentation/synthesis/list/detail 17/17), `pnpm run test:recommendation:db` (3/3), `pnpm run test:query` (21/21 + streaming 1/1), `pnpm run test:storybook --run` (30 files, 71 tests), `pnpm run check`, `pnpm run build-storybook`, `pnpm run build`, Storybook browser smoke (1280×800·360×800, horizontal overflow/clipping 없음, 초기 waveform 0개)
- **Consequences**: 상세는 저장된 run의 점수 snapshot과 현재 연결된 song profile을 함께 표시하며, 없는 album art·genre·difficulty·lyrics·preview를 추정하지 않는다. 추후 별도 song detail API가 필요해져도 현재 route와 nullable response field는 호환 경계로 유지할 수 있다.

## D025: URL 정본과 server query를 사용하는 통합 Library (2026-08-10)

- **Context**: 보컬 프로필은 server-side history와 durable analysis job polling을, AI 믹스는 paginated history API와 active job polling을 각각 제공하지만 서로 다른 Page slice가 목록 표현을 소유한다. 새 `/library`는 두 사용자 소유 resource를 한 진입점에서 탐색해야 하며, 디자인 보드의 Project 개념은 현재 데이터 모델에 없다.
- **Constraints**: 기존 `/vocal-profiles`와 `/mixing-history` URL·기능을 유지한다. 믹싱 title/artist 검색과 실제 status filter는 현재 page에 내려온 결과가 아니라 전체 owner dataset에 pagination 전에 적용되어야 한다. filter마다 Query cache와 polling 결과가 섞이지 않아야 하며 DB migration은 하지 않는다.
- **Options**:
  1. Library 전용 Project aggregate/API를 새로 만든다.
  2. 두 기존 Page를 client에서 합치고 현재 page 결과만 필터링한다.
  3. `widgets/library`가 profile/mixing 목록을 공유하고 URL search param을 정본으로 삼아 mixing filter를 기존 history API와 Prisma query에 전달한다.
- **Decision**: 옵션 3을 채택한다. `/library`는 `profiles | mixes` tab과 `page`, `q`, 실제 mixing status를 Zod로 정규화한다. `getMixingHistory`는 owner 조건과 title/artist/status 조건을 하나의 `where`에 결합해 count와 row query에 동일하게 적용하며, TanStack Query key에는 정규화한 filter 전체를 포함한다. 기존 두 history Page도 같은 widget list와 pagination을 사용한다.
- **Rationale**: 저장 모델을 가장하지 않으면서 기존 resource 계약을 조합하고, 검색 결과의 total/pageCount와 표시 row가 일치한다. URL은 reload·back/forward에 안정적이고 filter별 cache 격리와 active row에 한정된 polling을 검증할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 기존 profile history, analysis job list polling, mixing history serializer/API/Query와 route adapter를 조사했다. profile은 검색 가능한 이름 필드가 없으므로 가짜 검색을 만들지 않고, mixing만 실제 song title/artist와 DB status를 필터 대상으로 확정했다.
  - **DONE 전 확정 시점**: `/library` route와 loading boundary를 추가하고 ProductShell primary navigation을 Library로 통합했다. profile과 mixing 목록·pagination은 `widgets/library`로 이동해 기존 두 URL도 같은 UI를 사용한다. mixing filter는 Zod로 `page/q/status`를 정규화하고 API·Prisma count/findMany의 동일 owner-scoped `where`에 적용했으며 Query key에도 전체 filter를 포함했다. 1280×800과 360×800 Storybook에서 desktop table/mobile stacked row, tabs, search/status control, active/result-ready/failed 상태와 horizontal clipping 없음(0개)을 확인했고 Base UI Tabs link의 `nativeButton` 경고를 수정한 뒤 서버 콘솔 경고 0건을 재확인했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-07 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run test:mixing:ui` (3/3), `pnpm run test:mixing:db` (1/1, owner·title/artist/status·pagination 포함), `pnpm run test:vocal-profile-history` (UI 3/3 + private/ownership 3/3), `pnpm run test:query` (22/22 + streaming 1/1), `pnpm run test:auth-navigation` (4/4), `pnpm exec tsx --test tests/effect-cleanup.test.ts` (2/2), `pnpm run test:storybook --run` (32 files, 77 tests), `pnpm run check`, `pnpm run build`, `pnpm run build-storybook`, Storybook browser smoke (1280×800·360×800, horizontal overflow/clipping·console warning 없음)
- **Consequences**: `/library`는 profile과 AI mix의 탐색 진입점이며 Project, favorite 또는 playlist 기능을 암시하지 않는다. 추후 dataset이나 profile metadata가 확장돼도 URL schema와 widget public API를 유지한 채 server query만 확장할 수 있다.

## D026: terminal 상태와 실제 timestamp에 한정한 Mixing Detail (2026-08-10)

- **Context**: Library 목록만으로는 AI 믹싱의 실제 서버 상태와 결과 파일 수명주기를 충분히 설명하거나 안전하게 삭제할 수 없다.
- **Constraints**: worker가 소유한 active job cancellation은 범위에서 제외한다. DB에 없는 백분율·마스터링 세부 단계를 만들지 않고 기존 owner scope, private audio proxy, `MediaCleanupJob`과 `TicketLedger.onDelete: SetNull`을 유지한다. DB migration이나 Modal worker 알고리즘은 변경하지 않는다.
- **Options**:
  1. active/terminal 구분 없이 job과 결과 asset을 cascade 삭제한다.
  2. Detail 전용 progress 모델과 백분율을 새로 저장한다.
  3. 기존 job 상태·timestamp를 additive detail 계약으로 사용하고 terminal owner job만 조건부 삭제한 뒤 외부 결과 asset 수명주기를 분리한다.
- **Decision**: Mixing Detail은 기존 owner-scoped job payload를 같은 detail Query key로 읽고 pending/preparing, submitted, processing, terminal 상태와 저장 timestamp만 표시한다. 삭제는 owner terminal job만 DB transaction에서 허용하고 ticket ledger는 SetNull로 보존하며 결과 asset은 Leemage 삭제 또는 cleanup queue로 넘긴다.
- **Rationale**: 작업자가 갱신 중인 active job 삭제 경합을 차단하고, 존재하지 않는 진행률을 만들지 않으면서 결과 파일과 회계 기록의 수명주기를 분리할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: owner detail GET, audio proxy, `MixingJob` 상태/timestamp, `MediaAsset` cleanup과 `TicketLedger` FK를 조사했다. worker cancellation 의미가 별도로 없으므로 active delete는 명시적 409로 고정했다.
  - **DONE 전 확정 시점**: `/library/mixes/[id]`는 active 상태에만 5초 polling하고 terminal에서 중지한다. timeline은 `submittedAt`·`startedAt`과 실제 status로 완료·도달·현재·건너뜀을 구분하며 백분율을 표시하지 않는다. 삭제 transaction은 owner와 terminal status를 함께 조건으로 사용하고 job 삭제 후 결과 asset을 Leemage 삭제 또는 cleanup queue로 이동한다. PostgreSQL에서 다른 사용자 404, active 409, terminal 삭제, result `DELETE_PENDING`, cleanup job 생성과 기존 debit ledger의 `mixingJobId=null`을 확인했다. 1280×800·360×800 Storybook에서 완료·진행·실패 화면의 horizontal overflow 없음과 error/warning console 0건을 확인했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-08 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run test:mixing:ui` (7/7), `pnpm run test:mixing:db` (1/1, active 409·owner 404·cleanup queue·ticket SetNull 포함), `pnpm run test:query` (23/23 + streaming 1/1), `pnpm run test:storybook --run` (33 files, 81 tests), `pnpm exec tsx --test tests/effect-cleanup.test.ts` (2/2), `pnpm run check`, `pnpm run build-storybook`, `pnpm run build`, Storybook browser smoke (1280×800·360×800)
- **Consequences**: 믹싱 작업 기록은 terminal 상태에서만 사용자가 제거할 수 있고, 삭제 후에도 ticket 회계 기록은 유지된다. 외부 파일 삭제 장애는 사용자 요청을 되돌리지 않고 기존 cleanup worker가 재시도한다.

## D027: 실제 계정 데이터와 product route group 상태 경계 (2026-08-10)

- **Context**: 현재 Account는 사용자와 티켓을 rounded card로만 표시하고 Google 연결 여부를 확인하지 않으며, ProductShell 주 메뉴에 Account가 없어 현재 route가 드러나지 않는다. 여러 제품 route는 loading/error/not-found 경계도 부분적으로만 제공한다.
- **Constraints**: 구독·설정·연결 해제처럼 현재 데이터나 기능이 없는 항목을 만들지 않는다. 사용자 identity는 session, Google 연결은 실제 Better Auth `Account.providerId`, 티켓은 기존 ledger를 정본으로 사용하며 DB migration을 추가하지 않는다. product route의 App 파일은 FSD 가이드에 맞는 얇은 adapter로 유지한다.
- **Options**:
  1. Account UI만 재배치하고 Google 연결 여부는 고정 문구로 표시한다.
  2. 계정·구독·알림 설정을 mock data로 채워 디자인 보드에 가까운 설정 화면을 만든다.
  3. 실제 session·Google Account·ticket ledger만 server에서 조합하고 flat UI와 공통 route 상태를 재사용한다.
- **Decision**: Account는 Better Auth Account의 Google provider 존재 여부, session 사용자, ticket balance/ledger를 server query로 조합한 flat view로 만들고 Library/Admin 링크만 제공한다. Account를 ProductShell 주 메뉴에 추가하며 product route group의 공통 loading/error/not-found는 _app layout composition을 얇은 App adapter가 재사용한다.
- **Rationale**: DB에 존재하는 정보만 보여주면서 navigation과 상태 언어를 모든 제품 화면에서 일관되게 유지하고, route별 중복 상태 UI를 줄일 수 있다.
- **Trace**:
  - **DOING 시작 시점**: AccountPage, ProductShell, Better Auth Account schema, TicketLedger와 product route boundary를 조사했다. 디자인 보드의 설정·구독 정보는 현재 정본 데이터가 없으므로 범위에서 제외했다.
  - **DONE 전 확정 시점**: Account server composition이 session 사용자, 실제 Google provider 존재 여부와 paginated ticket ledger를 읽고 page 범위를 transaction 안에서 보정한다. ProductShell에는 Account current navigation을 추가하고 product route group의 loading/error/not-found는 `_app/layout` StatePanel composition을 얇은 adapter로 노출했다. active polling은 기존 Query가 stale data를 유지하고 terminal에서 중지하며, 오류·disabled·삭제 Dialog를 Storybook 상태 행렬에서 재검증했다. Account를 360×800·768×1024·1280×800, Admin과 dev SVC를 1280×800 실제 브라우저에서 확인해 horizontal overflow와 console error가 없음을 확인했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-09 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run test:tickets` (Account UI 3/3 + DB 1/1), `pnpm run test:auth:db` (3/3), `pnpm run test:auth-navigation` (5/5), `pnpm run test:vocal-profile-history` (UI 3/3 + private/ownership 3/3), `pnpm run test:recommendation` (10/10 + 17/17), `pnpm run test:mixing:ui` (7/7), `pnpm run test:storybook --run` (35 files, 89 tests), `pnpm run check`, `pnpm run build-storybook`, `pnpm run build`, 실제 browser smoke (Account 360×800·768×1024·1280×800, Admin/dev SVC 1280×800)
- **Consequences**: Account는 실제로 확인 가능한 identity·Google 연결·ticket 정보만 표시한다. route-level 상태 표현은 Shared `StatePanel`을 통해 일관되며, 이후 계정 설정 기능이 추가될 때 별도 feature와 실제 저장 계약을 먼저 정의해야 한다.

## D028: 최종 visual fidelity와 개발 도구 예외 (2026-08-10)

- **Context**: 네 디자인 보드와 구현 전체를 최종 비교하고 legacy class, raw color, 의존성 및 제외 범위를 확정해야 한다.
- **Constraints**: 디자인 보드는 공간감·정보 위계·interaction 구조의 정본이지만 현재 DB/API에 없는 프로젝트, 플레이리스트, 가격제, 사용자 가창 원본, 앨범·가사 메타데이터를 production UI에 만들지 않는다. F018은 PostgreSQL migration, Modal/worker 알고리즘, Coolify와 연기된 `quality.yml`을 변경하지 않는다.
- **Options**:
  1. 보드의 모든 패널과 콘텐츠를 mock data로 채워 시각적 유사도를 최대화한다.
  2. 모든 화면을 보드와 동일한 navigation·surface 구조로 강제하고 기존 데이터 흐름을 바꾼다.
  3. 보드의 여백·타이포그래피·평면 목록·상태 위계를 실제 route와 데이터 계약에 적용하고, 존재하지 않는 기능과 개발 도구는 명시적 차이로 남긴다.
- **Decision**: 제품 화면은 디자인 보드의 공간감·위계·상태 구조를 따르되 실제 도메인 계약만 표시한다. Admin과 dev SVC는 전면 redesign 제외 범위를 유지하며 dev SVC 전용 전역 class와 raw status color는 개발 도구 예외로 남긴다.
- **Rationale**: 가짜 프로젝트·가격제·앨범 메타데이터를 만들지 않으면서 사용자 제품 UI를 일관되게 완성하고, 제외된 개발 도구의 기능 회귀 위험을 피한다.
- **Trace**:
  - **DOING 시작 시점**: main 기준 전체 route/API/public API, dependency, raw color, legacy class와 DB·배포 파일 diff를 조사했다. dependency와 lockfile 추가, Prisma migration, Modal/worker, Coolify 및 `.github` 변경이 없음을 확인했다.
  - **DONE 전 확정 시점**: Landing·Voice Scan·Library를 360×800, 768×1024, 1280×800 실제 브라우저에서 다시 확인해 horizontal overflow 0과 명확한 current navigation을 검증했다. 1280px Landing과 360px Library screenshot을 보드와 비교해 warm-white canvas, black CTA, 넓은 여백, 평면 list와 제품 interaction 중심 위계를 확인했다. 보드와 다른 부분은 실제 데이터가 없는 onboarding·가창 recording·Before/After·project·playlist·pricing·album/lyrics를 제외한 것과, 제품 shell을 desktop sidebar/mobile Sheet로 통일한 것이다. 전체 회귀 중 발견한 Link/Base UI semantics 검사를 TSX AST 기반으로 보강하고 Account/Admin menu item에 non-native 의미를 명시했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-10 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm test` 전체 통과, `pnpm run check` (error 0, 기존 Biome warning 60건, Steiger·architecture 4/4), `pnpm run build-storybook`, `pnpm run test:base-ui` (1/1), Storybook 35 files/89 tests, 실제 browser smoke 및 screenshot 비교 (360×800·768×1024·1280×800)
- **Consequences**: 제품 route는 장기 Design System과 semantic token을 공유하고 새 화면도 실제 계약을 먼저 정의해야 한다. `/dev/svc`의 전용 전역 class와 raw status color는 사용자 제품 UI로 재사용하지 않으며, 개발 도구 자체를 재설계하는 후속 Feature에서 제거한다.

## D029: visual review 이후 interaction fidelity 보완 (2026-08-10)

- **Context**: F018 local merge 직전 실제 route와 네 디자인 보드를 다시 비교한 결과, Landing의 microphone이 정적 장식에 머물고 Song Match·Library는 긴 목록에서 reference보다 행 밀도가 낮으며 반복 action이 비교 위계를 방해한다는 세 개의 독립 리뷰 finding이 확인됐다.
- **Constraints**: 기존 auth CTA, recommendation Query/mixing mutation, Library owner filter와 상세 action은 보존한다. 새 UI library나 가짜 도메인 필드를 추가하지 않고 CSS motion은 reduced-motion 접근성을 따라야 한다.
- **Options**:
  1. 현재 구현을 그대로 병합하고 별도 feature로 미룬다.
  2. Landing motion만 추가하고 목록 finding은 수용하지 않는다.
  3. F018 병합을 보류하고 Landing interaction, Song Match 비교 밀도, Library 상태 언어·행 위계를 순차 보완한 뒤 responsive visual QA를 다시 수행한다.
- **Decision**: 사용자의 `B` 선택에 따라 옵션 3을 채택하고 T-F018-11~14를 추가한다.
- **Rationale**: 세 finding은 새로운 제품 기능이 아니라 승인된 visual source of truth와 기존 acceptance를 충족하기 위한 presentation 보완이며, 현재 feature branch에서 함께 검증하는 편이 디자인 회귀를 줄인다.
- **Trace**:
  - **DOING 시작 시점**: Landing은 motion과 첫 viewport, Song Match는 100곡·tablet·mobile filter, Library는 raw error·density·action hierarchy를 각각 독립 검증 경계로 고정했다.
  - **T-F018-11 확인**: Landing을 Server Component로 유지하면서 CSS Module에 서로 다른 duration·delay의 24개 waveform bar와 3개 ripple ring을 구현했다. microphone은 기존 `primaryHref` Link로 바꾸고 focus-visible과 reduced-motion 정적 fallback을 제공했다. 1280×800에서는 제목을 두 줄로 정리하고 360×800에서는 제목·두 CTA·microphone이 첫 viewport에 함께 노출됨을 실제 브라우저 screenshot과 서로 다른 animation frame으로 확인했다.
  - **T-F018-12 확인**: Song Match는 `xl`부터만 semantic table을 사용하고 그 아래에서는 곡명·점수·추천 키·상태를 compact comparison row로 배치했다. 상세 필터는 1280px 미만에서 적용 조건 수를 보여 주는 bottom Sheet로 이동했고, 목록에 100번 반복되던 AI 믹싱 primary action은 상태 label·결과 상세 진입으로 낮춰 Song Detail의 단일 생성 action을 보존했다. 100곡 fixture를 360·768·1024·1280에서 비교해 tablet 제목 붕괴와 horizontal overflow가 없고 768px 첫 화면에 9개 곡이 보임을 확인했다.
  - **T-F018-13 확인**: mixing error code를 사용자 문구로 변환하는 `presentMixingFailure`를 entity presentation에 두고 unknown upstream detail도 고정 fallback으로 차단했다. AI 믹스 목록은 inline waveform·download를 상세 화면에 남기고 상태별 단일 action만 노출했으며, 보컬 프로필은 mobile 3열 metric과 `추천 n · 믹스 n`, 전체 개수·최신 분석순을 표시한다. compact content-width tab과 10/12개 dense fixture를 추가하고 FSD 규칙에 따라 ProductShell 통합 story를 `_pages/library`에 배치했다. 1280×800에서 mix 약 5행, 360×800에서 mix 2행과 profile 2행 이상을 실제 screenshot으로 확인했다.
  - **DONE 전 확정 시점**: Landing·Song Match·Library를 360×800, 768×1024, 1024×800, 1280×800에서 다시 캡처했다. 세 화면의 `documentElement.scrollWidth`와 viewport 폭이 모든 조합에서 같았고, Landing microphone action은 각 첫 viewport 안에 있었으며 2026-08-10 최종 브라우저 구간의 console error는 0건이었다. `pnpm test` 전체와 Storybook 정적 build를 재실행해 최신 코드의 36 files/92 browser tests와 Next.js 23개 route production build를 확인했다. 세 리뷰의 P1/P2 finding은 모두 반영했다. 잔여 위험은 Song Match가 가벼운 100개 DOM row를 유지한다는 점이며 waveform instance를 제거해 현재 검증에서는 문제가 없지만 실제 사용 지표가 악화되면 별도 pagination/virtualization을 검토한다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-11~14 task checkpoint commits
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm test` 전체 통과, Storybook 36 files/92 tests, `pnpm run build-storybook`, `pnpm run check` (error 0, 기존 warning 60건, architecture 4/4), 실제 browser Landing·Song Match·Library 360×800·768×1024·1024×800·1280×800, animation frame 변화·horizontal overflow 0·console error 0건
- **Consequences**: F018의 네 visual review 보완 태스크가 구현·검증됐고 장기 Design System은 Hero motion과 긴 목록의 단일 action 위계를 0.2 규칙으로 고정한다. 기능은 다음 workflow checkpoint로 이동하며 로컬 통합 여부는 해당 승인 경계를 따른다.

## D030: warm V1 폐기와 reference-conditioned neutral V2 (2026-08-10)

- **Context**: 현재 구현 13개 route의 페이지별 방향 시안을 처음 생성했으나, V1 prompt의 `#FBFAF7` warm white와 페이지별 독립 생성 때문에 원본 보드보다 노란 canvas를 사용하고 wordmark, navigation, typography와 정보 밀도가 서로 달라졌다. 사용자는 현재 구현도 원본보다 누렇게 보이며 V1 시안은 통일성이 없다고 지적했다.
- **Constraints**: 네 원본 보드를 visual source of truth로 유지한다. 생성 시안은 현재 API·Zod·Page에 없는 기능을 구현 요구사항처럼 만들지 않으며 이번 태스크는 이미지와 차이 분석을 소유하고 production UI 코드는 변경하지 않는다.
- **Options**:
  1. V1 prompt의 색상 문구만 수정해 13개를 다시 독립 생성한다.
  2. 한 장의 대형 보드로 모든 페이지를 생성해 잘라 쓴다.
  3. 원본 보드를 매번 직접 참조하고 Landing/Library를 public/product master로 잠근 뒤 neutral style lock으로 페이지별 생성·교정을 수행한다.
- **Decision**: 옵션 3을 채택한다. V1은 폐기본으로 분리하고 V2는 `#FFFFFF`, `#FAFAFA/#F7F7F7`, `#E8E8E8`, `#111/#737`과 동일 product rail·wordmark·navigation을 고정한다. Admin과 dev SVC는 token을 공유하되 각각 operator rail과 top-header utility라는 구조적 예외만 허용한다.
- **Rationale**: 관련 원본과 공통 master를 동시에 conditioning하면 페이지마다 생기는 브랜드·shell drift를 줄이면서 각 route의 정보 구조를 독립적으로 설계할 수 있다. 순백색 neutral scale은 현재 `globals.css` hue 75–80 warm chroma가 만드는 베이지 막을 명확히 드러낸다.
- **Trace**:
  - **DOING 시작 시점**: App Router의 13개 page를 inventory하고 실제 route 또는 대표 Storybook 상태를 1280×800으로 캡처했다. V1의 warm canvas와 독립 shell 문제를 current/reference contact sheet와 함께 확인했다.
  - **DONE 전 확정 시점**: Landing/Library master와 관련 원본을 `referenced_image_paths`로 전달해 V2 13장을 생성했다. shell이 한국어 nav나 mark-only로 변형된 두 장은 master를 다시 참조하는 edit pass로 교정했다. V2 contact sheet에서 neutral canvas, 동일 product rail, sans typography, black CTA, lavender/blue data accent와 restrained green status가 한 계열로 유지됨을 시각 검수했다. 페이지별 gap과 current token 원인을 `docs/designs/page-redesign-analysis.md`에 기록했다.
  - **머지 후 확인**: 로컬 통합 후 기록한다.
- **Evidence**:
  - **Commit**: T-F018-15 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: V2 최종 PNG 13개와 current baseline 13개 존재 확인, `file` PNG 검증, `git diff --check`, lee-spec-kit workflow audit
- **Consequences**: `concepts-v2`만 후속 UI 구현의 방향 시안으로 사용한다. Light semantic token의 neutral 교정과 high-priority page 재배치는 별도 구현 작업으로 남으며, 생성 이미지의 unsupported action과 fixture 값은 구현하지 않는다.

## D031: sidebar V2 폐기와 top-header·crystal Landing 확정 (2026-08-10)

- **Context**: 최초 채택 V2는 Library 보드의 좌측 rail을 모든 인증 제품 화면에 확장했지만, 사용자 검수에서 원하는 기준은 Landing·Discovery·Creation 보드처럼 수평 header navigation을 사용하는 구조임이 확인됐다. Landing 끝부분에도 보드의 prism 계열과 같은 iridescent crystal CTA 및 CTA 아래 실제 footer가 필요했다.
- **Constraints**: 기존 `(product)` route group, auth guard, active navigation, mobile 접근성, Query 상태와 Page composition을 바꾸지 않는다. 새 UI library나 별도 디자인 시스템을 추가하지 않고 neutral token과 기존 shadcn/Base UI primitive를 사용한다. Crystal은 장식 자산이며 핵심 CTA의 대체 텍스트나 focus 의미를 가로채지 않는다.
- **Options**:
  1. 기존 216–240px sidebar V2와 코드를 유지하고 Landing에만 crystal을 추가한다.
  2. 제품 화면마다 원본 보드에 보이는 서로 다른 navigation 구조를 사용한다.
  3. 모든 인증 제품 화면을 동일 64px top header로 통일하고 mobile에서만 Sheet를 사용하며, Landing 마지막에 crystal CTA와 site footer를 둔다.
- **Decision**: 사용자의 명시적 요청에 따라 옵션 3을 채택한다. 데스크톱 header는 brand, 중앙 `Voice Scan / Library / Account`, 우측 compact avatar로 구성한다. Admin과 dev SVC는 제품 navigation을 가장하지 않는 top utility header 예외로 유지한다. Light token은 순수 neutral scale로 교정하고 Landing은 `public/images/copy-singer-crystal.png`를 사용하는 CTA 다음에 site footer를 렌더링한다.
- **Rationale**: 수평 navigation은 사용자가 지정한 최종 visual direction과 공통 제품 정보 구조를 동시에 만족하며, content 폭을 sidebar에 빼앗기지 않는다. Crystal을 Landing 끝의 제한된 brand accent로 사용하면 waveform·분석 accent와 경쟁하지 않고 보드의 정체성을 회복할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 첨부 crystal reference를 검수하고 T-F018-16을 추가했다. 기존 ProductShell, Landing, token, 13개 V2 시안과 관련 문서의 sidebar 가정을 inventory했다.
  - **구현 확인**: ProductShell의 desktop aside를 제거하고 64px sticky header와 right-side mobile Sheet로 전환했다. `UserMenu` compact variant를 header avatar로 재사용했으며 neutral light token, Landing crystal CTA와 Product/Account/footer copyright 구조를 구현했다. V2 13개 concept과 contact sheet도 동일 top-header 기준으로 다시 생성·교정했다.
  - **DONE 전 확정 시점**: Landing과 ProductShell을 1280×800 및 360×800 실제 브라우저에서 검수했다. 데스크톱은 중앙 navigation과 compact avatar, 모바일은 오른쪽 Sheet와 현재 route를 확인했고 horizontal overflow가 없었다. Landing은 mobile 첫 viewport에 제목·CTA·waveform microphone을 유지하고 desktop 하단에서 crystal CTA 다음 site footer가 이어짐을 확인했다. compact avatar의 한 축 flex shrink가 만들던 Next Image warning도 44px trigger와 32px fixed image로 제거했다. 13개 current baseline과 채택 V2 contact sheet를 새 shell 기준으로 동기화했다.
- **Evidence**:
  - **Asset**: `public/images/copy-singer-crystal.png`, `docs/designs/generated/page-redesigns/concepts-v2-contact-sheet.png`
  - **Commit**: T-F018-16 task checkpoint commit
  - **PR**: 로컬 워크플로 — 해당 없음
  - **Test/Log**: `pnpm run check` (error 0, 기존 Biome warning 60건, architecture 4/4), `pnpm run test:auth-navigation` (5/5), targeted Storybook (3 files/7 tests), 전체 Storybook (36 files/92 tests), `pnpm run build` (23개 page 생성), 실제 browser Landing·Library 1280×800·360×800 및 mobile Sheet
- **Consequences**: D030의 neutral V2 원칙은 유지하되 product rail 결정은 D031이 대체한다. 이후 제품 route는 desktop sidebar를 새로 만들지 않으며 navigation 정보 구조가 바뀔 때 Design System·ProductShell story·V2 style lock을 함께 갱신한다.

## D032: Base UI Menu.Group context 런타임 회귀 방지 (2026-08-10)

- **Context**: T-F018-16 완료 후 실제 ProductShell의 계정 메뉴를 열면 `DropdownMenuLabel`이 Base UI `Menu.GroupLabel`로 렌더링되면서 `MenuGroupContext is missing` 런타임 오류가 발생했다. 기존 Storybook은 ProductShell을 렌더링했지만 desktop 계정 메뉴와 공통 DropdownMenu popup을 실제로 열지 않아 오류 경로를 실행하지 않았다.
- **Decision**: `DropdownMenuLabel`의 primitive 계약은 유지하고, 모든 사용처에서 label과 관련 item을 `DropdownMenuGroup` 안에 배치한다. Shared DropdownMenu와 ProductShell desktop story는 trigger를 실제로 클릭하고 portal의 group label·menuitem이 보이는지 검증한다.
- **Rationale**: GroupLabel을 일반 text로 약화하면 Base UI의 접근성 구조를 잃는다. 사용처를 올바른 context로 교정하고 popup open 경로를 테스트해야 실제 사용자 interaction과 동일한 회귀 경계를 확보할 수 있다.
- **Evidence**: targeted Storybook 2 files/4 tests, 전체 Storybook 36 files/92 tests, `pnpm run check`, 실제 `/library` 계정 메뉴 DOM의 `menu > group "계정" > menuitem` 확인과 browser error log 0건.
- **Consequences**: 이후 `DropdownMenuLabel`을 추가할 때 `DropdownMenuGroup`이 필수이며, popup primitive의 Story는 정적 render만 하지 않고 최소 한 번 실제 open interaction을 검증한다.

## D033: 실제 세션 로그아웃과 개발 인증 우회 상태 분리 (2026-08-10)

- **Context**: 계정 메뉴에서 Better Auth `signOut` 요청은 성공하고 `/`로 이동했지만, 새 요청마다 `DEV_AUTH_BYPASS_ENABLED=true`가 동일 개발 사용자를 다시 주입해 Landing과 private route가 계속 로그인 상태로 보였다. 이는 로그아웃 API 실패가 아니라 강제 개발 인증 우회가 실제 세션 종료 결과를 덮어쓴 문제였다.
- **Decision**: Google OAuth가 구성된 로컬 환경은 개발 인증 우회를 끄고 실제 Better Auth 세션을 사용한다. 일반 세션의 로그아웃은 요청 오류를 toast로 노출하고 성공 시 `router.replace("/")`와 `router.refresh()`로 public Landing 및 server session 상태를 즉시 갱신한다. 우회 token으로 식별된 강제 개발 세션은 계정 메뉴에서 가짜 로그아웃 action을 제공하지 않고 `개발 인증 우회 사용 중` 비활성 상태를 표시한다.
- **Rationale**: 강제 우회가 켜진 동안에는 cookie를 삭제해도 다음 요청에서 사용자가 의도적으로 재주입되므로 정상적인 interactive logout 의미를 제공할 수 없다. 실제 세션과 우회 상태를 UI·정책에서 분리하면 운영 로그아웃 계약을 보존하면서 로컬 자동화 설정의 동작도 오해하지 않게 된다.
- **Evidence**: `pnpm run test:auth-navigation` 5/5, `pnpm run test:auth:db` 3/3, ProductShell Storybook 4/4, `pnpm run check`, 실제 브라우저에서 로그아웃 후 Landing의 `로그인`/`무료로 시작하기` CTA, `/library`의 `/login?callbackURL=%2Flibrary` redirect, browser error 0건 확인.
- **Consequences**: `DEV_AUTH_BYPASS_ENABLED=true`는 매 요청에 사용자를 강제로 주입하는 자동화 전용 모드이며 interactive logout을 지원하지 않는다. 실제 로그인·로그아웃을 시험할 때는 이를 `false`로 두어야 하고 production에서는 기존 fail-closed 정책이 유지된다.

## D034: 현재 UI 비참조·원본 4장 visual fidelity와 crystal 단일 사용 (2026-08-10)

- **Context**: 사용자 검수에서 F018 구현이 기능 계약뿐 아니라 기존 화면의 카드 배치·표 구조·정보 밀도까지 과도하게 보존해 네 원본 디자인 보드와 충분히 닮지 않았다는 피드백이 확인됐다. 또한 crystal visual이 Landing CTA 외 화면에 반복되면 브랜드 accent가 제품 interaction과 경쟁한다.
- **Constraints**: 현재 auth, audio, analysis, recommendation, mixing, ticket, ownership와 admin 운영 기능은 회귀 없이 유지한다. 현재 API/DB에 없는 album art, lyrics, project, subscription 같은 데이터를 생성하지 않는다. shadcn/FSD와 semantic token 체계는 유지한다.
- **Decision**: 현재 구현 캡처는 기능·데이터·상태 계약 확인용으로만 사용하고 visual source로 사용하지 않는다. Landing, Login, Voice Scan, Voice Profile, Recommendation/Song Detail, Library/Mixing, Account와 Admin은 네 원본 디자인 보드의 composition, whitespace, flat sections, thin borders, typography hierarchy와 restrained accent를 우선해 재조립한다. Crystal asset은 Landing 하단 `Every voice has its song.` CTA에서만 렌더링하고 다른 모든 route에서는 제거한다. `/dev/svc`만 개발 도구 visual 예외로 유지한다.
- **Rationale**: 기능 보존과 시각 보존을 분리해야 원본 보드의 에디토리얼한 공간감과 제품 중심 interaction을 실제 화면에 반영할 수 있다. Crystal 사용처를 한 곳으로 제한하면 waveform·분석 데이터가 각 작업 화면의 시각적 중심으로 유지된다.
- **Consequences**: 기존 Page component의 wrapper, card grouping, section ordering과 content width는 호환성 대상이 아니다. route, action, data contract와 accessibility semantics가 유지되는 한 원본 보드에 맞춰 재배치할 수 있으며 Admin도 같은 시각 언어의 구현 범위에 포함된다.

## D035: 1672×941 최종 4보드가 legacy reference/V2를 대체 (2026-08-10)

- **Context**: T-F018-19 구현 중 사용자가 다시 첨부한 최종 네 장은 `Landing + Voice Scan`, `Library Vocal Profile + AI Mix`, `Analysis Detail + Account`, `Admin`을 한 화면군씩 보여 주는 `1672 × 941` 보드다. 프로젝트에 보관된 `1448 × 1086` 네 자산 및 generated V2와 구성·밀도·header/footer가 달라, legacy 자산을 계속 정본으로 사용하면 로컬 구현이 사용자 최종 레퍼런스와 다시 어긋난다.
- **Decision**: 2026-08-10 최종 `1672 × 941` 네 장을 최상위 visual source of truth로 고정한다. 기존 `docs/designs/assets/product-ui-redesign/`의 `1448 × 1086` 네 장과 generated V1/V2는 히스토리·gap 추적용 legacy 자료로 강등한다. 최종 보드의 외곽 번호/설명/presentation frame은 구현하지 않고 Copy Singer app frame 내부만 재현한다.
- **Implementation**: 제품 shell은 64px top header, 약 72rem 중앙 rail과 underline active navigation으로 맞춘다. Landing/Voice Scan, Library 두 탭, Analysis Detail, Account, Admin의 typography scale·table density·hairline·CTA 위치를 최종 보드 기준으로 재조립한다. ProductShell에는 Library 보드의 compact footer를 추가하고 Admin은 전용 운영 footer를 유지한다. Crystal은 Landing 하단 CTA 한 곳만 유지한다.
- **Evidence**: `pnpm run check` 통과(기존 Biome warning 60건), `pnpm test` 전체 통과, Storybook 36 files/93 tests, crystal exact usage가 Landing component/test-id에만 존재, 실제 Next Landing/Login 1280·768·360에서 horizontal overflow 0 확인.
- **Consequences**: 이후 F018과 후속 UI 작업에서 legacy 1448 보드나 generated V2가 최종 보드와 충돌하면 최종 1672 보드를 따른다. 기존 구현 화면의 spacing/card/table 구조를 다시 시각 기준으로 승격하지 않는다.

## D036: 공통 app chrome·Pretendard·violet audio UI와 crystal 완전 제거 (2026-08-10)

- **Context**: 최종 보드 구현 후 실제 사용 검수에서 Landing과 product route의 header/footer 간격·프로필 메뉴가 서로 달랐고, Account shortcut, TJ 번호, green waveform, 작은 본문 크기, 분석기 metadata, Recommendation/Mix 상태 표현 차이와 active Mixing Detail의 약한 진행 피드백이 확인됐다. 사용자는 crystal 장식을 최종적으로 제거하고 첨부 AI mixing 이미지를 진행 화면의 구조 reference로 지정했다.
- **Decision**: Landing·product·Admin은 동일 `ProductHeader`/`ProductFooter`를 사용하고 brand link는 항상 `/`로 이동한다. 로그인 사용자는 Landing에서도 동일 `UserMenu`와 실제 profile image를 사용하며 admin이면 중앙 navigation에 `Admin`을 노출한다. Crystal/prism은 전 제품 UI에서 제거한다. Pretendard를 기본 sans로 사용하고 pastel violet semantic token을 waveform·status·mixing progress에 일관되게 사용한다.
- **Implementation**: Account shortcut을 제거하고 사용자용 TJ/catalog 번호를 숨긴다. 생성일은 주요 목록에서 날짜+시간으로 표시하고 AI Mix search/select control 높이를 동일하게 맞춘다. Recorder는 Wavesurfer continuous waveform을 100ms timeslice로 갱신하며 violet token을 사용한다. Analysis Quality에서 analyzer metadata를 제거하고, Recommendation과 AI Mix는 공통 `MixingStatusBadge`를 사용한다. 완료된 추천 결과는 실제 mixing job id가 있으면 `/library/mixes/[id]`로 이동한다. Active Mixing Detail은 fake percentage 없이 실제 server timeline과 animated pastel gradient orb를 사용한다. Production의 `editorial-*`/`flat-surface`/`product-page*` global helper는 Tailwind utility로 이동하고 `globals.css`에는 token/base와 `/dev/svc` legacy helper만 남긴다.
- **Rationale**: app chrome과 interaction primitive를 한 구현으로 합쳐야 Landing과 product 간 drift를 막을 수 있고, 브랜드 색·상태·오디오 시각 언어가 동일해야 사용자가 분석→추천→믹싱 흐름을 하나의 제품으로 인지할 수 있다. 실제 backend 단계만 표시하면 시각적 피드백을 강화하면서도 존재하지 않는 진행률을 만들지 않는다.
- **Consequences**: D031/D034/D035의 crystal 유지와 Admin 전용 footer 부분은 D036이 대체한다. 이후 제품 UI에서 새로운 global component helper를 추가하기보다 Tailwind utility 또는 component-local 표현을 우선하고, `/dev/svc`만 기존 global helper 예외로 유지한다.

## D037: Recorder live waveform은 WaveSurfer render loop 대신 실제 microphone analyser를 사용 (2026-08-10)

- **Context**: D036에서 `RecordPlugin.continuousWaveform`을 활성화했지만 실제 `/profile` 녹음 중 사용자가 파형이 움직이지 않는 회귀를 재확인했다. WaveSurfer RecordPlugin은 내부적으로 짧은 analyser sample을 반복 `wavesurfer.load()`하는 방식이라 recorder UI의 live rendering을 플러그인 구현 세부에 의존하게 된다.
- **Decision**: RecordPlugin은 녹음·duration event·Blob 생성에만 사용한다. 권한 승인 시 `plugin.startMic()`이 반환한 실제 `MediaStream`을 동일 녹음에 재사용하고, 별도 `AudioContext → MediaStreamAudioSourceNode → AnalyserNode`에서 입력 amplitude를 읽어 component-local canvas에 그린다. 약 45ms마다 새 amplitude bar를 오른쪽에 추가하고, canvas 폭을 채운 뒤에는 가장 오래된 bar를 제거해 왼쪽으로 흐르게 한다.
- **Rationale**: 실제 녹음 스트림을 직접 샘플링하면 파형 표시가 WaveSurfer의 `load()`/duration/minPxPerSec 상태와 분리되어 브라우저에서 관찰 가능한 microphone signal 자체를 UI에 반영할 수 있다. 저장 오디오 player에는 기존 WaveSurfer를 그대로 유지하므로 재생 기능의 회귀 범위도 제한된다.
- **Evidence**: `pnpm run typecheck`, `pnpm run test:voice-scan` 12/12, VoiceScanInput Storybook 6/6 통과. Chromium에 `--use-file-for-fake-audio-capture=work/vocal-profile-guide.wav`를 사용해 실제 microphone API 경로를 실행했으며 350ms/850ms 시점의 canvas bitmap이 달라졌고(`waveformChanged: true`), 녹음 종료 후 `녹음 준비 완료`까지 확인했다.
- **Consequences**: D036의 `Wavesurfer continuous waveform 100ms` 구현 설명은 D037이 대체한다. live recorder canvas는 animation frame·AudioContext·source/analyser를 unmount/stream 교체 시 모두 정리해야 하며, WaveSurfer는 저장된 오디오 재생 용도로만 사용한다.

## D038: 디자인 reference 단일 SSOT와 generated/current artifact 제거 정책 (2026-08-10)

- **Context**: F018 진행 중 1448×1086 legacy reference, generated V2, current route screenshot, contact sheet, crystal runtime asset와 1672×941 최종 reference가 동시에 존재해 새 에이전트가 어떤 이미지를 정본으로 봐야 하는지 판단하기 어려워졌다. 문서 일부도 V2를 `채택 시안`으로 부르거나 crystal 재사용을 요구해 최신 결정과 충돌했다.
- **Decision**: 제품 visual reference는 `docs/designs/references/copy-singer/` 한 곳만 정본으로 사용한다. 최종 세트는 Landing+Voice Scan, Library, Analysis+Account, Admin 4보드와 Mixing Progress 1장이다. `docs/designs/assets/product-ui-redesign/`, `docs/designs/generated/page-redesigns/`, `docs/designs/page-redesign-analysis.md`는 legacy로 간주하고 신규 구현·리뷰에서 참조하지 않는다. current screenshot, generated concept, contact sheet는 repository에 새로 추가하지 않고 일회성 QA artifact로만 생성한다. `public/`에는 실제 runtime에서 참조되는 asset만 유지한다.
- **Rationale**: visual source가 하나여야 에이전트와 사람이 같은 화면을 기준으로 구현·검수할 수 있고, Git history가 이미 과거 시안의 archive 역할을 하므로 working tree에 중간 산출물을 중복 보관할 필요가 없다.
- **Implementation**: `docs/designs/README.md`, `product-ui-redesign.md`, `design-system.md`를 현재 reference 정책으로 갱신하고 legacy analysis/generated 문서는 deprecation stub으로 축소한다. crystal 규칙과 V2 `채택` 표현을 현재 정본에서 제거한다.
- **Consequences**: 이후 visual QA는 최종 reference 디렉터리와 실제 렌더 screenshot을 직접 비교한다. 과거 이미지가 working tree에 물리적으로 남아 있더라도 정본으로 사용하지 않으며, 삭제 가능한 로컬 파일 작업이 허용되는 도구에서 legacy binary를 제거한다.

## D039: Mixing Detail 기반 3단계 생성 퍼널과 선택형 상세 경로 (2026-08-10)

- **Context**: 실제 생성 여정은 Voice Scan 완료 후 Profile Detail, Recommendation List, Song Detail을 순서대로 방문한 뒤 Mixing을 시작하고도 현재 화면에 머물러 Library나 상태 링크를 다시 찾아야 한다. 각 화면의 page heading, processing state와 CTA도 서로 다른 composition을 사용한다.
- **Constraints**: saved profile, recommendation run, song detail과 mixing detail의 durable resource URL·ownership·polling은 보존한다. 분석·믹싱의 실제 server 상태보다 정밀한 percentage를 만들지 않는다. 추천 생성 API에는 idempotency 계약이 없으므로 분석 성공만으로 자동 생성하지 않는다.
- **Decision**: 생성 여정은 `목소리 분석 → 노래 추천 → AI 믹싱` 세 단계로 설명한다. Mixing Detail active story의 중앙 제목, restrained violet process visual, 실제 상태 timeline과 넓은 여백을 공통 visual language로 추출한다. 분석 완료는 같은 흐름에서 핵심 profile summary와 명시적 추천 CTA를 제공하고 Profile Detail은 선택 링크로 낮춘다. 추천 목록은 선택 panel/mobile Sheet에서 핵심 근거와 믹싱 CTA를 제공하며 Song Detail은 전체 근거 deep link로 유지한다. 믹싱 생성 성공 시 response job ID의 detail route로 즉시 이동한다.
- **Rationale**: 사용자가 생성 과정에서 반드시 거치는 화면을 다섯 단계에서 세 단계로 줄이면서도 저장 resource의 재방문성과 고급 분석 정보는 잃지 않는다. 자동 추천을 피하면 새로고침·복구 중 중복 run 위험 없이 사용자의 명시적 의사를 유지한다.
- **Trace**:
  - **T-F018-20**: `widgets/creation-funnel`에 공통 shell, journey stepper, process hero, 실제 상태 timeline과 action bar를 추가했다. Mixing Detail active와 Recommendation Results가 public API를 통해 widget을 실제 사용하며, Storybook에서 분석 active/success, 추천 선택과 믹싱 failure를 검증했다.
  - **T-F018-21**: Voice Scan active/error는 입력 form을 숨기고 공통 ProcessHero와 실제 분석 timeline만 표시한다. succeeded job은 localStorage에 유지해 reload 복구가 가능하며 같은 화면에서 핵심 VocalProfileSummary, 전체 분석 deep link와 명시적 추천 생성 CTA를 제공한다. CTA 성공 뒤에만 job key를 지우고 recommendation route로 이동한다.
- **Evidence**: T-F018-20 targeted Storybook 2 files/8 tests, mixing UI 8/8, recommendation ranking 10/10·presentation/UI 17/17. T-F018-21 voice scan 12/12, Analysis Status/Success Storybook 2 files/7 tests. 각 checkpoint `pnpm run check` 통과(error 0, 기존 Biome warning 59건, architecture 4/4).
- **Consequences**: `src/widgets/creation-funnel`이 domain-aware funnel composition을 소유하고 Shared는 범용 primitive만 제공한다. 상단 journey stepper와 server timeline은 서로 다른 의미로 표현한다. 기존 Profile/Song Detail URL은 삭제하거나 redirect하지 않으며 Library에서 그대로 접근할 수 있다.
