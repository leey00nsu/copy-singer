---
type: "참조"
title: "곡 카탈로그 분석과 보컬 기반 추천"
openwiki_generated: true
verified:
  - by: openwiki/0.5.0
    at: 2026-09-05T04:28:19.819Z
sources:
  - id: openwiki-source-c4cc90d48cd4c0306be7e0c0
    resource: repo://src/_app/background-jobs/song-analysis/worker.ts
  - id: openwiki-source-86e7d5713aa1ec6483cc042e
    resource: repo://src/entities/recommendation/lib/key-fit-scorer.ts
  - id: openwiki-source-58a8a871d850efd2a40ff12e
    resource: repo://src/entities/recommendation/lib/ranking.ts
  - id: openwiki-source-1443ceeee21c86a73ed5ea8a
    resource: repo://src/entities/song-catalog/api/published-catalog.ts
  - id: openwiki-source-4ad5bcda7a4959929e165508
    resource: repo://src/features/create-recommendation/api/recommendation-service.ts
  - id: openwiki-source-792e12f25e1f0b5c9bdeab0c
    resource: repo://src/features/create-recommendation/lib/recommendation-data.ts
  - id: openwiki-source-26761d8fa761d0fa825881ae
    resource: repo://src/features/manage-song-catalog/api/admin-service.ts
  - id: openwiki-source-bee29316b1429cbce2e41726
    resource: repo://tests/admin-song-catalog.integration.ts
  - id: openwiki-source-8f26aeeca9968cee04abea58
    resource: repo://tests/recommendation-ranking.test.ts
generated: { by: "openwiki/0.5.0", at: "2026-09-05T04:28:19.819Z" }
---


# 곡 카탈로그 분석과 보컬 기반 추천

관리자는 출처(source revision), 분석(analysis revision), 재생용 active target, 공개 상태를 한 번에 바꾸지 않아요. 분석 워커가 특정 출처의 결과를 `READY`로 저장한 뒤, 관리자가 그 출처와 분석·target을 함께 공개해야 추천 입력이 돼요. 추천 요청은 가장 이른 `PUBLISHED` 카탈로그를 `RepeatableRead` 트랜잭션으로 읽고, 사용자의 `USER` VocalProfile과 곡 분석을 비교해 키 적합도를 계산한 다음 순위를 매겨요.

가장 중요한 변경 추적 지점은 [`publishAdminSongSource`](repo://src/features/manage-song-catalog/api/admin-service.ts#L215-L261)와 [`getRecommendationResult`](repo://src/features/create-recommendation/api/recommendation-service.ts#L84-L236)예요. 공개가 실패하면 곡은 추천에 들어가지 않고, 추천 입력이 불완전하면 `CATALOG_NOT_READY`로 재시도 가능한 `503`을 반환해요.

## 카탈로그 운영 흐름

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->
```text
flowchart TD
    A[관리자: 곡 생성 또는 새 출처 등록] --> B[SongSource revision 생성<br/>status=DRAFT]
    B --> C[CatalogTargetAsset 음원 업로드]
    C --> D[SongAnalysisJob 생성]
    D --> E[워커가 job을 claim하고 lease 획득]
    E --> F[Modal analyzer에 target 음원 제출]
    F --> G{분석 결과}
    G -->|성공| H[SongAnalysis upsert<br/>status=READY cleanupConfirmed=true]
    G -->|실패| I[분석 FAILED 기록<br/>retryable이면 PENDING 재시도]
    I --> J[관리자가 실패 job retry]
    J --> E
    H --> K{관리자 공개}
    K -->|분석·target이 해당 source와 일치| L[이전 source READY는 SUPERSEDED]
    L --> M[Song activeSource/currentAnalysis/targetAsset 갱신]
    M --> N[CatalogEntry=PUBLISHED<br/>변경 시 Catalog.revision 증가]
    K -->|검증 실패| O[ANALYSIS_NOT_READY 또는 TARGET_NOT_READY]
    N --> P[추천 요청이 PUBLISHED catalog snapshot 로드]
    P --> Q[VocalProfile 검증 및 곡별 key-fit 계산]
    Q --> R[selectionScore 계산 후 rank 부여]
    R --> S[추천 응답: catalogRevision, scoringVersion, item과 이유]
```

## 출처·분석·target·공개 상태를 따로 추적하세요

### 출처 revision은 원본의 이력이고 active source는 현재 선택이에요

새 곡을 만들면 `Song`은 `DRAFT`로 생성되고 `SongSource` revision `1`, `CatalogEntry` `DRAFT`, `SongAnalysisJob`이 같은 트랜잭션에서 만들어져요. 기존 곡에 새 출처를 등록하면 가장 큰 revision에 `1`을 더한 새 `SongSource`를 만들지만, 이 시점에는 곡의 `activeSourceId`를 바꾸지 않아요. `idempotencyKey`가 이미 있으면 같은 입력은 기존 결과를 돌려주고, 다른 곡·출처·메타데이터와 충돌하면 `409`예요. 이 생성 경계는 [`admin-service.ts`](repo://src/features/manage-song-catalog/api/admin-service.ts#L72-L190)에서 확인하세요.

`publishAdminSongSource`는 요청한 `sourceId`가 그 곡에 속하는지 먼저 확인해요. 해당 출처의 현재 파이프라인 계약 분석이 `READY`이고 `cleanupConfirmed`가 `true`여야 하며, 같은 출처의 최신 `READY` target도 있어야 해요. target의 `sourceVideoId`가 출처와 다르면 공개하지 않아요.

검증을 통과하면 다른 출처의 `READY` 상태는 `SUPERSEDED`가 되고, 선택한 출처는 `READY`가 돼요. 이어서 곡의 `lifecycleStatus`를 `ACTIVE`로 만들고 `activeSourceId`, `currentAnalysisId`, `targetAssetId`, `originalKey`를 함께 갱신해요. 카탈로그 항목은 `PUBLISHED`가 돼요. 이 공개 결과가 이전과 달라질 때만 `Catalog.revision`을 1 증가시키므로, 같은 publish를 반복해도 revision이 계속 변하지 않아요.

### 분석 revision은 출처에 종속되고 cleanup 확인이 필수예요

분석 워커는 `PENDING` job 또는 만료된 `PROCESSING` job을 `FOR UPDATE SKIP LOCKED`로 하나 claim하고, `leaseOwner`와 만료 시각을 저장해요. 워커는 heartbeat로 lease를 연장하면서 target을 다운로드하고 Modal의 `/v1/jobs`에 `requestId`, `sourceVideoId`, 파일을 제출해요. Modal은 중복 `requestId`에 기존 외부 job을 재사용하고, 완료 전에는 `PROCESSING`, 완료 후에는 분석 결과를 반환해요. 입력은 100MB 이하이고 허용 확장자는 `.m4a`, `.mp3`, `.mp4`, `.wav`, `.webm`이에요. 자세한 외부 경계는 [`modal_app.py`](repo://services/song-catalog-analyzer/modal_app.py#L247-L309)를 보세요.

성공하면 워커는 `SONG_ANALYSIS_PIPELINE_CONTRACT`별로 `SongAnalysis`를 upsert하고 음역 통계, `voicedRatio`, `pitchStability`, `clippingRatio`, `estimatedKey`, 분석기 이름·버전 등을 저장해요. 임시 파일 삭제까지 확인한 결과만 `cleanupConfirmed: true`가 돼요. 실패하면 분석 실패 정보와 job 실패 정보를 저장하고, 재시도 가능한 실패이며 최대 시도 횟수 안이면 지수형 지연으로 job을 `PENDING`으로 되돌려요. 관리자의 retry는 `FAILED` job에만 허용돼요.

## 공개 카탈로그가 추천 입력으로 바뀌는 지점

추천 서비스는 요청한 `userVocalProfileId`를 세션 사용자 소유권과 함께 조회해요. `sourceType`이 `USER`가 아니거나 10개 음성 수치가 유한하지 않으면 `422 INVALID_PROFILE`이에요. 이후 하나의 `PUBLISHED` 카탈로그를 선택하고, 공개된 항목을 position 순서로 읽어요. 조회 조건에는 활성 곡, `activeSource`·`currentAnalysis`·`targetAsset`의 `READY` 상태, 분석의 `cleanupConfirmed`가 포함돼요. 각 객체의 ID와 source 연결이 어긋나도 [`requiredCatalogProfile`](repo://src/features/create-recommendation/lib/recommendation-data.ts#L17-L67)가 `CATALOG_NOT_READY`를 내요.

이 검사는 공개 상태와 활성 포인터를 같은 것으로 취급하지 않는 안전장치예요. 예를 들어 분석이 `READY`여도 현재 active source의 분석이 아니면 점수화하지 않아요. 카탈로그에 곡이 없거나 position이 중복·비정상이거나 분석 metric·분석기 식별자가 빠져도 추천을 만들지 않아요. 읽기와 공개 사이의 일관성은 `RepeatableRead`로 보장되고, 응답에는 선택한 `catalogRevision`과 `scoringVersion`이 함께 들어가요.

## key-fit 계산과 순위

### 곡마다 가능한 반음 이동을 비교해요

`scoreKeyFit`은 설정된 `KEY_SHIFT_MIN`부터 `KEY_SHIFT_MAX`까지 모든 정수 반음 이동을 후보로 만들고, 원키(`shift = 0`)와 최고 후보를 함께 보존해요. 각 후보는 곡의 주요 음역(tessitura)과 사용자의 주요 음역 겹침, 주요 음역 초과 부담, 전체 극단 음역 초과 부담을 계산해요. 점수 가중치는 각각 겹침 `58`, tessitura 적합도 `26`, 극단 적합도 `16`이고 결과는 0~100으로 제한돼요.

사용자와 곡 분석은 같은 `analyzer`와 `analyzerVersion`을 사용해야 해요. 그렇지 않으면 `INCOMPATIBLE_ANALYZER`예요. 사용자의 신뢰도는 `pitchStability` 60%와 `voicedRatio` 기반 신뢰도 40%로 계산되고, 0.6 미만이면 `LOW_PROFILE_CONFIDENCE` 이유가 붙어요. 구현과 이유 문구는 [`key-fit-scorer.ts`](repo://src/entities/recommendation/lib/key-fit-scorer.ts#L47-L105)와 [`ranking.ts`](repo://src/entities/recommendation/lib/ranking.ts#L93-L140)에 있어요.

### 순위는 원키를 우선하고 이동 부담을 차감해요

곡별 `selectionScore`는 `originalKeyScore * 0.65 + adjustedScore * 0.35 - shiftPenalty`예요. 이동량의 절댓값에 따라 penalty는 `[0, 1, 3, 7, 12, 20, 30]`을 적용하고, 정책 범위를 벗어나면 카탈로그가 준비되지 않은 것으로 처리해요. 정렬은 selection score, 원키 점수, 조정 점수, 이동량의 절댓값, catalog position 순서로 tie-break해요. 결과 rank는 1부터 다시 부여하고, 응답 item에는 원키 점수·조정 점수·추천 이동량·selection score·계산 근거가 들어가요.

응답을 만드는 마지막 단계에서도 rank가 가리키는 position의 `currentAnalysis`, active source, target을 다시 확인해요. 어느 포인터라도 달라지면 점수 결과를 반환하지 않고 `CATALOG_NOT_READY`로 끝내므로, 순위가 다른 revision의 음원 URL이나 target을 가리키지 않아요.

## 실패를 해석하고 변경을 검증하세요

- `ANALYSIS_NOT_READY`: 해당 출처의 분석이 없거나 `READY`·cleanup 확인을 통과하지 못했어요. 분석 job 상태와 pipeline contract를 확인하고, 실패 job이면 retry하세요.
- `TARGET_NOT_READY`: 출처에 대응하는 `READY` target이 없거나 영상 ID가 달라요. 허용된 오디오 파일을 다시 업로드하세요.
- `CATALOG_NOT_READY`: 공개 snapshot에 곡이 없거나 active source·analysis·target 연결, metric, position이 깨졌어요. 공개 전에 관리자 readiness 결과를 다시 확인하세요.
- `503` 추천 오류: 공개 카탈로그가 없거나 snapshot을 점수화할 수 없다는 뜻이에요. 카탈로그 공개가 끝난 뒤 다시 요청하세요.
- `401` 또는 `422`: 추천 API 세션·profile 입력 문제예요. 로그인 상태와 `userVocalProfileId`가 사용자 소유의 완전한 `USER` profile인지 확인하세요.

이 경계의 회귀를 확인하려면 [`admin-song-catalog.integration.ts`](repo://tests/admin-song-catalog.integration.ts#L23-L172)에서 idempotency, 분석·target 선행 조건, publish 시 포인터와 revision 변화를 확인하세요. [`recommendation-ranking.test.ts`](repo://tests/recommendation-ranking.test.ts#L53-L102)와 [`recommendation-ranking.test.ts`](repo://tests/recommendation-ranking.test.ts#L227-L251)는 deterministic ranking, 가중치·tie-break, 빈 카탈로그와 revision 불일치를 검증해요.

곡·프로필 엔터티의 관계는 [도메인 데이터 모델](../concepts/domain-data-model.md)에서 확인하고, 추천 결과를 실제 믹싱으로 넘기는 후속 경계는 [믹싱과 복구](mixing-and-recovery.md)에서 확인하세요.
