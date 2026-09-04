---
type: 미디어 저장 통합 개념
title: Media Storage, Proxying, and Cleanup
description: Leemage에 저장하는 오디오 바이트와 PostgreSQL의 MediaAsset 메타데이터 경계를 설명한다. 업로드·압축·비공개 오디오 프록시·삭제 재시도 흐름을 안전하게 변경하기 위한 진입점과 실패 의미를 정리한다.
tags: [media-storage, leemage, audio, cleanup]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-03T23:57:17.994Z
sources:
  - id: openwiki-source-2798a6200ef792b731721034
    resource: repo://prisma/schema.prisma
  - id: openwiki-source-fbba7fa6e3a5a11035b20bd2
    resource: repo://src/_app/api-routes/vocal-profiles/vocal-profile-audio-route.ts
  - id: openwiki-source-c0fadc5fb07256188388665a
    resource: repo://src/_app/api-routes/vocal-profiles/vocal-profile-synthesis-reference-audio-route.ts
  - id: openwiki-source-eaa76879de1a19c0db5c6ebb
    resource: repo://src/_app/background-jobs/mixing/worker.ts
  - id: openwiki-source-75ca813b5b73760aa12fda93
    resource: repo://src/features/analyze-vocal-profile/api/analysis-queue.ts
  - id: openwiki-source-040370852205e0b755f2e46d
    resource: repo://src/shared/lib/audio/compress-mixing-result.ts
  - id: openwiki-source-071cfeede2929b71a4251340
    resource: repo://src/shared/media/audio-proxy.ts
  - id: openwiki-source-f7f91388e9d9faeb71baf3b2
    resource: repo://src/shared/media/cleanup.ts
  - id: openwiki-source-e1e6dda5f5d6b99d3fdb4420
    resource: repo://src/shared/media/client.ts
  - id: openwiki-source-54289399e63b81ce5f0384f9
    resource: repo://src/shared/media/media-service.ts
  - id: openwiki-source-acfd2d9685fd54c639680425
    resource: repo://tests/compress-mixing-result.test.ts
  - id: openwiki-source-01fbd505db59dd5c76886bef
    resource: repo://tests/effect-cleanup.test.ts
  - id: openwiki-source-ccbdecfd240e4ce1e06a40aa
    resource: repo://tests/leemage-client.test.ts
  - id: openwiki-source-7fa4288722f051f26ea68eb5
    resource: repo://tests/private-audio-proxy.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-03T23:57:17.994Z" }
---

# Media Storage, Proxying, and Cleanup

## 경계와 소유권

애플리케이션 서버의 미디어 경계는 `src/shared/media`에 있다. `LeemageClient`는 서버 전용 클라이언트로서 외부 저장소 API와 presigned object URL을 호출하고, 애플리케이션의 PostgreSQL은 바이트 자체가 아니라 `MediaAsset` 메타데이터와 수명 상태를 소유한다. 저장소 URL은 `externalUrl`에 보관되지만 클라이언트에 직접 노출하지 않는 것이 비공개 오디오 경로의 불변식이다.

`MediaAsset`은 사용자(`userId`), 용도(`REFERENCE`, `SYNTHESIS_REFERENCE`, `MIX_RESULT`), provider(기본값 `LEEMAGE`), 외부 project/file 식별자, 외부 URL, 파일명, MIME type, 바이트 수, 상태와 오류를 기록한다. `(externalProjectId, externalFileId)`는 유일하며, 분석·보컬 프로필·믹싱 작업이 이 행을 참조한다. PostgreSQL의 `BigInt` `sizeBytes`는 업로드 응답의 바이트 수를 저장한다.

### 설정과 외부 API 안전성

`leemageConfigFromEnv()`는 `LEEMAGE_API_KEY`와 `LEEMAGE_PROJECT_ID`를 필수로 읽고, `LEEMAGE_BASE_URL`이 없으면 코드에 정의된 기본 API base URL을 사용한다. 이 값과 인증 헤더는 서버 전용 코드에서만 사용한다. 문서와 로그에는 credential, token 또는 환경 파일 내용을 기록하지 않는다.

API 요청은 `Authorization: Bearer ...`, `cache: no-store`로 수행한다. 네트워크 예외와 HTTP 429 또는 5xx는 최대 3회 재시도한다. `Retry-After`(최대 5초)를 우선하고 이후 지수 지연을 사용한다. 그 밖의 HTTP 오류는 `LeemageError`로 전달되며, 상태 코드와 retryable 여부를 보존한다. presign/confirm 응답에 필요한 문자열 필드가 없으면 재시도하지 않는 502 성격의 오류로 취급한다.

## 업로드와 메타데이터 영속화

`storeAnalyzerReferenceBytes()`와 `storeAnalyzerSynthesisReferenceBytes()`는 파일명 확장자를 MIME type에 맞춰 정하고 공통 저장 루틴을 호출한다. `storeMixingResult()`는 `copy-singer-{mixingJobId}.{extension}` 이름으로 최종 결과를 저장한다. 공통 순서는 다음과 같다.

1. Leemage `POST /projects/{projectId}/files/presign`에 파일명, content type, 크기를 보낸다.
2. 응답의 `presignedUrl`로 바이트를 `PUT`하고 MIME type을 보낸다. 이 object 업로드 요청에는 API 인증 헤더를 붙이지 않는다.
3. Leemage `POST /projects/{projectId}/files/confirm`에 `fileId`, `objectName`, 파일 메타데이터를 보내 저장을 확정한다.
4. confirm 결과의 외부 `id`와 `url` 및 로컬 입력 메타데이터를 `MediaAsset(status=READY)`로 만든다.

따라서 외부 업로드가 성공해도 마지막 DB 기록이 실패할 수 있다. 분석 enqueue는 트랜잭션 실패, idempotency 경합 또는 이미 존재하는 작업이면 방금 만든 asset을 `discardMediaAsset()`으로 정리해 고아 object를 남기지 않도록 한다. 믹싱 worker도 결과 asset을 만든 뒤 작업 성공 트랜잭션이 실패하면 동일하게 폐기한다.

```mermaid
sequenceDiagram
    participant Caller as 분석 또는 믹싱 호출자
    participant App as 애플리케이션 서버
    participant L as Leemage API
    participant Obj as 저장 object
    participant DB as PostgreSQL

    Caller->>App: 오디오 바이트 저장 요청
    App->>L: presign(file metadata)
    L-->>App: presignedUrl fileId objectName
    App->>Obj: PUT bytes
    Obj-->>App: upload success
    App->>L: confirm(file metadata)
    L-->>App: external file id and URL
    App->>DB: MediaAsset READY 메타데이터 저장
    DB-->>App: asset id
```

*그림은 바이트가 Leemage object에 올라간 뒤 외부 식별자와 URL만 PostgreSQL에 저장되는 경계를 보여준다.*

## 결과 압축

믹싱 worker는 Modal에서 성공한 원본 오디오를 바로 저장하지 않는다. `compressMixingResult()`가 임시 디렉터리에서 FFmpeg를 실행해 입력을 `audio/mp4` AAC `m4a`로 변환한다. 44.1 kHz, 2채널, 160k 비트레이트, `+faststart`를 사용하며 clarity/normal 필터 체인은 고역·저역 조정, 컴프레서, loudness 정규화를 포함한다. 입력·출력 임시 파일은 성공과 실패 모두 `finally`에서 삭제한다. FFmpeg 실패는 `MIXING_FINALIZATION_FAILED`로 보고되고 재시도 가능한 믹싱 단계 오류다. 실행 파일은 `FFMPEG_BIN`으로 바꿀 수 있고, 없으면 `ffmpeg`를 찾는다.

압축된 결과를 Leemage에 업로드하고 `MIX_RESULT` asset을 만든 후에야 믹싱 작업을 `SUCCEEDED`로 커밋한다. 이 순서를 바꾸면 성공 작업이 가리킬 결과 메타데이터가 없어질 수 있다.

## 비공개 오디오 프록시

보컬 프로필 원본 및 synthesis reference route는 먼저 `requireApiSession()`으로 인증하고, 세션 사용자 소유의 reference를 조회한다. 없으면 404, 인증되지 않으면 unauthorized 응답을 반환한다. 그 뒤 `proxyPrivateAudio()`가 DB의 `externalUrl`을 서버에서 가져와 브라우저에 스트리밍한다.

프록시는 요청의 `Range`를 upstream에 전달하므로 부분 재생을 지원하며, upstream이 정상 또는 206이 아니면 body를 전달하지 않고 `null`을 반환한다. 전달하는 헤더는 `Content-Type`, `Content-Length`, `Content-Range`, `Accept-Ranges`뿐이다. 저장소 응답의 임의 헤더는 노출하지 않는다. MIME type 보정, 안전한 파일명 기반 `Content-Disposition: inline`, `Cache-Control: private, no-store`를 설정하고 60초 timeout을 둔다. route는 `null`을 502 `..._UNAVAILABLE` 오류로 변환한다. 결과적으로 브라우저는 저장소 URL이 아닌 애플리케이션 API URL만 사용한다.

```mermaid
sequenceDiagram
    participant B as 인증된 브라우저
    participant R as 오디오 API route
    participant DB as PostgreSQL
    participant Obj as Leemage object

    B->>R: GET audio with optional Range
    R->>R: requireApiSession
    R->>DB: 사용자 소유 MediaAsset 조회
    DB-->>R: externalUrl and audio metadata
    R->>Obj: GET with forwarded Range
    Obj-->>R: audio stream and range headers
    R-->>B: private no-store audio response
```

*그림은 인증·소유권 확인 뒤 서버가 외부 object를 중계하는 비공개 재생 흐름이다.*

## 삭제 상태와 정리 worker

`deleteOrScheduleMediaAsset()`은 먼저 asset을 조회한다. 행이 없으면 이미 삭제된 것으로 성공을 반환한다. Leemage 삭제가 성공하면 `DELETED`, `deletedAt`, `lastError=null`로 표시한다. 호출자가 `discardMediaAsset()`이면 그 성공 결과에 한해 PostgreSQL 행도 삭제한다.

외부 삭제가 실패하면 asset을 즉시 지우지 않고 `DELETE_PENDING`과 오류를 기록하며, `MediaCleanupJob(status=PENDING)`을 같은 트랜잭션으로 만든다. 이 보상 경로가 DB 메타데이터와 외부 object의 불일치를 재시도할 수 있게 한다.

`processOneMediaCleanup()`은 `PENDING`/`FAILED` 중 `nextAttemptAt`이 된 작업 또는 5분 이상 멈춘 `PROCESSING` 작업을 `FOR UPDATE SKIP LOCKED`로 하나 선점한다. worker는 외부 삭제 성공 시 asset과 cleanup job(성공 후 흐름)을 제거한다. 외부가 404를 반환해도 원하는 최종 상태가 이미 달성된 것으로 보고 asset을 제거한다. 다른 실패는 cleanup job을 `FAILED`로 만들고 backoff(시도 횟수에 따른 최대 360분)를 설정하며 asset은 `DELETE_PENDING`으로 남긴다. `runMixingWorkerOnce()`가 일반 믹싱 작업을 claim하기 전에 이 cleanup을 한 번 처리한다.

```mermaid
sequenceDiagram
    participant App as 애플리케이션
    participant DB as PostgreSQL
    participant W as cleanup worker
    participant L as Leemage API

    App->>L: DELETE external file
    alt 삭제 성공
        L-->>App: success
        App->>DB: asset DELETED 또는 discard 시 행 삭제
    else 삭제 실패
        L-->>App: error
        App->>DB: asset DELETE_PENDING and cleanup PENDING
        W->>DB: stale or due job을 SKIP LOCKED로 claim
        W->>L: DELETE external file 재시도
        alt 성공 또는 404
            L-->>W: final absence
            W->>DB: asset와 cleanup job 제거
        else 재시도 실패
            L-->>W: error
            W->>DB: cleanup FAILED with nextAttemptAt
            W->>DB: asset DELETE_PENDING with lastError
        end
    end
```

*그림은 즉시 삭제와 실패 시 지연 정리의 상태 전이를 함께 보여준다.*

## 변경 시 확인할 불변식과 테스트

- Leemage API credential은 server-only 모듈 밖으로 이동하지 말고, presigned `PUT`에 API 인증을 재사용하지 않는다.
- `confirm` 성공과 `MediaAsset` DB 생성의 순서를 유지한다. DB 트랜잭션이 결과 asset을 채택하지 못하면 보상 삭제를 호출한다.
- 사용자 소유권 조회를 우회해 `externalUrl`을 직접 반환하지 않는다. Range·partial response·저장소 헤더 비노출을 유지한다.
- 외부 삭제 실패 시 `DELETE_PENDING`과 cleanup job을 함께 기록하고, 404는 멱등적인 삭제 성공으로 취급한다.

집중 테스트는 `tests/leemage-client.test.ts`에서 presign → PUT → confirm의 세 호출, 인증 헤더 경계와 429 재시도를 검증한다. `tests/private-audio-proxy.test.ts`는 Range 전달, 206 응답 헤더, private no-store 및 저장소 URL 헤더 차단, upstream 503 처리를 검증한다. `tests/compress-mixing-result.test.ts`는 FFmpeg 결과 형식과 임시 파일 정리를 검증하고, `tests/effect-cleanup.test.ts`는 UI가 임의 fetch나 polling timer를 소유하지 않고 오디오 미리보기만 바이너리로 가져오는 규칙을 검사한다. cleanup의 선점·재시도 동작은 `src/shared/media/cleanup.ts`와 `tests/leemage-media.integration.ts`의 통합 경계를 변경 시 함께 확인해야 한다.
