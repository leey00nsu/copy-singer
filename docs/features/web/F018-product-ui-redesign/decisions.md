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
