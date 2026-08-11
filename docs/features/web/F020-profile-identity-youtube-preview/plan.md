# Implementation Plan: profile-identity-youtube-preview

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F020
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-11
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Framework | Next.js 16 App Router, React 19 | 기존 server page·route handler와 client interaction 경계를 유지 |
| Persistence | Prisma/PostgreSQL migration | 프로필 이름·순번을 사용자 소유 데이터로 영속화하고 기존 데이터를 결정적으로 backfill |
| State | TanStack Query + 기존 fetch client | 이름 PATCH 후 목록·상세 cache를 일관되게 갱신 |
| Artwork | CSS layered gradients + inline SVG noise | 이미지 저장 없이 profile ID에 대해 안정적이고 다양한 cover 생성 |
| Video | YouTube privacy-enhanced iframe + click-to-load facade | 카탈로그 sourceVideoId를 재사용하고 목록 초기 player 비용을 제한 |

---

## 아키텍처

### 프로필 이름과 순번

```text
analysis persistence transaction
  ├─ User.nextVocalProfileNumber atomic increment
  ├─ allocated number = updated value - 1
  └─ VocalProfile { profileNumber, displayName: "보컬 프로필 N" }

VocalProfile detail
  └─ Rename action → PATCH /api/vocal-profiles/:id
       ├─ session + owner + USER source check
       ├─ trim / 1–40 character validation
       └─ update displayName → invalidate detail/history queries
```

- `User.nextVocalProfileNumber`를 row-level atomic increment해 동시 분석 완료에서도 중복되지 않는 번호를 할당한다.
- `VocalProfile.profileNumber`와 `displayName`은 SONG profile 호환을 위해 nullable DB column으로 추가하되 USER 생성 경로와 serializer는 값을 요구한다.
- migration은 각 사용자 USER profile을 `createdAt, id` 오름차순으로 `row_number()` backfill하고 사용자 counter를 `max(profileNumber)+1`로 맞춘다. `@@unique([userId, profileNumber])`로 중복을 방어한다.
- 사용자 지정 이름은 중복을 허용한다. identity는 ID와 순번이 담당하며, 이름 중복 금지는 불필요한 저장 실패와 suffix 정책을 만든다.

### 프로필 artwork

```text
profile UUID → stable integer hash
  ├─ palette index / hue offsets
  ├─ radial + conic + linear gradient positions
  └─ SVG feTurbulence noise overlay
       → VocalProfileArtwork (list + detail)
```

- hash 함수와 palette 계산은 pure entity lib으로 두어 Storybook·unit test에서 결정성을 검증한다.
- 이름이나 분석 값은 seed로 사용하지 않으므로 rename 이후 cover가 바뀌지 않는다.
- 장식 이미지는 `aria-hidden`; 프로필 이름이 accessible identity를 담당한다. reduced-motion을 위해 artwork에는 animation을 사용하지 않는다.

### YouTube source와 player

```text
Song.metadata.catalog.sourceVideoId
  → server validate (^[A-Za-z0-9_-]{11}$)
  → RecommendationItemResponse.sourceVideoId: string | null
  → YouTubeVideo
       ├─ facade: lazy thumbnail + 재생 button
       └─ active: youtube-nocookie.com/embed/:id?autoplay=0&playsinline=1
```

- source URL parsing을 client에 두지 않고 catalog의 canonical `sourceVideoId`만 응답한다.
- 공통 `YouTubeVideo`는 `facade`와 `player` variant를 제공한다. facade thumbnail은 lazy-load하고 iframe은 click 이후 생성한다.
- 목록 parent가 active item ID 하나를 관리해 동시에 하나의 iframe만 존재하게 한다. player/button 영역은 stretched row button보다 높은 stacking context를 갖고 이벤트 전파를 차단한다.
- 상세는 title header 직전 full-width 16:9 player를 배치하고 `safeRecommendationSourceUrl`과 외부 link UI를 제거한다. sourceUrl은 하위 호환을 위해 응답에 당분간 유지한다.
- embed 불가·연령 제한 영상은 YouTube player 자체 상태를 따르며, 유효 ID가 없는 fixture/data에는 중립 placeholder를 표시한다.

---

## 파일 구조

```
src/
├── app/api/vocal-profiles/[id]/route.ts        # GET/DELETE + owner-checked PATCH
├── entities/
│   ├── recommendation/
│   │   ├── model/contract.ts                   # nullable sourceVideoId
│   │   └── ui/youtube-video.tsx                # facade/player 공통 UI
│   └── vocal-profile/
│       ├── api/history.ts                      # displayName/profileNumber serialization
│       ├── api/persistence.ts                  # atomic number allocation
│       ├── lib/artwork.ts                      # UUID → deterministic visual tokens
│       ├── model/contract.ts                   # name/rename contracts
│       └── ui/vocal-profile-artwork.tsx        # grainy gradient cover
├── _pages/
│   ├── recommendation-detail/ui/recommendation-song-list.tsx
│   ├── song-detail/ui/song-detail.tsx
│   └── vocal-profile-detail/ui/                 # detail page + page-local rename action
└── widgets/library/ui/vocal-profile-library.tsx

prisma/
├── schema.prisma
└── migrations/*_vocal_profile_identity/
```

---

## 테스트 전략

- **단위 테스트**: profile name trim/length contract, UUID artwork token 결정성·분산, YouTube ID validation/embed URL, serializers와 rename ownership을 검증한다.
- **DB 테스트**: migration backfill, counter 증가, 삭제 후 번호 미재사용, 동시 생성 unique invariant와 SONG profile null 호환을 검증한다.
- **컴포넌트 테스트**: profile library/detail의 artwork·stored title·rename states, recommendation list의 facade/단일 iframe/row selection 분리, detail player·외부 link 제거를 Storybook interaction으로 검증한다.
- **통합 테스트**: Prisma generate/validate, 관련 Vitest/Storybook, architecture check, TypeScript·ESLint와 production build를 실행한다.
- **브라우저 QA**: 실제 DB profile 생성·rename·재접속, 추천 목록 영상 재생·다른 행 전환·상세 player를 desktop/mobile에서 확인한다.

## 호환성과 위험 관리

- migration 전 기존 USER profile의 제목은 계산형 presentation이었으므로 stored name backfill 후 화면 제목이 `보컬 프로필 N`으로 바뀐다. 분석 유형은 summary에 남긴다.
- 분석 job 재시도는 동일 recording profile을 먼저 조회하므로 이미 생성된 profile에 새 번호를 소비하지 않는다.
- YouTube 영상은 소유자가 embedding을 제한하거나 연령 제한할 수 있다. 앱은 추천 자체를 실패시키지 않으며 player가 제공하는 상태를 그대로 표시한다.
- YouTube thumbnail이 초기 네트워크 요청을 만들 수 있으나 iframe/player script는 사용자 재생 전 로드하지 않는다. autoplay는 활성화하지 않는다.
- Next.js image optimization domain 설정을 늘리지 않도록 facade thumbnail은 제한된 video ID로 만든 native lazy image를 사용하고 고정 aspect ratio로 layout shift를 막는다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
