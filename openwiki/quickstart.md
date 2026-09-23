---
type: explanation
title: 코드베이스 시작 지도
description: 저장소를 처음 여는 개발자가 바꾸려는 대상에 따라 어떤 문서를 어떤 순서로 읽을지 고르는 라우터 문서예요. 목적별 표가 저장소 구조·공용 UI·로컬 실행·변경 검증·티켓 원장 문서로 이어주고, 웹과 세 워커가 함께 도는 구조, 요청 경로와 작업 경로의 분리, Browser E2E를 자동 실행하는 workflow가 없다는 사실을 안내해요.
tags: [quickstart, navigation, onboarding, explanation]
sources:
  - id: openwiki-source-3dc25b286bcb30bfd66698fa
    resource: repo://.github/workflows/lee-spec-kit-knowledge.yml
  - id: openwiki-source-3d35c21faa6ab50a26f535e0
    resource: repo://docs/prd/system-architecture.md
  - id: openwiki-source-196170e31ff8ec60a116165b
    resource: repo://docs/README.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-904d8953f6839fec7c58c800
    resource: repo://scripts/mixing-worker.ts
  - id: openwiki-source-932d9872d5647bdfeb9f5cd7
    resource: repo://scripts/song-analysis-worker.ts
  - id: openwiki-source-4190e707c6ec6879dbd06e87
    resource: repo://scripts/vocal-profile-analysis-worker.ts
  - id: openwiki-source-79a7413d1517d8cc7fef6fee
    resource: repo://src/_app/api-routes/admission.ts
  - id: openwiki-source-806f57d316f1c56c707b410a
    resource: repo://tests/e2e/TESTING.md
  - id: openwiki-source-8b825c1fe06f865eec32c966
    resource: repo://tests/process-scripts.test.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-23T03:43:13.909Z" }
verified:
  - by: openwiki/0.5.2
    at: 2026-09-23T03:43:13.909Z
---

바꾸려는 대상이 이미 정해져 있다면 아래 표에서 그 줄만 따라가세요. 목표가 아직 없다면 저장소 전체 구조를 다루는 [시스템 지도와 경계](architecture/system-map.md)부터 읽고, 나머지 줄은 필요해질 때 다시 찾아오면 돼요.

## 바꾸려는 목표별로 읽을 문서

표의 왼쪽 열은 바꾸려는 대상, 오른쪽 열은 그 대상을 다루는 문서 순서예요.

| 바꾸려는 목표 | 읽을 문서 순서 |
| --- | --- |
| 로컬 실행과 배포 | [로컬 실행과 배포](operations/local-runtime.md) → [환경 변수와 런타임 한도](operations/configuration.md) |
| 저장소 구조 파악, 새 코드를 둘 자리 | [시스템 지도와 경계](architecture/system-map.md) → [데이터 모델과 수명 주기 상태](architecture/data-model.md) |
| 공용 UI 컴포넌트·Storybook story 추가와 수정 | [공용 UI와 Storybook 경계](architecture/shared-ui-and-storybook.md) → [시스템 지도와 경계](architecture/system-map.md) |
| 브라우저 요청 경로와 접근 제어 | [HTTP API 표면과 요청 접수 규칙](architecture/http-api-surface.md) → [인증과 소유권 경계](integrations/auth-and-ownership.md) |
| 화면 데이터 로딩과 오류 재시도 | [브라우저 상태와 API 오류 계약](architecture/client-data-flow.md) → [HTTP API 표면과 요청 접수 규칙](architecture/http-api-surface.md) |
| 업로드한 목소리 분석 흐름 | [보컬 프로필 분석 흐름](workflows/vocal-profile-analysis.md) → [Modal 서비스와 외부 계약](integrations/modal-services.md) |
| 추천 점수와 추천 키 계산 | [추천과 키 적합도 계산](workflows/recommendation-and-key-fit.md) |
| AI 믹싱 접수와 결과 저장 | [AI 믹싱 작업 흐름](workflows/ai-mixing.md) → [티켓 원장과 멱등성](concepts/ticket-ledger.md) |
| 가입 지급 누락 복구와 티켓 원장 규칙 | [티켓 원장과 멱등성](concepts/ticket-ledger.md) → [복구 스크립트 운영 절차](operations/recovery-runbook.md) |
| 곡 카탈로그 등록과 공개 | [곡 카탈로그 등록과 공개](workflows/song-catalog-lifecycle.md) |
| 관리자 콘솔 화면과 관리자 API 변경 | [관리자 콘솔과 커스텀 믹싱](operations/admin-console.md) → [인증과 소유권 경계](integrations/auth-and-ownership.md) |
| 작업 완료·실패 알림 | [알림과 중복 방지](concepts/notifications.md) → [Job 큐와 lease 복구 계약](operations/job-processing.md) |
| 작업 큐 실패와 운영 복구 | [Job 큐와 lease 복구 계약](operations/job-processing.md) → [복구 스크립트 운영 절차](operations/recovery-runbook.md) |
| 오디오 파일 저장과 정리 | [미디어 저장과 정리 의도](operations/media-storage.md) |
| 변경 검증 명령과 대응 테스트 | [변경 검증 경로](testing/verification.md) → [환경 변수와 런타임 한도](operations/configuration.md) |

표의 첫 번째 문서가 그 목표의 입구예요. 화살표 뒤 문서는 앞 문서가 설명한 상태나 용어를 전제로 하니, 처음에는 순서대로 읽으세요.

두 가지는 자주 헷갈리니 입구를 기억해 두세요. 새 코드를 어느 디렉터리에 둘지 정하는 일은 [시스템 지도와 경계](architecture/system-map.md)가, 여러 화면이 함께 쓰는 UI 컴포넌트와 story를 어디에 두고 무엇으로 검증할지는 [공용 UI와 Storybook 경계](architecture/shared-ui-and-storybook.md)가 답해요.

설치, 로컬 PostgreSQL 준비, 웹과 세 워커를 함께 띄우는 순서, Modal 분석 서비스 배포는 이 페이지가 아니라 [로컬 실행과 배포](operations/local-runtime.md)에서 다뤄요. 저장소 [README.md](repo://README.md#L52-L68)의 Quick Start 블록에도 같은 절차가 짧게 정리돼 있어요.

## 웹과 세 워커가 함께 떠요

`pnpm dev`와 `pnpm start`는 웹과 워커 세 개를 한 묶음으로 감독하고, 그중 하나가 실패하면 나머지도 함께 종료해요. 두 script 모두 `concurrently --kill-others-on-fail`을 사용해요([package.json](repo://package.json#L10-L21)).

| 프로세스 이름 | 실행하는 script | 실제 entrypoint |
| --- | --- | --- |
| `web` | `dev:web` 또는 `start:web` | Next.js 서버 |
| `mixing` | `worker:mixing` | [scripts/mixing-worker.ts](repo://scripts/mixing-worker.ts#L1-L7) |
| `analysis` | `worker:vocal-profile-analysis` | [scripts/vocal-profile-analysis-worker.ts](repo://scripts/vocal-profile-analysis-worker.ts#L1-L9) |
| `songs` | `worker:song-analysis` | [scripts/song-analysis-worker.ts](repo://scripts/song-analysis-worker.ts#L1-L6) |

`--kill-others-on-fail`이 붙어 있으니 자식 프로세스 하나가 실패하면 나머지도 SIGTERM으로 종료돼요. 그래서 운영에서 `pnpm start`는 워커 하나가 죽어도 웹만 남지 않고 프로세스 전체를 끝내고, 배포 관리자가 인스턴스를 다시 시작해요([README.md](repo://README.md#L197-L206)). 이 감독 동작은 [tests/process-scripts.test.ts](repo://tests/process-scripts.test.ts#L29-L44)가 확인해요.

세 워커 entrypoint는 모두 dotenv로 `.env.local`과 `.env`를 읽은 뒤 `src/_app/background-jobs/**`의 실행 함수를 import해서 시작해요. 작업을 점유하고 lease를 갱신하는 규칙은 [Job 큐와 lease 복구 계약](operations/job-processing.md)이 소유해요.

## 요청 경로와 작업 경로가 나뉘어요

브라우저는 자기 서버의 경로만 호출해요. 짧은 읽기·쓰기는 Next.js 서버가 그 자리에서 처리하고, 오래 걸리는 분석·믹싱은 PostgreSQL에 작업 행으로 접수한 뒤 독립 워커가 이어받아 Modal을 호출해요([docs/prd/system-architecture.md](repo://docs/prd/system-architecture.md#L29-L45)). 그래서 자격 증명이 필요한 외부 API를 브라우저에 노출할 필요가 없어요.

`app/api/**/route.ts`로 들어오는 요청은 공통 래퍼를 먼저 지나요. [admission.ts](repo://src/_app/api-routes/admission.ts#L11-L33)의 `withApiAdmission`이 IP 버킷, 세션 확인, 사용자 그룹별 요청 제한, multipart 업로드 슬롯을 handler 호출 전에 적용해요. 판정 기준과 예외는 [HTTP API 표면과 요청 접수 규칙](architecture/http-api-surface.md)과 [인증과 소유권 경계](integrations/auth-and-ownership.md)에서 확인하세요.

## 브라우저 E2E는 자동 게이트가 아니에요

Browser E2E를 자동 실행하는 workflow는 없어요. 이번 생성 입력에서 확인된 `.github/workflows/`의 추적 파일은 `openwiki-test` 브랜치에 이 workflow 파일 자체가 바뀌어 push될 때만 도는 [lee-spec-kit-knowledge.yml](repo://.github/workflows/lee-spec-kit-knowledge.yml#L4-L10) 하나뿐이고, 이 파일 안에는 `pnpm run test:e2e`를 실행하는 단계가 없어요. 그래서 pull request마다 이 suite가 대신 돌아간다고 기대하지 마세요.

배포 전이나 회귀 확인이 필요할 때는 운영자가 로컬에서 현재 suite를 직접 돌려요. 준비물, 실행 명령, 결과 위치, 실패 trace 확인 방법은 [tests/e2e/TESTING.md](repo://tests/e2e/TESTING.md#L5-L40)에 정리돼 있고, 같은 문서는 운영 배포가 Coolify의 기존 자동 배포를 쓰고 Browser E2E를 GitHub Actions 배포 게이트로 실행하지 않는다고 밝혀요. 자동 실행이 없다는 사실이 이 suite가 불필요하다는 뜻은 아니니, 바꾼 범위가 사용자 여정에 닿으면 [변경 검증 경로](testing/verification.md)에서 확인 대상을 고른 뒤 직접 실행하세요.

## OpenWiki와 정본 문서의 관계

`openwiki/` 문서는 tracked 코드·스키마·설정·테스트에서 파생한 온보딩 evidence이고 정본이 아니에요. 제품 요구사항은 `docs/prd/`, 변경 범위와 설계 결정은 활성 Feature SDD(`docs/features/`)가 기준이에요. 다만 `docs/features/`는 이 생성 입력에서 제외되어 있어서, 이 문서들은 그 내용을 확인하지 못했어요. 프로젝트 전체 설명과 정책은 사람이 관리하는 curated docs를 따르고([docs/README.md](repo://docs/README.md#L23-L37)), 실행 가능한 런타임 사실은 tracked 코드와 테스트에서 다시 확인하세요.
