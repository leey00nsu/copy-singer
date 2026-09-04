# 시스템 아키텍처 개요

이 문서는 여러 Feature가 공유하는 현재 시스템 경계와 핵심 런타임 흐름을 설명하는 curated 문서다. 제품 요구사항은 `copy-singer-prd.md`, 활성 변경의 범위와 설계는 해당 Feature의 `spec.md`·`plan.md`, 선택 근거는 `decisions.md`를 기준으로 한다. 더 세밀한 코드 탐색은 생성된 `openwiki/`를 이용하되 중요한 사실은 tracked source에서 다시 확인한다.

## 코드와 시스템 경계

| 경계 | 현재 경로 | 책임 |
| ---- | --------- | ---- |
| Next.js 진입점 | `app/` | App Router page·Route Handler 규약을 맞추고 FSD public API를 호출하는 얇은 adapter |
| App 조립과 서버 orchestration | `src/_app/` | layout, provider, metadata, API handler, durable background worker |
| 화면 조립 | `src/_pages/`, `src/widgets/` | route별 화면 구성과 여러 use case를 묶는 UI |
| Use case | `src/features/` | 인증, 보컬 분석, 추천, 믹싱, 카탈로그·티켓·알림 관리 |
| Domain model | `src/entities/` | 보컬 프로필, 추천, 곡 카탈로그, 믹싱 작업, 티켓, 알림 |
| 공통 기반 | `src/shared/` | DB, media, config, API·UI와 범용 library |
| 데이터 모델 | `prisma/schema.prisma`, `prisma/migrations/` | PostgreSQL schema와 migration 이력 |
| Worker entrypoint | `scripts/*-worker.ts` | 믹싱, 보컬 프로필 분석, 곡 분석 worker process 시작 |
| Python 분석 서비스 | `services/vocal-profile-modal/`, `services/song-catalog-analyzer/`, `services/vocal-analysis-core/` | Modal CPU 분석 adapter와 공유 분석 core |
| 음성 합성 서비스 | `services/soulx-singer-svc/` | Modal 기반 SoulX-Singer 합성 |
| Media storage | Leemage, `src/shared/media/` | 권한이 확인된 오디오 bytes 저장과 server-side 접근 |

Web 코드는 다음 의존 방향을 따른다.

```text
_app -> _pages -> widgets -> features -> entities -> shared
```

slice 외부에서는 root public API를 사용한다. `index.ts`는 browser-safe API, `index.model.ts`는 runtime-neutral contract, `index.server.ts`와 이름에 `.server`가 붙은 entrypoint는 DB·secret 같은 server capability를 노출한다. 실제 경계는 `steiger.config.ts`와 `tests/fsd-architecture-boundaries.test.ts`가 검증한다.

## 핵심 런타임 구조

```text
Browser
  -> app/ page 또는 app/api/ adapter
  -> src/_pages 또는 src/_app/api-routes
  -> src/features use case
  -> PostgreSQL / Leemage

PostgreSQL durable job
  -> scripts/*-worker.ts
  -> src/_app/background-jobs/*
  -> Modal CPU analyzer 또는 SoulX service
  -> Leemage bytes + PostgreSQL metadata/status
```

브라우저는 credential이 필요한 Modal·Leemage API를 직접 호출하지 않는다. 짧은 읽기·쓰기 요청은 Next.js server에서 처리하고, 긴 분석·믹싱 작업은 PostgreSQL에 먼저 기록한 뒤 별도 worker가 처리한다.

## 보컬 프로필 분석

1. 로그인한 사용자가 `/profile`에서 오디오를 제출하면 `app/api/vocal-profile-analysis-jobs/` adapter가 `src/_app/api-routes/`의 handler를 호출한다.
2. server는 source를 Leemage asset으로 저장하고 PostgreSQL에 `PENDING` 분석 job을 만든 뒤 job ID를 반환한다.
3. `scripts/vocal-profile-analysis-worker.ts`가 `src/_app/background-jobs/vocal-profile-analysis/` runner를 시작한다.
4. worker는 시도 횟수와 `nextAttemptAt` 조건을 만족하는 `PENDING` job 또는 lease가 없거나 만료된 `PROCESSING` job만 `FOR UPDATE SKIP LOCKED`로 claim한다. 아직 유효한 lease는 대상에서 제외한다.
5. worker는 `analyzeVocalProfileBytes`로 Modal CPU analyzer의 단일 동기 HTTP 응답을 `await`한다. 이 경로는 외부 job ID를 저장하거나 상태를 poll하지 않는다.
6. worker가 결과를 검증한 뒤 프로필 metadata는 PostgreSQL, synthesis reference bytes는 Leemage에 저장한다.
7. 일시 오류는 bounded retry와 backoff를 사용하고, 복구할 수 없는 오류는 terminal failure로 기록한다.

## 곡 카탈로그 분석과 공개

1. 관리자는 `/admin/songs`에서 곡과 권한이 있는 target audio를 등록한다.
2. server는 source와 분석 job을 PostgreSQL에 기록하며, `scripts/song-analysis-worker.ts`가 durable job을 claim한다.
3. worker는 `services/song-catalog-analyzer/`의 Modal CPU service에 외부 job을 제출하고 `externalJobId`를 PostgreSQL에 저장한 뒤 terminal 상태까지 poll한다. 분석 로직의 공통 부분은 `services/vocal-analysis-core/`를 사용한다.
4. 관리자가 준비된 source·analysis·target을 명시적으로 공개할 때만 추천 가능한 catalog entry에 연결한다.
5. 원본과 분리 stem은 임시 작업 경로에서 제거하고, 장기 보관이 허용된 target bytes만 Leemage에 둔다.

## 추천과 AI 믹싱

1. 추천 생성은 저장된 사용자 보컬 프로필과 공개된 곡 분석값을 비교해 PostgreSQL에 순위와 설명을 저장한다.
2. 제품 화면은 `/recommendations/[id]`에서 시작하며 단독 `/recommendations` page는 없다. 곡 상세는 `/recommendations/[id]/songs/[itemId]`다.
3. 사용자가 AI 믹싱을 요청하면 server는 READY mid-only reference와 READY catalog target을 확인하고, 티켓 차감과 `PENDING` mixing job 생성을 한 DB transaction에서 수행한다.
4. `scripts/mixing-worker.ts`와 `src/_app/background-jobs/mixing/`이 job을 claim하고 snapshot된 asset을 Leemage에서 읽어 SoulX service에 제출한다.
5. 성공 결과 bytes는 Leemage, 상태·소유권·외부 job ID·오류·asset reference는 PostgreSQL에 저장한다. 접수 전 terminal failure에서만 티켓을 한 번 환불한다.
6. 사용자는 `/library`와 `/library/mixes/[id]`에서 재접속 후에도 상태와 결과를 확인한다.

추천 item은 내부 mixing 상태를 화면용 `preparing`·`queued`·`processing`·`succeeded`·`failed`로 축약한다. 이 mapping은 recommendation 응답에만 적용된다. mixing job 생성·상세·히스토리 API는 DB 상태를 소문자로 직렬화하므로 `submitted`와 `canceled`를 포함한 상태를 그대로 노출한다.

## 주요 데이터 관계

- `Recording` 하나에는 analyzer/version 조합별로 여러 `VocalProfile`이 연결될 수 있다. `@@unique([recordingId, analyzer, analyzerVersion])`는 전체 관계를 1:1로 만들지 않는다.
- `SongSource` 하나에는 여러 `CatalogTargetAsset`이 연결될 수 있다. target의 `sourceId`는 optional이고, `Song.targetAssetId`는 현재 선택된 target을 별도로 가리킨다.
- 현재 추천 대상은 공개된 `CatalogEntry`와 그 Song의 active source/current analysis/target 연결을 통해 결정한다.

## 운영 불변식

- 모든 사용자 데이터 접근은 server-side session과 resource ownership을 검증한다. 관리자 기능은 별도 allowlist를 확인한다.
- 장시간 작업은 PostgreSQL durable queue와 독립 worker를 사용한다. worker는 활성 lease를 중복 claim하지 않는다.
- 오디오 bytes는 Leemage에, 관계·상태·소유권·hash와 외부 asset reference는 PostgreSQL에 둔다.
- PostgreSQL schema는 `prisma/migrations/`를 통해서만 변경한다.
- secret은 server와 worker에만 두고 source, 문서 예시 값, client bundle에 포함하지 않는다.
- 앱 코드는 Modal 장애 시 검증되지 않은 local analyzer로 조용히 fallback하지 않는다.
- 개발·운영 명령의 현재 계약은 root `package.json` scripts와 각 `services/*/README.md`에서 확인한다.

## 상세 탐색과 변경 이유

- 현재 구조와 흐름: [`openwiki/index.md`](../../openwiki/index.md)
- 코드 시작점: [`openwiki/quickstart.md`](../../openwiki/quickstart.md)
- 시스템 지도: [`openwiki/architecture/system-map.md`](../../openwiki/architecture/system-map.md)
- Job 처리: [`openwiki/operations/job-processing.md`](../../openwiki/operations/job-processing.md)

OpenWiki는 생성된 탐색 evidence이므로 직접 수정하지 않는다. 특정 코드가 왜 현재 모습이 되었는지는 해당 파일의 Git 이력에서 `F###`를 확인한 뒤 `docs/features/<component>/F###-*/decisions.md`를 읽는다.
