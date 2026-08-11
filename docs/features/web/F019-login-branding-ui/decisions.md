# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D019: login-branding-ui 결정 (2026-08-11)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 로그인 composition과 브랜드 master 자산 경계 (2026-08-11)

- **Context**: 비로그인 header와 login page에 동일 목적 action과 설명이 반복되고, generic waveform icon·favicon이 제공된 헤드폰 mark와 일치하지 않는다.
- **Constraints**: Google OAuth/callback/session은 유지한다. 제공 bitmap을 project-bound logo로 가공하되 small icon에서도 식별되어야 하며 이미지 자체에 wordmark text를 합성하지 않는다.
- **Options**: 원본 white PNG 직접 crop, 새 SVG 수작업 재작성, ImageGen edit 후 transparent master와 deterministic favicon 파생.
- **Decision**: Image 2를 ImageGen edit target으로 사용해 transparent PNG master를 만들고 ProductMark가 이를 소유한다. 로그인 static composition은 logo/name/Google action으로 축소하고 runtime status만 조건부 유지한다.
- **Rationale**: 사용자 제공 mark의 질감과 palette를 보존하면서 공통 master에서 favicon을 파생하면 header/login/browser tab의 브랜드 drift를 막을 수 있다. OAuth 상태를 제거하지 않으면 최소 UI와 운영 가능성을 함께 유지한다.
- **Trace**:
  - **DOING 시작 시점**: 제공 자산은 simple opaque silhouette이라 built-in chroma-key removal 경로로 투명 master를 만들 수 있다고 판단했다. login reference는 Google button style reference로만 사용한다.
  - **DONE 전 확정 시점**: ImageGen edit가 정확히 five-bar 구성과 headphone silhouette을 유지했다. flat green key의 미세 편차는 스킬 helper의 soft matte/despill로 제거하고 alpha bbox 기준 18% padding crop 후 LANCZOS로 1024/180/64px을 파생했다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: 커밋 해시 또는 링크
  - **PR**: PR 링크
  - **Test/Log**: `tmp/imagegen/copy-singer-mark-qa.png`, ProductShell Storybook 4/4, RGBA asset audit 통과
- **Consequences**: public master는 header/footer/login UI가 공유하고 favicon/Apple icon은 같은 source를 사용한다. ImageGen built-in edit prompt와 결과 경로는 Feature 완료 보고에 남긴다.

## D002: 비로그인 header는 primary 로그인 action 하나만 제공 (2026-08-11)

- **Context**: desktop과 mobile header에서 같은 `/login?callbackURL=%2Fprofile`로 이동하는 `로그인`과 `무료로 시작하기`가 button hierarchy만 달리해 반복됐다.
- **Constraints**: Landing 본문의 제품 value CTA와 비로그인 product navigation의 개별 callback URL은 유지한다.
- **Options**: 로그인/무료 시작 두 action 유지, 무료 시작만 유지, primary 로그인 하나로 통합.
- **Decision**: desktop와 mobile Sheet 모두 primary `로그인` 하나만 제공하고 callback URL은 기존 profile entry를 유지한다.
- **Rationale**: 실제 auth provider와 목적지가 하나이므로 action label도 하나여야 하며, 로그인 page의 `구글로 시작하기`와 역할을 단계적으로 구분할 수 있다.
- **Trace**:
  - **DONE 전 확정 시점**: ProductHeader standalone Story에서 desktop/mobile 각각 login role button 1개와 `무료로 시작하기` 부재를 검증했다.
- **Evidence**:
  - **Test/Log**: ProductShell Storybook 6/6, auth navigation 5/5, targeted Biome/TypeScript 통과
- **Consequences**: Landing hero의 `무료로 시작하기`는 header auth action이 아니라 제품 CTA이므로 유지된다.

## D003: 로그인 UI는 server adapter와 정적 composition을 분리 (2026-08-11)

- **Context**: 기존 로그인 page 하나가 session redirect, safe callback, header navigation, 계정 설명, OAuth action과 상태를 모두 소유해 최소 UI 요구와 시각 테스트를 분리하기 어려웠다.
- **Constraints**: `safeCallbackURL`, 기존 session redirect, OAuth configured false·pending·runtime error 동작은 유지하고 정적 화면에서만 불필요한 문구를 제거한다.
- **Options**: 기존 server component에서 markup만 축소, 전체 page client component 전환, server adapter와 `LoginScreen` composition 분리.
- **Decision**: `LoginPage`는 callback/session/configuration을 처리하고 `LoginScreen`은 ProductBrand header와 중앙 ProductMark·Copy Singer·GoogleSignIn만 구성한다. Google action은 multicolor SVG icon과 outline button을 사용하며 중앙 LCP logo만 preload한다.
- **Rationale**: 인증 경계를 server에 유지하면서 표시 상태를 Storybook에서 독립적으로 검증할 수 있고, 조건부 운영 메시지는 보존하면서 static copy만 정확히 축소할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: header는 ProductBrand만 유지하고 `홈으로` action을 제거하며, 중앙 영역의 static node를 mark/name/action 세 종류로 제한했다.
  - **DONE 전 확정 시점**: desktop 및 390×844 browser QA에서 중앙 정렬, 335px button, 가로 overflow 없음과 console error 0을 확인했다. 중앙 mark의 LCP warning은 ProductMark의 opt-in preload로 해소했다.
- **Evidence**:
  - **Test/Log**: LoginScreen/ProductShell Storybook 8/8, auth navigation 6/6, `pnpm run check`, `pnpm run build`, in-app browser visual QA 통과
- **Consequences**: 로그인 시각 변경은 `LoginScreen` Story로 검증하고, callback/session 정책 변경은 server adapter 및 auth navigation test에서 별도로 검증한다.

## D004: 로그인 보조 안내는 비동작 text로 제공 (2026-08-11)

- **Context**: 구현 승인 checkpoint에서 사용자가 제목 아래 로그인 안내와 Google action 아래 약관·개인정보 동의 문구 추가를 요청했다.
- **Constraints**: 현재 제품에는 이용 약관·개인정보 처리방침 route가 없으며 존재하지 않는 목적지나 `#` link를 만들지 않는다.
- **Options**: 임시 link 생성, 일반 text만 표시, 첨부 reference처럼 문서명을 밑줄 강조한 비동작 text로 표시.
- **Decision**: `계속하려면 로그인하세요.`는 muted 14px로 제목 아래 배치하고 동의 문구는 12px·2행 보조 text로 button 아래 배치한다. `이용 약관`과 `개인정보 처리방침`은 밑줄로 강조하되 link semantics는 부여하지 않는다.
- **Rationale**: 요청한 시각 위계를 충족하면서 아직 없는 법률 문서 page로 잘못 이동시키거나 click 가능성을 기술적으로 가장하지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 기존 product footer에도 문서명만 있고 route가 없음을 확인해 text-only 경계를 유지했다.
  - **DONE 전 확정 시점**: 390×844에서 동의 문구가 읽기 쉬운 3개 시각 line으로 자연스럽게 줄바꿈되고, 1280px에서는 의도한 2행을 유지하며 양쪽 모두 horizontal overflow와 console error가 없음을 확인했다.
- **Evidence**:
  - **Test/Log**: LoginScreen Storybook 2/2, auth navigation 6/6, `pnpm run check`, `pnpm run build`, in-app browser desktop/mobile QA 통과
- **Consequences**: 실제 약관 route가 추가되면 강조 span을 접근 가능한 Link로 교체하고 destination별 navigation test를 추가해야 한다.
