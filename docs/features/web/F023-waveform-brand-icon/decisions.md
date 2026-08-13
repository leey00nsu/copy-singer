# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D023: waveform-brand-icon 결정 (2026-08-13)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: waveform-brand-icon 결정 (2026-08-13)

- **Context**: 기존 1024px app mark는 AI 생성 bitmap이라 작은 icon에서 geometry와 edge가 일관되지 않고, 사용자는 제공한 32×32 일곱 막대 SVG에 브랜드 gradient를 적용한 교체를 요청했다.
- **Constraints**: 제공 SVG의 막대 수·좌표·높이 순서를 보존하고, ProductMark의 sizing/preload/장식 접근성 및 64px favicon·180px apple touch metadata 계약을 유지해야 한다.
- **Options**: 기존 PNG를 수동 보정, SVG를 CSS mask로 색칠, CSS runtime token을 SVG에서 참조, 고정 sRGB gradient를 가진 SVG master와 deterministic PNG 파생.
- **Decision**: 사용자 제공 path를 그대로 둔 32×32 SVG에 drawable bounds 기준 `userSpaceOnUse` 좌→우 gradient(`#7e41ed` → `#3678e6` → `#cd69c6`)와 `shape-rendering="crispEdges"`를 적용한다. ProductMark는 SVG를 직접 사용하고 Sharp 0.35.3 생성기로 기존 크기의 PNG favicon을 파생한다.
- **Rationale**: 고정 sRGB는 CSS load/theme 및 rasterizer별 OKLCH 해석 차이를 없애고, 하나의 user-space gradient는 path별 색 반복을 방지한다. crisp edge snapping은 geometry 수정 없이 16px에서 bar와 gap을 각각 1px 단위로 분리한다. 생성기를 저장소에 두면 favicon 변경 drift를 자동 검사할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 전체 path에 `userSpaceOnUse` 좌→우 gradient를 한 번 적용한 SVG를 canonical master로 두고, 동일 SVG에서 PNG를 deterministic rasterize하면 geometry drift 없이 UI와 browser icon을 동기화할 수 있다고 판단했다.
  - **DONE 전 확정 시점**: 최초 16px raster test가 antialiasing으로 중앙 행의 막대를 한 덩어리로 감지했고, `crispEdges` 적용 후 7개 occupied run과 사이 투명 column을 확인했다. 16·24·32·64·180px contact sheet와 Storybook header/login에서 light/dark 대비 및 24×24 layout을 확인했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: `0c64f22` (`feat(F023-waveform-brand-icon): 벡터 파형 app mark와 파생 아이콘 적용`)
  - **Test/Log**: `pnpm run test:brand-icons` 4/4, 관련 Storybook 9/9, `pnpm run check`, `pnpm run build`, `/tmp/copy-singer-waveform-icon-contact-sheet.png`
- **Consequences**: 기존 AI bitmap master는 제거되고 SVG와 두 PNG의 색상은 light/dark theme에서 동일하다. 색상 변경 시 SVG stop을 갱신하고 generation script를 다시 실행해야 하며 asset test와 hash 비교가 동기화를 검증한다.
