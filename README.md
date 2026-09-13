<p align="center">
  <img src="public/brand/copy-singer-mark.svg" alt="Copysinger" width="64" />
</p>

<h1 align="center">
  <strong>Copysinger</strong>
</h1>

<p align="center">
  <strong>한 소절의 목소리를 분석해 잘 맞는 노래와 키를 찾고, AI 믹싱까지 이어주는 보컬 추천 서비스</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D22.13.0-brightgreen" alt="Node.js 22.13.0 이상" />
  <img src="https://img.shields.io/badge/pnpm-11.9.0-f69220" alt="pnpm 11.9.0" />
  <img src="https://img.shields.io/badge/Next.js-16.3.0-black" alt="Next.js 16.3.0" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6" alt="TypeScript 5.9" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#주요-기능">주요 기능</a> •
  <a href="#기술-스택">기술 스택</a> •
  <a href="#시스템-구성">시스템 구성</a> •
  <a href="#실행과-배포">실행과 배포</a> •
  <a href="#테스트">테스트</a> •
  <a href="#코드베이스-knowledge">Knowledge</a>
</p>

<p align="center">
  <img src="public/readme-captures/copysinger-home.png" alt="Copysinger 홈 화면" width="1000" />
</p>

<p align="center">
  <img src="public/readme-captures/vocal-profile-result.png" alt="Copysinger 보컬 분석 결과 화면" width="1000" />
</p>

---

## 목차

- [Quick Start](#quick-start)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시스템 구성](#시스템-구성)
- [실행과 배포](#실행과-배포)
- [프로젝트 구조](#프로젝트-구조)
- [테스트](#테스트)
- [코드베이스 Knowledge](#코드베이스-knowledge)
- [문서 워크플로](#문서-워크플로)

## Quick Start

```bash
# 1. 의존성 및 로컬 설정 준비
pnpm install --frozen-lockfile
cp .env.example .env.local

# 2. PostgreSQL 시작
docker compose up -d

# 3. DB 준비
pnpm run db:migrate:deploy
pnpm run db:generate

# 4. 웹과 background worker 시작
pnpm dev
```

→ [http://localhost:3000](http://localhost:3000)에서 확인

## 주요 기능

### 🎙️ 목소리 분석

- 브라우저 녹음 또는 오디오 파일 업로드
- 관측 음역, 주요 음역, 중심 음과 유효 음성 구간 분석
- 음정 분포와 시간별 피치 흐름 시각화
- 분석한 레퍼런스 오디오와 보컬 프로필을 라이브러리에 보관

### 🎵 노래와 키 추천

- 공개 카탈로그 전체를 현재 보컬 프로필과 비교
- 원키 적합도, 추천 키와 추천 이유 제공
- 검색·정렬·필터와 곡별 상세 근거 제공
- 원본 YouTube 영상을 privacy-enhanced player로 확인

### ✨ AI 믹싱

- 사용자가 선택한 곡만 티켓을 사용해 AI 믹싱
- 보컬 분리, 자동 피치 이동과 반주 재결합
- PostgreSQL 영속 큐와 lease 기반 worker로 재시작 후에도 작업 복구
- 완료 결과 재생·다운로드와 믹싱 이력 관리

### 📚 라이브러리와 계정

- 보컬 프로필과 믹싱 결과를 한곳에서 탐색
- 티켓 잔액과 지급·사용·환불 내역 확인
- 분석과 믹싱 완료·실패 알림 제공
- Google OAuth 기반 사용자별 데이터 소유권 보호

### 🛠️ 관리자 운영

- 사용자, 티켓과 믹싱 작업 상태 관리
- 추천곡, YouTube 미리듣기 영상과 원곡 음원 등록·교체
- 곡 분석 준비 상태, 공개, 추천 제외와 복원 관리
- 카탈로그 snapshot 내보내기·가져오기

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| **Framework** | Next.js 16 App Router, React 19 |
| **Language** | TypeScript 5.9 |
| **UI** | Tailwind CSS 4, Base UI, shadcn, Motion |
| **Server state** | TanStack Query |
| **Audio UI** | WaveSurfer, MediaBunny |
| **Charts** | Recharts |
| **Database** | PostgreSQL, Prisma 7 |
| **Authentication** | Better Auth, Google OAuth |
| **Media storage** | Leemage |
| **AI processing** | Modal, SoulX-Singer, Demucs, librosa |
| **Validation** | Zod |
| **Test** | Node test runner, Vitest, Storybook, Playwright |
| **Architecture** | Feature-Sliced Design, Steiger |

## 시스템 구성

```text
Browser
  └─ Next.js App Router
      ├─ Better Auth ─────────────── Google OAuth
      ├─ Prisma ──────────────────── PostgreSQL
      ├─ Media client ────────────── Leemage
      └─ Durable background workers
          ├─ 보컬 프로필 분석 ───── Modal CPU analyzer
          ├─ 곡 카탈로그 분석 ───── Modal CPU analyzer
          └─ AI 믹싱 ─────────────── SoulX-Singer Modal API
```

웹 요청은 분석과 믹싱 작업을 PostgreSQL에 접수하고 바로 응답한다. 별도 worker가 작업을 원자적으로 점유하고 lease를 저장해 프로세스가 재시작돼도 작업을 이어간다. 보컬 프로필 worker는 Modal analyzer의 단일 동기 HTTP 응답을 기다리며 외부 job ID를 저장하거나 poll하지 않는다. 곡 분석 worker는 Modal에 외부 job을 제출해 ID를 저장하고 완료까지 poll하며, 믹싱 worker도 SoulX job ID를 저장해 상태와 결과를 poll한다. worker가 점유할 수 있는 대상은 새 `PENDING` 작업 또는 처리 중이지만 lease가 없거나 이미 만료된 작업이다. 아직 유효한 lease로 다른 worker가 처리 중인 작업은 점유 대상에서 제외한다. 사용자 레퍼런스와 최종 결과는 Leemage에 저장하고 PostgreSQL에는 소유권과 파일 metadata만 유지한다.

추천곡 카탈로그도 PostgreSQL을 runtime source of truth로 사용한다. 곡 identity, YouTube 출처 revision, 분석 revision, 공개 상태와 원곡 asset을 분리해 출처를 교체해도 기존 추천과 믹싱 근거를 보존한다.

주요 데이터 관계는 Prisma schema를 따른다. 한 `Recording`에는 analyzer/version별 여러 `VocalProfile`이 연결될 수 있다. 한 `SongSource`에도 여러 `CatalogTargetAsset`이 연결될 수 있고 target의 `sourceId`는 optional이며, `Song.targetAssetId`가 현재 선택된 target을 별도로 가리킨다.

추천 item의 synthesis 상태는 화면용으로 `preparing`·`queued`·`processing`·`succeeded`·`failed`에 축약한다. 반면 mixing job 생성·상세·히스토리 API는 DB 상태를 소문자로 직렬화하므로 `submitted`와 `canceled`도 그대로 노출한다.

## 실행과 배포

### 사전 요구사항

- Node.js 22.13.0 이상
- pnpm 11.9.0
- Docker 20 이상
- PostgreSQL
- Google OAuth web client
- Leemage project와 API key
- 배포된 Modal 분석·믹싱 서비스
- production 결과 오디오 변환을 위한 FFmpeg

각 로컬·운영 설정의 의미와 선택 조건은 [.env.example](.env.example)에 정리되어 있다.

### 로컬 실행

`docker compose up -d`는 로컬 PostgreSQL을 시작한다. 데이터베이스를 준비한 뒤 `pnpm dev`를 실행하면 Next.js와 믹싱·보컬 분석·곡 분석 worker가 함께 시작된다. 두 분석 worker는 배포된 Modal CPU service를 사용한다.

```bash
docker compose up -d
pnpm run db:migrate:deploy
pnpm run db:generate
pnpm dev
```

주요 화면:

- `/` — 공개 랜딩
- `/profile` — 목소리 녹음·업로드와 분석
- `/recommendations/[id]` — 보컬 프로필 상세에서 추천을 시작한 뒤 프로필 ID로 진입하는 결과 화면 (`/recommendations` 단독 화면은 없음)
- `/library` — 보컬 프로필과 믹싱 결과
- `/account` — 계정과 티켓 원장
- `/admin` — 관리자 운영
- `/admin/songs` — 추천곡 관리
- `/admin/custom-mixing` — 관리자 커스텀 믹싱

### 분석 서비스

보컬 프로필과 곡 카탈로그 분석 service는 인증을 준비한 뒤 각각 Modal에 배포한다.

```bash
pnpm run modal:vocal-profile:deploy
pnpm run modal:song-catalog:deploy
```

곡 분석기는 관리자에게 업로드받은 원곡 파일을 job 단위 임시 디렉터리에서 처리한다. Demucs로 보컬을 분리한 뒤 pYIN 음역 분석과 chroma 기반 원키 추정을 수행하며, 임시 음원과 stem은 결과 반환 전에 정리한다.

### production

단일 인스턴스에서는 build 후 기본 start 명령을 사용한다. `pnpm start`는 웹과 세 worker를 함께 감독하며 하나가 실패하면 전체 프로세스를 종료해 배포 관리자가 인스턴스를 다시 시작할 수 있게 한다.

```bash
pnpm install --frozen-lockfile
pnpm run db:migrate:deploy
pnpm build
pnpm start
```

새 PostgreSQL에 배포한 경우 migration 후 `/admin/songs`에서 기존 카탈로그 snapshot을 가져온다. snapshot에는 분석 결과와 외부 asset metadata가 포함되며 원본 음원 bytes는 포함되지 않는다.

## 프로젝트 구조

```text
app/                              Next.js App Router adapter
src/_app/                         FSD App layer, provider, route, worker
src/_pages/                       FSD Pages layer
src/widgets/                      독립적인 페이지 UI block
src/features/                     사용자 action과 application use case
src/entities/                     domain model과 domain UI
src/shared/                       공통 config, DB, media, UI와 library
prisma/                           schema, migration과 development seed
scripts/                          worker 및 검증 script
services/soulx-singer-svc/        Modal GPU singing voice conversion API
services/vocal-profile-modal/     Modal 보컬 프로필 분석기
services/song-catalog-analyzer/   Modal 곡 카탈로그 분석기
services/vocal-analysis-core/     Modal 분석 service가 공유하는 Python core
tests/                            unit, integration, UI와 boundary test
```

root `app/`은 Next.js route convention과 FSD public API re-export만 담당한다. 실제 page composition과 Route Handler 구현은 `src/_app/`과 `src/_pages/`에 있다.

```text
_app → _pages → widgets → features → entities → shared
```

slice 사이에서는 대상 slice의 root public API로만 접근한다. `index.ts`는 browser-safe API, `index.model.ts`는 runtime-neutral contract, `index.server.ts`는 DB·secret·server capability를 노출한다. 자세한 규칙은 [공식 FSD Next.js guide](https://fsd.how/docs/guides/tech/with-nextjs/)를 따른다.

## 테스트

```bash
# 전체 production build와 회귀 테스트
pnpm test

# 정적 품질 검사
pnpm run check

# 개별 검사
pnpm run lint
pnpm run typecheck
pnpm run check:architecture
pnpm run db:validate

# Storybook
pnpm storybook
pnpm run test:storybook --run
```

전체 suite는 production build, domain/unit test, PostgreSQL integration, API contract, FSD boundary와 Storybook interaction을 순서대로 검증한다.

## 코드베이스 Knowledge

신규 개발자는 생성된 [OpenWiki 코드베이스 가이드](openwiki/index.md)에서 시스템 경계, 주요 도메인, 외부 서비스, 런타임 흐름과 테스트 진입점을 먼저 탐색할 수 있다.

OpenWiki는 tracked 코드·스키마·설정·테스트에서 파생한 온보딩 evidence이며 정본이 아니다. 제품 요구사항은 `docs/prd/`, 현재 변경 범위와 설계 결정은 활성 Feature의 `spec.md`·`plan.md`·`tasks.md`·`decisions.md`, 사람이 관리하는 프로젝트 전체 설명과 정책은 curated docs를 기준으로 한다. 중요한 런타임 설명은 반드시 실제 코드와 테스트에서 다시 확인한다.

질문에 따라 기준을 다음처럼 선택한다.

| 질문 | 먼저 볼 곳 |
| ---- | ---------- |
| 제품이 무엇을 해야 하는가 | `docs/prd/copy-singer-prd.md` |
| 지금 Feature가 무엇을 바꾸는가 | 활성 Feature의 `spec.md`, `plan.md`, `tasks.md` |
| 프로젝트 전체 원칙과 상위 경계는 무엇인가 | `docs/agents/constitution.md`, `docs/prd/system-architecture.md` |
| 현재 코드가 어디에 있고 어떻게 연결되는가 | `openwiki/`에서 탐색 후 tracked source·테스트로 검증 |
| 특정 코드가 왜 이렇게 바뀌었는가 | Git 이력의 `F###`와 해당 Feature의 `decisions.md` |

Knowledge 생성·갱신은 활성 Feature workflow에서만 수행한다.

```bash
npx lee-spec-kit knowledge sync <feature-ref> --component <component> --json

# 생성 결과를 브라우저에서 읽기 전용으로 확인
openwiki visualize ./openwiki
```

생성된 `openwiki/**` 페이지는 직접 수정하지 않는다. 설명이 잘못됐으면 source 또는 curated docs를 고친 뒤 다시 동기화한다.

현재 코드에서 과거 결정의 이유를 찾을 때는 파일 이력에서 Feature ID를 확인한다.

```bash
git log --oneline -- path/to/file
git blame path/to/file
```

관련 commit subject의 `F###`를 찾은 뒤 `docs/features/<component>/F###-*/decisions.md`로 이동한다. OpenWiki에는 현재 구조 설명만 유지하고 개별 Feature의 결정 내용을 복제하지 않는다.

## 문서 워크플로

이 저장소는 embedded local workflow의 lee-spec-kit을 사용한다.

```bash
npx lee-spec-kit detect --json
npx lee-spec-kit idea <name>
npx lee-spec-kit feature <name> --component web
npx lee-spec-kit feature <name> --component modal-api
```

제품 요구사항은 `docs/prd/`, Feature별 spec·plan·tasks·decisions는 `docs/features/` 아래에서 관리한다.

### 파일 정리 복구

업로드 전 MediaOperation intent를 기록하고 presign identity는 PUT 전에 저장한다. 삭제는 domain row 제거와 독립 cleanup 예약을 한 DB transaction으로 확정한 뒤 수행한다. 알려진 identity 삭제는 최대 10회 재시도하며 실패/identity 불명은 UNRESOLVED로 남는다. 업로드 후 연결되지 않은 asset은 15분 뒤 참조를 재검사한다. 기존 MediaCleanupJob도 worker가 새 cleanup 예약으로 전환한다.

`pnpm run media:reconcile`은 미해결 intent를 100개까지 조회한다. `--id UUID --operator NAME --reason TEXT`로 dry-run하고 `--apply`를 붙이면 운영자 확인 근거를 기록한다. 공급자에서 identity를 확인했다면 `--file-id ID`로 삭제 재시도를 예약한다. 서명 URL/음성 bytes/키를 사유에 넣지 않는다. 삭제 예약은 반드시 올바른 project/file identity를 공급자에서 확인한 뒤 적용한다.

Leemage의 예약 조회·client idempotency·미확정 object TTL은 확인 불가다. presign 응답 유실로 identity를 받지 못한 파일을 자동 제거했다고 표시하지 않는다. 운영자 해결 상태도 공급자의 실제 제거 증거를 대신하지 않는다.

### Worker 복구와 접수 불명

보컬 job 예산은 15분, 믹싱/곡 분석은 75분이며 시작 시 DB에 고정한다. lease는 최대 30초 간격으로 갱신한다. 마지막 시도 중 종료된 job도 다음 worker가 회수하여 종료한다. 외부 제출 불명은 최대 3회/5분 이내만 자동 확인한다. 믹싱 미접수 확정은 원래 비용으로 환불하고 접수 확정/불명은 자동 환불하지 않는다. 보컬 terminal failure는 원래 분석 비용을 환불한다.

`pnpm run jobs:reconcile`로 미해결 기록을 확인한다. `--id UUID --outcome submitted|not-submitted|cleaned --operator NAME --reason EVIDENCE`는 dry-run이고 `--apply`만 변경한다. 공급자 증거로 미접수를 확인한 믹싱은 원래 환불 key로 한 번 환불한다. 환불 처리 중/접수 불명인 믹싱의 기록 삭제는 확인 완료까지 409로 보류하지만 새 job 접수 슬롯은 반환한다.

Modal은 web보다 먼저 새 계약으로 배포해야 한다. SoulX/곡 분석은 claim 뒤 spawn하고 응답 유실 시 재-spawn하지 않는다. 보컬 동기 분석도 recording ID별 metadata claim만 남긴다. 보컬 결과 응답 유실은 자동 재연산 없이 실패·환불로 끝내며 사용자가 새 요청을 만들 수 있다. 음성 bytes/결과는 7일 TTL의 Modal Dict에 캐시하지 않는다. Dict는 7일 미접근 만료이므로 영구 idempotency 저장소가 아니다. terminal DB job은 다시 제출하지 않는다.

외부 job 정리는 terminal 확인 뒤 15초 timeout으로 시도하고 실패하면 UNRESOLVED로 남긴다. 운영자가 원인을 확인해 위 CLI로 해결한다. SIGTERM/SIGINT 이후 신규 claim을 멈추고 진행 job의 제한된 예산 내 정리가 끝나면 DB 연결을 닫는다. 즉시 강제 종료하더라도 다음 worker가 lease 만료 후 회수한다.

### 요청·큐 제한

요청 token bucket은 웹 프로세스별 사용자 기준으로 적용한다. 접수는 분당 6/burst 3, 추천 30/10, 일반 조회 180/60, 오디오 240/60, 관리자 쓰기 10/3이다. 공개 health/auth는 신뢰 IP가 없으면 전체 120/30 제한을 공유한다. 429/503은 Retry-After를 제공한다. 일반적인 1.5~3초 분석 polling, 5초 믹싱 polling, 30초 알림 polling은 수용한다. 기존 공개 health endpoint는 공개 상태를 유지한다.

업로드는 사용자당 1개, 프로세스당 UPLOAD_CONCURRENCY(기본 2개)다. key/기존 분석/잔액 사전 검사는 multipart 읽기 전에, 최종 큐 상한·티켓 차감은 DB transaction에서 처리한다. 보컬 전체 20/사용자 1, 믹싱 전체 20/사용자 3, 곡 분석 전체 50이 기본이다. 큐 상한과 worker lane 수는 다르다. 기존 활성 분석의 추가 접수도 429로 안내한다.

X-Forwarded-For는 기본 신뢰하지 않는다. TRUST_PROXY_CLIENT_IP=true는 직접 앱 접근이 막히고 ingress가 TRUSTED_CLIENT_IP_HEADER를 항상 덮어쓰는 환경에서만 사용한다. 헤더를 임의 전달하는 proxy 구성에는 사용하지 않는다. IP와 별개로 사용자 제한은 유지한다. 다중 웹 인스턴스로 늘리면 local token bucket은 공유되지 않으므로 shared limiter 또는 ingress 제한이 필요하다. DB 큐 상한은 여러 인스턴스에서도 공유된다.

곡 분석의 명시적 관리자 재시도는 job ID를 유지하면서 별도 externalRequestId를 새로 발급한다. 일반 transport 재시도는 동일 externalRequestId를 사용한다. 구 시도의 정리 기록은 별도로 남겨 새 시도와 혼동하지 않는다.

### 가입 티켓 복구

일반 세션 조회는 가입 지급을 실행하지 않는다. 신규 가입은 두 종류의 지급량을 SignupGrantIntent에 먼저 저장하므로 환경값을 바꿔도 이미 가입한 사용자의 원장과 잔액은 변하지 않는다. 과거 가입자의 누락분은 현재 환경값으로 추측하지 않고 당시 지급량을 확인해 지정한다.

```bash
# DB 접근 권한이 있는 운영 환경에서 대상/금액/근거를 검토한다(기본 dry-run).
pnpm run tickets:recover-signup --user USER_ID --kind VOCAL_ANALYSIS --amount 5 --operator OPERATOR --reason '당시 가입 정책 확인'
# 검토한 동일 명령에 --apply를 추가해야 지급한다.
```

AI_MIXING도 같은 방법을 사용한다. intent 또는 기존 가입 원장과 금액이 다르면 거부하며, 같은 금액의 반복 적용은 추가 지급하지 않는다. 추가 보상은 기존 관리자 티켓 조정 기능을 사용한다.

### 적용 순서와 되돌리기

1. 운영 DB 백업과 복원 가능성을 별도로 확인하고, 운영 복제본에서 migration을 검증한다. 이 Feature는 백업 시스템을 구축하지 않는다.
2. 신규 접수를 닫고 구 worker를 drain/정지한다. SIGTERM 뒤 최장 작업 예산은 75분이므로 배포 도구의 종료 유예를 맞추거나 lease 복구를 전제로 종료한다. 구·신 worker가 같은 큐를 동시에 처리하지 않게 한다.
3. `pnpm install --frozen-lockfile`, `pnpm run db:migrate:deploy`, `pnpm run db:generate`를 실행한다. 이번 migration은 기존 표에 컬럼과 별도 복구 표/인덱스를 추가한다. 실패하면 접수를 열지 않고 `pnpm run db:status`와 DB 오류를 확인한다. 실제 적용 상태 확인 없이 migration을 resolve 처리하지 않는다.
4. 세 Modal 서비스를 새 소스로 먼저 배포하고 제출 key 중복/충돌 계약을 검증한다. 그다음 새 웹과 worker를 배포한다. 구 Modal에서는 새 웹의 외부 중복 실행 방어를 보장할 수 없다.
5. 인증된 읽기·Range 재생, 큐 접수/완료, lease 갱신, 복구 표 적체와 오류를 확인한 뒤 접수를 연다. 설정 예시는 `.env.example`을 따른다. 비밀값은 이미지/로그에 넣지 않는다.

되돌릴 때도 먼저 접수를 닫고 신 worker를 정지한다. 추가 DB 컬럼/표는 보존하며 이전 앱을 적용한다. 이전 앱은 intent 정리·fencing·접수 제한을 처리하지 않으므로 미완료 작업/cleanup을 확인한 뒤 제한적으로 재개한다. 새 Modal 계약은 유지하는 편이 안전하며 외부 idempotency metadata를 초기화하지 않는다. 이전 앱으로 되돌렸다고 새 복구 기록이 자동 처리되지는 않는다.

이 Feature의 검증은 로컬 격리 DB와 fake dependency 기준이다. 실제 Modal 배포·유료 AI 호출·운영 트래픽 테스트는 수행하지 않았다.

### 로컬 부하 시나리오

`scripts/load/readiness.k6.js`는 테스트 계정으로 티켓 잔액·알림·프로필·믹싱 목록만 읽는다. localhost 이외 주소 및 리다이렉트는 허용하지 않는다. localhost라도 운영 DB에 연결될 수 있으므로 **격리 DB를 쓰는 별도 웹 프로세스인지 확인**한 뒤 실행한다. k6를 설치한 환경이 필요하다. 테스트 계정 Cookie 값은 환경변수로 주입하고 파일에 커밋하지 않는다.

```bash
# COOKIES_JSON은 테스트 계정 Cookie 헤더 문자열의 JSON 배열.
CONFIRM_ISOLATED=yes SCENARIO=10 k6 run scripts/load/readiness.k6.js
CONFIRM_ISOLATED=yes SCENARIO=50 k6 run scripts/load/readiness.k6.js
CONFIRM_ISOLATED=yes SCENARIO=100 k6 run scripts/load/readiness.k6.js
CONFIRM_ISOLATED=yes SCENARIO=burst k6 run scripts/load/readiness.k6.js
```

10/50/100은 60초간 도착률, burst는 100 VU로 총 500개를 최대 30초 동안 보내는 시나리오다(500개를 모두 동시에 연결한다는 뜻은 아니다). BASE_URL 기본값은 http://127.0.0.1:3000이다. 200/429/503 비율, endpoint별 latency, dropped_iterations를 함께 확인한다. p95 2초는 목표 임계값이며 처리량 보장이 아니다. 429/503은 Retry-After가 있어야 한다. 제한 응답만 빨라도 용량이 충분한 것은 아니므로 admitted_200을 반드시 함께 본다.

| 상황 | 현재 코드 기준 예상 병목·해석 |
| --- | --- |
| 10 RPS | 단일 계정은 일반 조회 3 RPS와 burst 60을 소진한 뒤 429가 증가한다. 여러 계정은 DB 왕복·인증 조회 지연을 먼저 관찰한다. |
| 50 RPS | 계정별 제한을 분산하면 웹 DB pool 5개의 대기가 먼저 후보가 된다. 요청당 DB 점유 100ms라면 단순 pool 예산은 약 50 DB 작업/초이며 API당 여러 쿼리를 구분해야 한다. 이는 실측 API 처리량이 아니다. |
| 100 RPS | 계정 수와 DB 지연에 따라 pool 대기·연결/쿼리 timeout·응답 지연이 늘 수 있다. 5xx와 dropped_iterations를 확인한다. |
| 500 burst | 계정별 burst를 먼저 소진할 수 있다. 여러 계정이면 DB pool과 웹 CPU/메모리가 후보다. 업로드/AI는 이 스크립트가 호출하지 않는다. |

업로드 부하는 별도 합성 fixture와 fake provider에서 검증한다. 동시 업로드는 프로세스당 기본 2개, 보컬/믹싱 큐는 전체 각 20개가 먼저 수용을 제한한다. GPU 처리량은 이 읽기 테스트로 산정할 수 없다. 다중 계정으로 읽기 처리량을 측정하려면 목표 RPS/3 이상의 계정을 준비하되, limiter 검증 목적이면 적은 계정도 유효하다. 이번 로컬 환경에는 k6 실행기가 없어 실제 RPS 결과는 없으며 실행 시나리오만 제공한다.
