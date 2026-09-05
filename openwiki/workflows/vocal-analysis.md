---
type: 보컬 분석 흐름 설명
title: 보컬 업로드에서 분석 결과와 프로필 저장까지
description: 사용자의 오디오 업로드가 소유자 범위의 PostgreSQL 작업 큐와 Leemage 미디어 저장소를 거쳐 Modal 분석기와 VocalProfile 저장으로 이어지는 현재 흐름을 설명해요. 재시도, 소유권, 미디어 정리, 티켓 환불과 알림이 갈리는 지점도 확인할 수 있어요.
tags: [vocal-analysis, workflow, queue, modal, tickets]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:28:19.819Z
sources:
  - id: openwiki-source-eecc4c0c6948847690f8f665
    resource: repo://services/vocal-profile-modal/modal_app.py
  - id: openwiki-source-c2cebe047fc389b8273ee92d
    resource: repo://services/vocal-profile-modal/transport.py
  - id: openwiki-source-cbf25751da575c9067e72947
    resource: repo://src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route.ts
  - id: openwiki-source-9323b2aad36f9dea3b710fc8
    resource: repo://src/_app/background-jobs/vocal-profile-analysis/runner.ts
  - id: openwiki-source-da8b10d1e5d758ab0e1c7582
    resource: repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts
  - id: openwiki-source-9894762239bb4877ee0b6946
    resource: repo://src/entities/vocal-profile/api/analyzer/modal-adapter.ts
  - id: openwiki-source-c5c93b4b4dcdabfe0bc775b2
    resource: repo://src/entities/vocal-profile/api/persistence.ts
  - id: openwiki-source-75ca813b5b73760aa12fda93
    resource: repo://src/features/analyze-vocal-profile/api/analysis-queue.ts
  - id: openwiki-source-54289399e63b81ce5f0384f9
    resource: repo://src/shared/media/media-service.ts
  - id: openwiki-source-28adc6ef840aa586dc1aceef
    resource: repo://tests/vocal-profile-analysis-queue.integration.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-05T04:28:19.819Z" }
---

업로드가 성공하면 먼저 Leemage에 원본을 저장하고 PostgreSQL의 `VocalProfileAnalysisJob`에 대기 작업을 만들어요. 워커가 작업을 점유한 뒤 Modal의 `/v1/analyze`를 동기 호출하고, 검증된 결과를 `Recording`과 `VocalProfile`로 저장해요. 성공 시 완료 알림이 생기고, 재시도할 수 없는 최종 실패 시 원본 미디어를 정리하고 사용한 분석 티켓을 환불해요.

가장 중요한 구현 추적 지점은 [`analysis-queue.ts`의 등록·조회 계약](repo://src/features/analyze-vocal-profile/api/analysis-queue.ts)과 [`worker.ts`의 점유·실행·실패 수명 주기](repo://src/_app/background-jobs/vocal-profile-analysis/worker.ts)예요. 프로필 데이터 모델과 다른 미디어 경계는 [도메인 데이터 모델](../concepts/domain-data-model.md)과 [외부 서비스 연동](../integrations/external-services.md)에서 이어서 확인하세요.

## 호출자에서 저장까지 이어지는 제어·데이터 흐름

```mermaid
flowchart TD
    A[인증된 POST /api/vocal-profile-analysis-jobs] --> B{multipart audio 검증}
    B -- 실패 --> E[400/413/415 응답]
    B -- 통과 --> C[소유자+idempotencyKey 조회]
    C -- 기존 작업 --> D[기존 작업 202 반환]
    C -- 새 요청 --> F{활성 작업과 티켓 확인}
    F -- 활성 작업 --> G[409 ANALYSIS_BUSY]
    F -- 티켓 부족 --> H[402 환불 없는 거절]
    F -- 통과 --> I[Leemage 업로드 + MediaAsset READY]
    I --> J[Serializable 트랜잭션: 작업 생성 + 티켓 차감]
    J -- 경쟁 당첨 아님 --> K[새 MediaAsset 폐기 후 기존 작업 반환]
    J -- 생성됨 --> L[PENDING PostgreSQL 큐]
    L --> M[FOR UPDATE SKIP LOCKED 점유]
    M --> N[Leemage 원본 다운로드]
    N --> O[Modal POST /v1/analyze]
    O --> P{envelope·artifact·원본 무결성 검증]
    P -- 일시적 실패 --> Q[PENDING 재시도, 원본 유지]
    P -- 최종 실패 --> R[FAILED + sourceAssetId 해제]
    R --> S[MediaAsset 폐기/정리 예약]
    R --> T[티켓 환불 + 실패 알림]
    P -- 성공 --> U[Recording READY + VocalProfile 저장]
    U --> V[작업 SUCCEEDED + 완료 알림]
```

### 1. 업로드 요청이 작업을 등록해요

클라이언트는 인증 세션과 `Idempotency-Key` 헤더를 함께 사용해 `POST /api/vocal-profile-analysis-jobs`에 `audio`라는 multipart 파일을 보내요. 라우트는 요청 본문을 25 MiB로 제한하고 WAV, MP3, M4A, WebM MIME 타입과 파일 크기를 확인해요. 세션이 없으면 인증 오류를 반환하고, 키가 없거나 200자를 넘으면 `INVALID_IDEMPOTENCY_KEY`를 반환해요. 이 입력 경계는 [`vocal-profile-analysis-jobs-route.ts`](repo://src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route.ts)에 있어요.

`enqueueVocalProfileAnalysis`는 먼저 같은 `userId`와 키의 작업을 찾아요. 찾으면 새 파일을 저장하지 않고 기존 작업을 반환하므로 같은 요청을 반복해도 Leemage 업로드와 티켓 차감이 다시 일어나지 않아요. 키가 달라도 같은 사용자의 `PENDING` 또는 `PROCESSING` 작업이 있으면 `ANALYSIS_BUSY`로 거절해요.

큐 등록은 소유자별 단일 활성 작업 규칙을 지켜요. 서버는 파일을 Leemage에 올려 `REFERENCE` `MediaAsset`을 만든 뒤, PostgreSQL `Serializable` 트랜잭션에서 경쟁 요청을 다시 확인하고 `VocalProfileAnalysisJob`을 만들어요. 같은 트랜잭션에서 `VOCAL_ANALYSIS` 티켓을 `USAGE_DEBIT`으로 차감해요. 트랜잭션 충돌은 최대 세 번 재시도하고, 다른 요청이 먼저 만든 같은 idempotency 키를 발견하면 새 미디어를 폐기하고 그 작업을 돌려줘요.

티켓 잔액이 부족하면 미디어를 저장하기 전에 거절해요. 현재 기본값은 가입 시 분석 티켓 5개, 분석 비용 1개예요. 실제 배포값은 `SIGNUP_VOCAL_ANALYSIS_TICKET_GRANT`와 `VOCAL_PROFILE_ANALYSIS_TICKET_COST`로 바뀔 수 있으니 [런타임 설정](../operations/configuration-and-runtime.md)도 확인하세요. 이미 저장된 `VocalProfile` 개수는 등록을 막지 않지만 활성 분석 작업은 하나만 허용해요.

### 2. 워커가 큐 점유권을 관리해요

워커는 `PENDING` 작업 또는 만료된 `PROCESSING` 작업을 `FOR UPDATE SKIP LOCKED`로 하나 점유해요. 점유할 때 `status`를 `PROCESSING`으로 바꾸고 `leaseOwner`, `leaseExpiresAt`, `heartbeatAt`을 기록하며 시도 횟수를 하나 늘려요. 다른 워커는 잠긴 행을 건너뛰므로 같은 작업을 동시에 처리하지 않아요. 임대가 만료되면 다른 워커가 다시 점유할 수 있어요.

기본 임대 시간은 300초이고 최대 시도 횟수는 3회예요. `VOCAL_PROFILE_ANALYSIS_LEASE_SECONDS`, `VOCAL_PROFILE_ANALYSIS_MAX_ATTEMPTS`, `VOCAL_PROFILE_ANALYSIS_WORKER_CONCURRENCY`로 조정할 수 있어요. 실행기는 여러 lane을 만들고 각 lane에 고유한 소유자 문자열을 부여해요. 각 반복에서 환불 대기 작업도 최대 10개씩 보정해요.

워커는 작업의 `leaseOwner`가 현재 소유자인지 확인한 뒤 원본 `REFERENCE` 자산을 같은 사용자 범위에서 읽어요. 자산이 없거나 `READY`가 아니면 `ANALYSIS_SOURCE_MISSING` 최종 실패로 처리해요. Leemage의 `externalUrl`에서 원본을 내려받고, 실패가 429 또는 5xx이면 재시도 가능한 `ANALYSIS_SOURCE_UNAVAILABLE`로 바꿔요.

### 3. Modal은 동기 분석 envelope를 반환해요

서버 어댑터는 `VOCAL_PROFILE_MODAL_URL`과 `VOCAL_PROFILE_MODAL_API_KEY`를 읽고 Modal의 `/v1/analyze`로 multipart 본문을 스트리밍해요. `X-Recording-ID`와 `X-API-Key`를 보내고 요청 제한 시간은 120초예요. Modal 앱은 API 키를 검증하고 `X-Recording-ID`가 UUID인지 확인한 뒤 임시 작업 디렉터리에 업로드를 청크 단위로 기록해요.

Modal의 분석은 동기 호출 안에서 끝나며 `modal-analysis-envelope-v1` envelope를 반환해요. envelope에는 프로필 수치, 원본 artifact, 선택적인 `synthesisReference` artifact, `cleanupConfirmed: true`가 들어가요. 임시 디렉터리는 응답을 만들기 전에 정리되고, 정리가 확인된 뒤 응답에 `cleanupConfirmed`가 설정돼요. 각 artifact는 Base64, 크기, SHA-256을 함께 보내요.

Node 어댑터는 transport 버전과 cleanup 확인을 요구하고, artifact의 Base64 디코딩·크기·SHA-256을 검증해요. 프로필의 `recordingId`, MIME 타입, 크기도 artifact와 대조해요. 검증에 실패하면 `ANALYZER_INVALID_RESPONSE`가 되고, Modal timeout·접속 불가·5xx는 재시도 가능한 오류로 매핑돼요. 401/403 인증 오류와 분석기의 고정 거절 사유는 재시도하지 않아요.

워커는 반환된 source bytes가 큐에 저장한 원본과 크기, MIME 타입, SHA-256까지 일치하는지 다시 확인해요. 이 검사는 분석기가 다른 입력을 결과에 묶어 보내는 상황을 막는 소유권·데이터 무결성 경계예요.

### 4. 검증된 결과를 Recording과 VocalProfile로 저장해요

`persistQueuedAnalyzedVocalProfile`은 큐 작업의 `sourceAssetId`를 재확인하고 기존에 같은 사용자와 `recordingId`로 저장된 프로필이 있으면 그대로 반환해요. 새 결과라면 필요한 경우 Modal이 보낸 합성 참고 음원을 Leemage의 `SYNTHESIS_REFERENCE` 자산으로 저장해요. 이 보조 자산 저장이 실패해도 원본을 대체 음원으로 남기고 프로필 저장은 계속할 수 있어요.

이후 트랜잭션에서 사용자의 프로필 번호를 할당하고 `Recording`을 `USER_TEST`·`READY`로 만들어요. Recording은 큐 등록 때 만든 `REFERENCE` `MediaAsset`을 재사용하고, 분석 수치·분석기 이름·버전·descriptor를 `VocalProfile`에 저장해요. 동시 저장 경쟁이 발생해도 이미 만들어진 같은 `recordingId` 프로필을 다시 읽어 중복 프로필을 만들지 않아요.

저장이 끝나면 워커는 작업을 `SUCCEEDED`로 바꾸고 `vocalProfileId`를 연결해요. `VOCAL_PROFILE_SUCCEEDED` 알림은 작업 ID를 중복 제거 키로 사용하고 `/vocal-profiles/{profileId}`로 이동해요. 조회 API는 성공 작업일 때만 같은 사용자의 프로필을 함께 반환해요.

## 실패·재시도·환불 경계

재시도 가능한 실패는 `attempts < maxAttempts`인 동안 지연 후 다시 `PENDING`으로 돌아가요. 지연은 시도에 따라 1초, 2초, 최대 30초로 제한돼요. 이 경로에서는 `sourceAssetId`와 미디어를 유지하고 사용자 알림을 만들지 않아요.

재시도할 수 없거나 최대 시도 횟수를 넘긴 실패는 `FAILED`가 돼요. 작업에서 `sourceAssetId`를 먼저 해제하고 실패 사유와 `retryable` 값을 저장한 뒤 `VOCAL_PROFILE_FAILED` 알림을 만들어요. 알림은 `/library?tab=profiles`로 연결되고 새 음성으로 다시 분석하라고 안내해요.

최종 실패 후 큐 원본은 `discardMediaAsset`으로 삭제를 시도해요. Leemage 삭제가 성공하면 자산 상태를 `DELETED`로 바꾸고 DB 행을 제거해요. 삭제가 실패하면 `DELETE_PENDING`과 `MediaCleanupJob`을 남겨 나중에 정리할 수 있어요. 합성 참고 자산도 프로필 저장 실패 시 같은 정리 경계를 따라요.

티켓 비용이 0보다 크면 최종 실패 작업은 `refundState: REQUIRED`로 기록돼요. 워커가 즉시 `USAGE_REFUND`를 멱등 키 `vocal-analysis-refund:{jobId}`로 적용한 뒤 `REFUNDED`로 바꿔요. 환불 호출이 실패해도 작업 실패 자체는 유지되고, 실행기의 다음 반복에서 `REQUIRED` 환불을 다시 보정해요. 입력 검증 실패, 활성 작업 거절, 잔액 부족으로 작업이 만들어지지 않은 경우에는 차감도 환불도 없어요.

## 변경하거나 장애를 조사할 때 확인할 테스트

- `tests/vocal-profile-analysis-queue.integration.ts`의 idempotency·소유자 범위 테스트는 같은 키 재요청이 한 작업과 한 번의 Leemage 업로드만 만들고, 다른 사용자가 작업을 조회하지 못하는지 확인해요.
- 같은 테스트의 동시 등록과 만료 임대 테스트는 한 사용자당 활성 작업 하나라는 데이터베이스 경계와 만료 후 다른 워커의 재점유를 검증해요.
- 성공 테스트는 Modal envelope에서 프로필을 저장하고 큐 원본 `MediaAsset`을 Recording이 재사용하며 완료 알림이 생성되는지 확인해요.
- 일시적 Modal 실패 테스트는 원본을 지운 뒤 재시도하지 않고 `PENDING`으로 되돌리는지 확인해요. 최종 실패 테스트는 원본 삭제, `FAILED`, 티켓 잔액 복구, 한 번의 환불 ledger와 실패 알림을 함께 확인해요.
- Modal 응답 형식이나 어댑터를 바꿀 때는 `tests/vocal-profile-analyzer-adapter.test.ts`도 함께 실행해 envelope 버전, cleanup 확인, artifact 무결성, 오류 매핑을 변경 범위 테스트로 확인하세요.

이 흐름을 바꾸기 전에는 [추천·카탈로그 작업](recommendations-and-catalog.md)에서 프로필이 다음 기능에 어떻게 소비되는지 확인하고, 저장소나 워커 운영값을 바꾼다면 [운영 설정](../operations/configuration-and-runtime.md)을 같이 갱신하세요.
