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

## D002: 공개 SEO와 private noindex 경계 (2026-08-13)

- **Context**: production head audit에서 icon link는 정상이나 canonical, complete Open Graph fields, robots와 sitemap이 없었고 `public/og.png`는 이전 제품명 `Vocal Loom`과 현재 금지된 beige/orange artwork를 사용했다.
- **Constraints**: homepage와 공개 법률 문서는 검색 가능해야 하지만 인증 product route, login, admin, dev surface와 API는 index/crawl 대상이 아니어야 한다. preview/request host를 canonical origin으로 굳히지 않아야 한다.
- **Options**: request host 기반 metadata 유지, homepage metadata만 보강, robots.txt만 추가, canonical resolver와 public sitemap/private noindex를 함께 구축.
- **Decision**: `BETTER_AUTH_URL` → Vercel production URL → Vercel URL → local 순서의 canonical origin resolver를 shared server config에 두고 root/home/robots/sitemap이 공유한다. 홈은 complete OG/Twitter와 canonical을 소유하고 `/`, `/terms`, `/privacy`만 sitemap에 포함한다. product/login/admin/dev는 `noindex, nofollow`, robots.txt는 private/API path를 disallow한다. OG는 canonical mark path와 user-space gradient를 재사용한 SVG master에서 1200×630 RGB PNG로 파생한다.
- **Rationale**: request host는 preview/custom host에 따라 canonical이 흔들릴 수 있고 robots disallow만으로 이미 알려진 URL indexing을 막지 못한다. route-level noindex와 crawl disallow를 병행하고 sitemap을 allowlist로 유지하면 public/private 경계가 코드와 실제 output에서 검증 가능하다. OG generation을 기존 Sharp pipeline에 합치면 favicon과 같은 브랜드 색·geometry를 deterministic하게 유지한다.
- **Trace**:
  - **DOING 시작 시점**: `BETTER_AUTH_URL` 기반 canonical resolver를 robots/sitemap/home metadata가 공유하고, robots disallow와 private route `noindex, nofollow`를 함께 적용하는 방향으로 시작한다. OG는 새 mark를 재사용한 deterministic SVG→PNG로 교체한다.
  - **DONE 전 확정 시점**: production output에서 홈 canonical/OG/Twitter/icon 9 tags, login robots/googlebot noindex, robots.txt private disallow와 sitemap 공개 URL 3개를 확인했다. 최초 OG gradient가 path별 반복되는 문제는 `userSpaceOnUse`로 고쳐 canonical mark와 같은 연속 gradient로 맞췄다.
- **Evidence**:
  - **Commit**: `00227e1` (`feat(F023-waveform-brand-icon): metadata SEO와 Open Graph 동기화`)
  - **Test/Log**: `pnpm run test:brand-icons` 8/8, `pnpm run check`, `pnpm run build`, production metadata HTTP audit, `public/og.png` visual QA
- **Consequences**: production canonical 정확도는 배포 환경의 `BETTER_AUTH_URL` 또는 Vercel production URL 설정에 의존한다. 공개 route 추가 시 sitemap allowlist와 robots policy를 함께 갱신해야 하며 private route는 noindex metadata를 명시해야 한다.

## D003: Copysinger wordmark와 Paperlogy font scope (2026-08-13)

- **Context**: 사용자는 서비스명을 `Copysinger`로 붙여 쓰고 제공한 Paperlogy 7Bold를 사용하며 OG를 흰 배경 중앙형 logo/name/tagline composition으로 맞추길 요청했다.
- **Constraints**: 본문 Pretendard와 기존 layout은 유지하고 browser/UI wordmark와 committed OG가 같은 font bytes를 사용해야 한다. 외부 다운로드 경로는 runtime 의존성이 될 수 없다.
- **Options**: (A) Paperlogy를 전체 typography로 적용, (B) wordmark와 OG 제목에만 적용하고 본문 Pretendard 유지, (C) OG에만 outline/path로 변환.
- **Decision**: (B)를 채택했다. 제공 TTF의 exact bytes를 repository에 포함하고 `next/font/local`의 `--font-paperlogy` brand token과 OG generation의 embedded `@font-face`가 공유한다. 서비스명은 사용자-visible 문구와 metadata 전반에서 `Copysinger`로 통일한다.
- **Rationale**: brand 식별부에만 개성 있는 서체를 적용해 기존 본문 가독성과 layout을 보존한다. 같은 TTF를 UI와 deterministic raster pipeline이 사용하므로 browser와 공유 이미지 사이의 wordmark drift를 막는다.
- **Trace**:
  - **DOING 시작 시점**: TTF를 repository에 복사해 `next/font/local` brand variable과 Sharp SVG data font에 함께 사용하고, 서비스명 텍스트는 전역적으로 `Copysinger`로 동기화한다.
  - **DONE 시점**: production 계산값에서 Paperlogy 700 적용을 확인했고 OG를 흰색 1200×630 canvas 중앙에 작은 파형 mark, `Copysinger`, 정확한 tagline 순서로 확정했다.
- **Evidence**:
  - **Commit**: `630810c` (`feat(F023-waveform-brand-icon): Copysinger Paperlogy wordmark 적용`)
  - **Test/Log**: `pnpm run test:brand-icons` 8/8, Storybook 13/13, `pnpm run check`, `pnpm run build`, production browser metadata/font audit, deterministic font/OG SHA-256 비교
- **Consequences**: repository에는 사용자가 제공한 TTF가 포함된다. 제공 폴더에서 별도 license 문서는 발견되지 않았으므로 배포 권한 관리는 제공자의 font 사용 조건을 따른다.

## D004: 비상업적 운영과 음원 고지 범위 (2026-08-13)

- **Context**: 사용자는 Copysinger를 무료·비상업적 토이 프로젝트로 운영하며 이메일을 공개하지 않고, 추후 서비스 내 문의 기능을 별도 도입하기로 했다. 생성 결과의 허용 범위는 이번 문서에서 추가로 제한하지 않는다.
- **Constraints**: 개인정보 처리방침은 유지해야 하며 존재하지 않는 이메일·문의 기능이나 확인되지 않은 운영자·외부 처리 지역을 사실처럼 기재할 수 없다. 비상업성 고지는 음원 권리 이용허락을 대신한다고 표현해서는 안 된다.
- **Options**: 구현 중 확정
- **Decision**: 구현 중 확정
- **Rationale**: 구현 중 확정
- **Trace**:
  - **DOING 시작 시점**: 공통 draft 경고와 placeholder를 제거하고, 약관에는 현재 확정된 비상업적 운영·원본 음원 미제공·판매/광고/재배포/별도 AI 학습 미사용 사실만 명시한다. 개인정보 처리방침은 실제 화면상 삭제 기능을 권리 행사 방법으로 안내한다.
- **Evidence**:
  - **Test/Log**: 구현 후 기록
