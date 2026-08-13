# Implementation Plan: login-branding-ui

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F019
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-11
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Framework | Next.js 16 App Router, React 19 | 기존 Server Page redirect와 metadata 계약 유지 |
| UI | 기존 shadcn Button, Tailwind, ProductShell | 새 UI library 없이 F018 제품 문법 재사용 |
| Brand asset | ImageGen built-in edit → chroma-key 제거 → transparent PNG master | 제공 심볼의 시각 특성을 보존하고 project-bound 투명 자산 생성 |
| Image rendering | `next/image` 고정 intrinsic size | header/login에서 layout shift와 불필요한 원본 decode 방지 |
| Auth | 기존 Better Auth Google social client | provider·callback·session 계약 무변경 |

---

## 아키텍처

### 로그인 진입

```text
ProductHeader unauthenticated
  └─ primary 로그인 Link → /login?callbackURL=%2Fprofile

LoginPage (server)
  ├─ safeCallbackURL + existing-session redirect
  └─ LoginScreen
      ├─ header ProductBrand
      ├─ ProductMark + Copysinger + muted login guidance
      ├─ GoogleSignIn → authClient.signIn.social
      └─ Google login legal consent copy
```

- desktop/mobile header는 동일 callback URL의 `로그인` action 하나만 제공한다.
- `LoginPage`의 server redirect와 OAuth configured 값을 유지하고, 렌더 가능한 `LoginScreen` composition을 분리해 Storybook에서 정적·disabled 상태를 검증한다.
- 제품 기능 설명은 제거하되 짧은 로그인 안내와 약관 동의 문구를 보조 위계로 제공한다. `GoogleSignIn`의 pending, provider 미설정과 runtime error는 실제 상태이므로 유지한다.

### 브랜드 자산

- Image 1은 Google button의 spacing·outline·multicolor G 참고 이미지이며 edit target이 아니다.
- Image 2는 Copysinger mark의 edit target이다. built-in ImageGen으로 subject를 flat chroma-key 배경에 정리하고 스킬의 background removal helper로 transparent master를 만든다.
- 원본을 덮어쓰지 않고 `public/brand/copy-singer-mark.png`에 project master를 저장한다.
- master에서 `public/favicon.png`와 `public/apple-touch-icon.png`를 deterministic downsample해 같은 silhouette을 유지한다. alpha channel, transparent corner, subject coverage와 16/24/32px thumbnail을 검수한다.
- `ProductMark`가 master와 intrinsic size를 소유하고 `ProductBrand`, login composition이 이를 재사용한다. logo bitmap 자체에는 text를 넣지 않으며 accessible name은 `Copysinger` text가 담당한다.

### 공개 법률 문서

```text
LoginScreen legal consent
  ├─ 이용 약관 Link → /terms
  └─ 개인정보 처리방침 Link → /privacy

ProductFooter legal navigation
  ├─ 이용 약관 Link → /terms
  └─ 개인정보 처리방침 Link → /privacy

app/(public)/{terms,privacy}/page.tsx
  └─ _pages/legal public API → shared LegalDocumentLayout
```

- 문서 내용은 Prisma schema, Better Auth 설정, Leemage media lifecycle, Modal analyzer/mixing adapter와 사용자 삭제 route를 source evidence로 사용한다.
- 공통 layout은 ProductBrand header, document metadata, table/list/section typography와 상호 문서 navigation을 제공한다.
- 현재 저장소에 없는 사업자명·주소·연락처와 외부 처리 국가를 추정하지 않고 draft 확인 항목으로 표시한다.

---

## 파일 구조

```
src/
├── _app/layout/root-layout.tsx                 # PNG favicon metadata
├── _pages/login/ui/
│   ├── login-page.tsx                          # session/callback server adapter
│   ├── login-screen.tsx                        # 최소 로그인 composition
│   └── login-screen.stories.tsx                # configured/disabled UI
├── _pages/legal/
│   ├── index.ts                                 # public page API
│   └── ui/                                      # terms/privacy/shared document layout
├── features/authentication/ui/
│   ├── google-icon.tsx                         # multicolor Google brand glyph
│   └── google-sign-in.tsx                      # outline Google 시작 action
└── widgets/product-shell/ui/
    ├── product-brand.tsx                       # mark + Copysinger word label
    ├── product-mark.tsx                        # 공통 master image adapter
    └── product-shell.tsx                       # unauthenticated action 단일화

public/
├── brand/copy-singer-mark.png
├── favicon.png
└── apple-touch-icon.png
```

---

## 테스트 전략

- **단위 테스트**: auth navigation/static render 검사에서 desktop/mobile `로그인` 단일 action, callback URL, 제거 문구, Google label/icon과 runtime status 계약을 고정한다.
- **컴포넌트 테스트**: ProductShell과 LoginScreen Storybook에서 비로그인 header, central logo/name/guidance/button/legal copy, configured false 상태와 focusable Google action을 검증한다.
- **자산 검증**: master/favicons의 PNG signature, dimensions, alpha channel, transparent corner, nonempty subject coverage를 검사하고 16/24/32px contact sheet를 눈으로 확인한다.
- **통합 테스트**: `pnpm run check`, 관련 Storybook, auth navigation, production build로 route/metadata 경계를 검증한다.
- **브라우저 QA**: `/` 비로그인 header와 `/login`을 mobile/desktop에서 확인하며 duplicate CTA, overflow, console error와 favicon request를 검수한다.
- **법률 route QA**: `/terms`, `/privacy` public route, login/footer Link, heading·table responsive overflow와 문서 간 navigation을 검증한다.

## 호환성과 위험 관리

- Landing 본문의 primary CTA는 제품 value CTA이므로 이번 header 단일화와 별개로 유지한다.
- Google icon은 장식으로 처리하고 button label이 접근 가능한 이름을 제공한다.
- 16px favicon에서 내부 five-bar detail이 뭉개지면 원본 구성을 바꾸지 않고 crop/padding과 downsample filter만 조정한다.
- ImageGen edit가 헤드폰 또는 bar 수·palette를 바꾸면 한 번의 targeted correction을 수행하고 다시 검수한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
