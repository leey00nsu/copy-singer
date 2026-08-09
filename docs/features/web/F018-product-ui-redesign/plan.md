# Implementation Plan: product-ui-redesign

> 승인된 spec의 구현 경계, FSD 소유권, route·데이터 흐름과 검증 방법을 정의합니다.

---

## 개요

- **기능 ID**: F018
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved
- **DB migration**: 없음
- **새 UI library**: 없음
- **배포·CI 변경**: 없음

F018은 현재 동작하는 제품 계약 위에 공통 Design System과 사용자용 app shell을 적용하고, 기존 화면을 Landing → Voice Scan → Voice Profile → Song Match → Song Detail → AI Mixing → Library 흐름으로 재조립한다. 데이터 모델에 없는 기능을 mock으로 완성하지 않으며, route 이동과 UI 변경 중에도 auth ownership, durable job, Query polling, private media proxy와 ticket semantics를 보존한다.

---

## 현재 기준선

| 영역 | 현재 구현 | F018 목표 |
| --- | --- | --- |
| `/` | 로그인 필수 `VocalProfileWorkbench` | 인증 없이 보는 product landing |
| `/login` | Google OAuth, emerald radial Card | Google-only 한 열 entry 화면 |
| 전역 navigation | Root Layout의 우상단 fixed `UserMenu` | private route group의 persistent responsive product shell |
| `/profile` | 녹음·업로드·분석·결과가 한 workbench | Voice Scan과 실제 job 기반 Analyzing, 성공 후 profile detail 이동 |
| `/vocal-profiles` | 저장 프로필 Card grid | 평면 list 중심 profile library view |
| `/vocal-profiles/[id]` | 모든 분석을 같은 위계로 표시 | 핵심 summary 후 chart·quality·reference 세부 정보 |
| `/recommendations/[id]` | 100개의 큰 Card와 각 행 audio | table/list, search·sort·filter, 행 단위 핵심 정보 |
| Song Detail | 없음 | 저장 recommendation item 기반 상세 route |
| `/mixing-history` | Card 목록과 inline player | Library의 AI Mix tab과 호환 목록 |
| Mixing Detail | owner-scoped GET API만 존재 | 실제 status polling과 result detail route |
| `/account` | 사용자·ticket·ledger Card | product shell 안의 flat account/settings 정보 |
| 상태 UI | route/component별 문구와 모양 | 공통 state language와 route loading/error/not-found |

확인된 계약:

- 보컬 분석기는 5초 이상을 허용하고 60초를 초과하면 정리 동의를 요구한다. 10초는 디자인상의 권장 목표이며 새 validation 최소값이 아니다.
- recommendation response는 100개 item, score, recommended semitone shift, reasons와 mixing state를 제공한다.
- recommendation response에는 곡 vocal range가 없지만 `Song.vocalProfile`에 저장되어 있어 additive contract 확장이 가능하다.
- mixing detail GET과 owner guard는 있지만 browser Query, detail page와 직접 delete/cancel API는 없다.
- album artwork, genre, difficulty, lyrics, licensed preview, playlist, favorite, project, subscription model은 없다.

---

## 기술 스택

| 구분 | 선택 | 적용 방식 |
| --- | --- | --- |
| Framework | Next.js 16.3 App Router, React 19.2 | route group layout, async params/searchParams, Server Component 기본 |
| Architecture | Feature-Sliced Design | root `app/`은 adapter, `src/_app`·`src/_pages`·widgets·features·entities·shared가 구현 소유 |
| Styling | Tailwind CSS 4.2, shadcn 4.16 token | `globals.css` token과 공통 primitive를 수정하고 page raw color를 축소 |
| Primitive | `@base-ui/react` 1.7, CVA | 기존 `base-nova` 방식으로 필요한 shadcn primitive 추가 |
| Server state | TanStack Query 5.101 | recommendation/mixing/vocal job의 기존 key·polling 정책 재사용 |
| Audio | WaveSurfer 7.12, `@wavesurfer/react` | recorder와 공통 player를 재구성하고 media cleanup 보존 |
| Charts | Recharts 3.8, shadcn Chart | 기존 descriptor와 accessibility layer 보존 |
| Validation | Zod 4.4 | recommendation/mixing response와 filter query 검증 |
| Component QA | Storybook 10.5, Vitest browser, a11y addon | 공통 상태와 responsive variant를 story·browser test로 검증 |

새 runtime dependency를 추가하지 않는다. ElevenLabs UI package를 설치하지 않고 live waveform, scrubber와 explicit state model의 공개 패턴만 현재 WaveSurfer/Base UI 구조에 맞게 적용한다.

---

## 아키텍처

### 1. Design System과 shadcn registry

역할을 다음처럼 고정한다.

```text
docs/designs/design-system.md                 의미와 사용 규칙
docs/designs/product-ui-redesign.md           F018 visual brief와 원본 보드
src/_app/styles/globals.css                   실제 semantic token 값과 전역 base
src/shared/ui                                 primitive·공통 상태 component 계약
src/**/*.stories.tsx                          실행 가능한 variant·상태 예시
docs/features/web/F018-*/decisions.md         예외와 변경 이유
```

`components.json`의 오래된 `app/globals.css`, `@/components/ui`, `@/lib/utils` alias를 실제 FSD 경로로 교정한 뒤 Tabs, Dialog, Sheet, DropdownMenu, Input, Select와 Skeleton을 현재 shadcn/Base UI 방식으로 추가한다. generator 결과는 kebab-case slice와 `index.ts` public API로 정리하며 `src/shared/ui` 밖에 생성된 파일이 없는지 확인한다.

Global token 변경:

- background/card를 white·warm gray의 낮은 chroma로 변경
- primary를 black 계열, focus ring을 고대비 neutral로 변경
- lavender/blue data accent와 green success를 의미 기반으로 제한
- body의 orange/purple radial gradient와 glass background 제거
- radius를 낮추고 기본 Card shadow 제거
- 기존 dark token은 깨뜨리지 않되 public theme toggle을 추가하지 않음
- legacy `.page-shell`, `.site-header`, `.audio-card` 계열은 새 component 전환 후 사용처 0건을 확인하고 제거

### 2. App Router route group과 persistent shell

Next.js layout은 navigation 사이에서 보존되므로 사용자용 route를 `(product)` group 아래로 이동한다. route group 이름은 URL에 포함되지 않는다.

```text
app/
├── layout.tsx                                  Root providers·metadata만
├── (public)/
│   ├── page.tsx                                /
│   └── login/page.tsx                          /login
├── (product)/
│   ├── layout.tsx                              authenticated product shell
│   ├── loading.tsx
│   ├── error.tsx
│   ├── profile/page.tsx
│   ├── vocal-profiles/{page,[id]/page}.tsx
│   ├── recommendations/[id]/
│   │   ├── page.tsx
│   │   └── songs/[itemId]/page.tsx
│   ├── library/
│   │   ├── page.tsx
│   │   └── mixes/[id]/page.tsx
│   ├── mixing-history/page.tsx                 기존 URL 호환
│   └── account/page.tsx
├── admin/page.tsx                              기존 운영 화면 유지
├── dev/svc/page.tsx                            기존 진단 화면 유지
└── api/                                        URL 변경 없음
```

- Root Layout은 Query/Tooltip/Toaster/font와 metadata만 소유하고 request session 조회와 fixed `UserMenu`를 제거한다.
- Product Layout은 `requirePageSession`으로 보호한 뒤 session/user/admin 정보를 `ProductShell`에 전달한다.
- `src/widgets/product-shell`은 desktop sidebar, mobile Sheet navigation, active route, user menu와 content rail을 조립한다. pathname을 읽는 작은 Client Component만 client boundary로 둔다.
- `/admin`은 product로 돌아가는 링크와 기존 sign-out 접근을 자체 화면에서 유지한다.
- `/dev/svc`는 별도 진단 layout을 유지하고 product shell로 감싸지 않는다.

### 3. Public Landing과 Google Login

`src/_pages/home`은 `src/_pages/landing`으로 역할을 명확히 변경한다.

- Landing Server Page는 optional session을 읽어 CTA를 `/login` 또는 `/profile`로 연결한다.
- 제품 설명은 실제 분석 → 100곡 추천 → 선택형 AI 믹싱만 사용한다.
- 디자인 보드의 prism은 product asset으로 복사하지 않고 CSS/audio motif와 실제 waveform 중심으로 구성한다.
- Hero는 reference처럼 copy와 circular audio visual의 균형을 맞춘다. waveform bar는 서로 다른 delay·duration·amplitude로 반복 움직이고, microphone 뒤의 복수 ring은 scale과 opacity를 조합해 바깥으로 확산되도록 한다.
- microphone은 `primaryHref`를 사용하는 실제 Link action이며 focus-visible과 accessible label을 제공한다. 모든 decorative motion은 `prefers-reduced-motion`에서 정지하고 CTA 의미는 유지한다.
- mobile에서는 제목·여백·visual 크기를 줄여 360×800 첫 viewport 안에 copy, primary CTA와 microphone action이 함께 들어오도록 한다.
- Login의 safe callback 검증은 유지하고 기본 callback을 public `/`가 아닌 `/profile`로 변경한다.
- Google OAuth만 표시하고 configured/disabled/error 상태를 기존 `GoogleSignIn`으로 유지한다.

### 4. Voice Scan과 Analyzing

기존 `VocalProfileWorkbench`를 다음 책임으로 분리한다.

```text
VocalProfileWorkbench
├── VoiceScanInput
│   ├── VocalProfileRecorder
│   ├── upload input
│   └── prepared audio preview
├── AnalysisStatus
└── LongAudioDialog
```

- recorder state를 `idle → requesting_permission → recording → stopping → ready | error`로 명시한다.
- 10초를 권장 marker로 표시하되 5초 이상이면 분석을 허용하고 60초에서 자동 종료한다.
- permission denied는 browser 설정 안내와 upload 대안을 제공한다.
- WaveSurfer Record plugin, progress callback, stream/plugin/Blob URL cleanup을 유지한다.
- upload 25MB, long audio trim/compress, idempotency key와 localStorage job recovery를 유지한다.
- analysis는 실제 `pending`, `processing`, retry waiting, failed, succeeded만 표시하고 임의 percentage를 만들지 않는다.
- 성공한 job의 `vocalProfileId`로 `/vocal-profiles/[id]`에 이동하고 관련 Query를 invalidate한다.
- workbench 안의 전체 result와 recommendation action은 profile detail로 이동해 Voice Scan을 한 작업에 집중시킨다.

### 5. Voice Profile presentation

`src/entities/vocal-profile/lib/presentation.ts`에 observed/practical range, median, voiced ratio, pitch stability, clipping과 RMS를 입력받는 순수 mapper를 둔다. 출력은 데이터로 설명 가능한 중립적 profile label, 최대 3개 trait와 quality presentation이다.

`Warm Tenor`, 성별, 건강, 장르 적합도처럼 현재 descriptor로 증명할 수 없는 label은 만들지 않는다. `넓은 실용 음역`, `안정적인 음정`, `입력 음량 보완 필요`처럼 측정값의 의미를 직접 설명하고 threshold·fallback·결정성을 단위 테스트로 고정한다.

Profile Detail 위계:

1. profile label, practical/observed range, median, stability와 recommendation CTA
2. source waveform과 핵심 metric
3. range/histogram/pitch trace
4. reference band, recording quality와 analyzer metadata

기존 chart descriptor, null pitch gap, source Range proxy, reference 재생과 삭제 기능을 유지한다. Profile history는 desktop row/mobile stacked row로 바꾸고 analysis job row를 같은 상태 언어로 표시한다.

### 6. Song Match list

Recommendation run은 100개 item을 이미 한 번에 반환하므로 새 server pagination 없이 browser에서 검색·정렬·필터한다.

```text
recommendationDetailQueryOptions(runId)
        ↓ shared Query cache
RecommendationResults
        ↓ presentation selector
search(title, artist)
filter(score band, recommended shift, mixing status)
sort(rank, adjusted score, original score, title)
        ↓
desktop semantic table / mobile stacked rows
```

- filter state는 URL query에 직렬화해 back/forward와 공유 가능한 상태를 제공하되 database 재조회는 하지 않는다.
- row에는 rank, title, artist, 정수 적합도, recommended shift와 mixing status를 우선 표시한다.
- desktop row는 56–72px 수준의 compact comparison density를 목표로 하고 reason·TJ·원키 세부 정보는 Song Detail로 넘긴다. table은 shell content 폭이 충분한 `xl` 이상에서만 사용한다.
- mobile은 검색·정렬·필터 요약만 상단에 두고 score·shift·mixing status 조건은 Sheet로 옮겨 첫 viewport에서 첫 추천 곡을 확인할 수 있게 한다.
- 목록의 반복 검은 CTA는 제거하고 제목/행 상세 진입을 주 interaction으로, mixing은 secondary action 또는 Song Detail 책임으로 낮춘다.
- 100개 row마다 waveform을 생성하지 않고 audio player는 detail 또는 expanded result에만 mount한다.
- 기존 mixing mutation, idempotency, Query invalidation과 5초 polling을 유지한다.
- recommendation 삭제는 native confirm 대신 공통 Dialog를 사용하되 기존 cleanup 의미를 보존한다.

### 7. Song Detail과 recommendation contract 확장

새 route는 `/recommendations/[id]/songs/[itemId]`다.

- Server Page가 session, run ownership과 item 포함 여부를 확인하고 잘못된 주소는 `notFound()`로 처리한다.
- `RecommendationRunResponse.items[]`에 nullable `songProfile`과 nullable `originalKey`를 additive field로 추가한다.
- serializer는 `Song.vocalProfile`의 observed/practical range와 median을 선택한다.
- song profile이 없거나 불완전하면 unavailable state를 표시하고 값을 추정하지 않는다.
- client detail은 목록과 같은 `recommendationKeys.detail(runId)` cache/polling을 사용한다.

표시 정보:

- 곡/아티스트/TJ 순서와 외부 source link
- 사용자와 곡의 practical/observed range
- original/adjusted score, semitone shift와 structured reasons
- overlap/excess/confidence breakdown의 사용자 친화 요약
- ticket 비용을 명시한 AI 믹싱 CTA와 실제 status/result

앨범 art, genre, difficulty, lyrics와 in-app preview는 표시하지 않는다. `sourceUrl`은 존재할 때 외부 출처 링크로만 제공한다.

### 8. Library, Mixing Detail과 terminal result 삭제

`/library`는 새 Project model이 아니라 현재 사용자 소유 resource의 탐색 entry다.

- `보컬 프로필` tab: saved profile와 active/failed analysis job
- `AI 믹싱` tab: persistent mixing job과 result
- `tab`, `page`, `q`, `status`는 URL search param으로 유지
- mixing search는 title/artist, status filter는 실제 DB field를 사용하도록 `getMixingHistory`와 `/api/mixing-jobs`를 확장
- profile tab은 이름 없는 profile에 가짜 project title을 만들지 않고 날짜·음역·상태로 표시
- profile과 mixing row는 desktop 72–104px 범위의 compact density를 목표로 하고 mobile metric은 2열 definition grid로 구성한다.
- tab trigger는 content 폭 기반 좌측 정렬을 사용하며 profile total·최신순을 실제 history metadata에서 표시한다.
- mixing 목록은 상태별 핵심 action 하나만 노출하고 waveform·download·delete는 detail에 유지한다. 실패 detail은 presentation mapper로 안전한 사용자 문구로 변환하고 raw 외부 오류는 노출하지 않는다.
- 기존 `/vocal-profiles`, `/mixing-history`는 같은 list widget을 사용해 URL을 유지하고 primary navigation만 `/library`로 통합

`/library/mixes/[id]`는 기존 owner-scoped `GET /api/mixing-jobs/[id]`를 사용한다.

- `mixingHistoryRowSchema`를 detail payload로 재사용하고 `mixingJobKeys.detail(id)` Query를 추가한다.
- active status일 때만 5초 polling하고 terminal state에서 중지한다.
- timeline은 실제 `pending/preparing → submitted → processing → succeeded`만 표현한다.
- resultReady일 때 waveform player와 download를 표시한다.
- failed/canceled는 사용자 문구와 관련 recommendation/profile 이동을 제공한다.

Terminal mixing job 삭제를 새로 지원한다.

- `DELETE /api/mixing-jobs/[id]`는 owner와 UUID를 검증한다.
- `SUCCEEDED`, `FAILED`, `CANCELED`만 허용하고 active job은 `409 MIXING_ACTIVE`로 거부한다.
- result asset 관계를 해제하고 `deleteOrScheduleMediaAsset`로 외부 삭제 또는 cleanup queue를 사용한 뒤 job을 삭제한다.
- ticket ledger는 기존 `onDelete: SetNull`로 보존한다.
- reference, catalog target, vocal profile와 recommendation item은 삭제하지 않는다.
- active Modal cancellation은 worker protocol이 없으므로 F018 범위에 포함하지 않는다.

### 9. Account와 공통 상태

Account는 기존 server-side account/ticket query를 유지하고 product shell 안에서 사용자 정보, Google 계정, ticket balance/ledger, Library와 admin 링크로 재배치한다. notification, theme, password 또는 subscription setting을 만들지 않는다.

공통 `StatePanel`과 `PageSkeleton`을 `src/shared/ui`에 추가한다. Route-level `loading.tsx`는 layout shift가 작은 skeleton, `error.tsx`는 Client Component `retry()`, dynamic detail의 `not-found.tsx`는 안전한 상위 route를 제공한다. polling 오류는 마지막 유효 데이터를 숨기지 않고 인접 상태로 표시한다.

---

## FSD 소유권과 파일 구조

```text
src/
├── _app/
│   ├── layout/{root-layout,product-layout}.tsx
│   └── styles/globals.css
├── _pages/
│   ├── landing/
│   ├── login/
│   ├── profile/
│   ├── vocal-profiles/
│   ├── vocal-profile-detail/
│   ├── recommendation-detail/
│   ├── song-detail/
│   ├── library/
│   ├── mixing-history/
│   ├── mixing-detail/
│   └── account/
├── widgets/
│   ├── product-shell/
│   ├── vocal-profile-workbench/
│   └── library/
├── entities/
│   ├── vocal-profile/lib/presentation.ts
│   ├── recommendation/{lib/presentation.ts,model/contract.ts}
│   └── mixing-job/{api,lib/presentation.ts,model/contract.ts}
└── shared/ui/
    ├── dialog/
    ├── dropdown-menu/
    ├── input/
    ├── select/
    ├── sheet/
    ├── skeleton/
    ├── state-panel/
    └── tabs/
```

- Page slice는 다른 Page slice를 import하지 않는다.
- Library와 legacy history Page가 공유하는 composition은 `widgets/library`가 소유한다.
- domain presentation mapper와 contract는 각 Entity가 소유한다.
- action/mutation은 기존 Feature public API를 사용한다.
- server DB/media 접근은 `index.server.ts`, browser schema/query는 `index.ts` 또는 `index.model.ts`로 분리한다.
- root `app/`은 re-export와 async params 전달만 담당하며 architecture boundary test를 통과한다.

---

## API와 데이터 계약 변경

### 변경

| API/계약 | 변경 |
| --- | --- |
| `GET /api/recommendations/[id]` | item에 nullable song vocal range/original key descriptor 추가 |
| `GET /api/mixing-jobs` | 선택적 `q`, `status`, `page` filter 추가, 기존 기본값 유지 |
| `GET /api/mixing-jobs/[id]` | 기존 payload를 명시적 Zod detail Query에서 사용 |
| `DELETE /api/mixing-jobs/[id]` | terminal owner job과 result asset cleanup 지원 |

### 변경하지 않음

- PostgreSQL schema와 migration
- auth provider, session·owner 정책
- vocal analysis multipart request와 25MB/5–60초 계약
- Modal analyzer/mixer, worker state transition과 Coolify process 구성
- ticket debit/refund 규칙
- private audio Range proxy URL과 storage URL 비노출
- recommendation scoring algorithm과 저장값
- `quality.yml` 연기 상태

기존 response field는 삭제·rename하지 않고 additive field만 추가한다. 새 query param을 생략한 기존 호출은 현재 pagination과 같은 결과를 반환한다.

---

## 반응형·접근성 기준

| Viewport | Navigation | 목록 | 상세/차트 |
| --- | --- | --- | --- |
| 360px mobile | Sheet/compact header | stacked row, 핵심 값 2–3개 | 한 열, control 우선, 수평 잘림 없음 |
| 768px tablet | compact sidebar 또는 Sheet | 열 축소와 filter Sheet | 중요도에 따라 1–2열 |
| 1280px desktop | persistent sidebar | semantic table/flat row | max 1200px rail, summary/detail 분리 |

- icon-only action은 accessible name과 충분한 touch target을 갖는다.
- focus-visible을 모든 primitive에서 유지한다.
- async state는 필요한 경계에서만 `aria-live`로 알리고 polling마다 반복 발표하지 않는다.
- chart는 label/tooltip/accessibility layer, waveform은 별도 텍스트 시간·상태를 제공한다.
- `prefers-reduced-motion`에서 decorative motion을 제거하고 상태 의미는 유지한다.

---

## 테스트와 검증

### 단위·contract

- vocal presentation mapper threshold, fallback과 결정성
- recommendation search/filter/sort와 score/shift presentation
- mixing status timeline, active polling과 terminal state
- 5초 허용·10초 권장·60초 auto-stop helper
- additive recommendation song profile Zod payload
- mixing filter query와 terminal delete response/error schema

### 기존 회귀

- recorder permission/end cleanup과 long audio trim
- profile history/detail, chart와 reference player
- recommendation load/filter/mixing mutation/polling/result
- mixing history/detail/delete와 media cleanup
- login callback, auth ownership와 account ledger
- FSD public API, Client/Server graph와 root App adapter

### Storybook

- ProductShell desktop/mobile/active navigation
- StatePanel의 empty, permission, loading, retry, error, success
- Voice Scan idle, recording, ready, permission error, disabled
- Profile summary/chart detail
- Recommendation table/mobile row/empty filter result
- Song Detail과 mixing active/success/failure
- Mixing timeline/result detail
- Dialog, Sheet, Tabs와 filter control

각 story는 필요한 QueryClient/MSW handler를 자체 제공하고 a11y addon error를 0건으로 유지한다.

### 실제 브라우저 QA

1. public landing → Google login 진입
2. microphone permission 거부와 upload 대안
3. 5초 이상·약 10초·60초 녹음 표시와 분석 복구
4. profile summary/detail/audio/chart
5. 100곡 search/filter/sort와 Song Detail
6. AI mixing 접수·polling·result와 Library 재접속
7. terminal result delete와 ticket ledger 보존
8. Account, Admin, dev SVC 회귀
9. 360×800, 768×1024, 1280×800에서 overflow, focus와 CTA

Screenshot은 디자인 보드와 정보 위계·spacing·상태 구조를 비교하는 증거로 사용하되 픽셀 동일성을 acceptance로 삼지 않는다.

### 실행 명령

```bash
pnpm run check
pnpm run test:vocal-profile-history
pnpm run test:recommendation
pnpm run test:recommendation:db
pnpm run test:mixing:ui
pnpm run test:mixing:db
pnpm run test:query
pnpm run test:auth:db
pnpm run test:tickets
pnpm run test:architecture-boundaries
pnpm run test:storybook --run
pnpm run build-storybook
pnpm test
```

DB 또는 external service가 필요한 검사는 기존 skip/mock 정책을 유지한다. Modal GPU나 실제 외부 OAuth를 자동 테스트에서 호출하지 않는다.

---

## 구현 순서

1. 디자인 자산·Design System·`components.json`과 token을 동기화하고 공통 primitive/state UI를 준비한다.
2. `(public)`·`(product)` layout과 ProductShell을 만들고 Landing/Login/navigation을 전환한다.
3. Voice Scan을 입력·권한·분석 상태로 분리하고 성공 시 profile detail 이동을 적용한다.
4. vocal presentation mapper와 Profile list/detail 정보 위계를 재구성한다.
5. Recommendation list를 table/mobile row, search·sort·filter로 바꾼다.
6. recommendation response에 song profile을 추가하고 Song Detail route를 구현한다.
7. Library와 mixing filters/detail Query, terminal delete·media cleanup을 구현한다.
8. Account, legacy route, Admin/dev 회귀와 route 상태 화면을 정리한다.
9. Storybook state matrix와 targeted test를 추가하고 browser responsive QA를 수행한다.
10. 전체 quality/build/test를 통과시키고 Design System·Feature docs·workflow evidence를 동기화한다.

각 단계는 tasks.md의 순차 task와 commit checkpoint로 분리한다. 기존 기능을 test로 고정한 뒤 presentation을 교체한다.

---

## 위험과 대응

| 위험 | 대응 |
| --- | --- |
| route group 이동 중 URL/auth callback이 깨짐 | URL contract와 callback/private returnTo를 검증 |
| global token이 Admin/dev 화면을 훼손 | semantic token 사용과 두 제외 화면 smoke·contrast 확인 |
| 100곡 table이 느려짐 | waveform 미생성, memoized selector, run Query 1개 유지 |
| list/detail mixing state가 갈라짐 | 동일 Query key와 invalidate/polling policy 공유 |
| song range를 UI에서 추정 | 저장된 `Song.vocalProfile`만 nullable response로 노출 |
| 10초 디자인이 기존 계약을 막음 | 10초는 권장, 5초 이상 허용, 60초 제한 test 유지 |
| terminal 삭제가 worker와 경합 | terminal 상태 조건, active 409, asset detach와 cleanup queue |
| Library가 Project로 오해됨 | Profile/AI Mix 이름을 유지하고 project action 미노출 |
| Shared가 제품 로직을 흡수 | primitive는 Shared, domain presentation은 Entity, composition은 Widget/Page |
| Storybook과 route가 달라짐 | 같은 globals/provider/component 사용과 실제 browser QA |

---

## 롤백 전략

- route group은 URL을 바꾸지 않아 adapter 이동 commit을 되돌려 기존 flat route로 복원할 수 있다.
- token과 primitive는 foundation commit 단위로 되돌리고 semantic class 소비자는 유지한다.
- recommendation contract는 additive이므로 새 field serializer와 Song Detail만 독립적으로 롤백할 수 있다.
- Library는 기존 `/vocal-profiles`와 `/mixing-history`를 유지해 새 primary entry를 제거해도 기존 기능이 남는다.
- mixing DELETE는 새 method로 기존 GET/audio/worker와 분리한다.
- DB migration, Modal, Coolify와 CI 변경이 없어 외부 schema·deployment rollback은 필요하지 않다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- Design System: [design-system.md](../../../designs/design-system.md)
- Visual brief: [product-ui-redesign.md](../../../designs/product-ui-redesign.md)
- PRD: [copy-singer-prd.md](../../../prd/copy-singer-prd.md)
