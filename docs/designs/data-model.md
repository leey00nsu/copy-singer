# 데이터 모델 초안

## Prisma/PostgreSQL 원칙

- Prisma schema와 migration을 DB 구조의 SSOT로 사용한다.
- 로컬 PostgreSQL은 Docker Compose로 실행하고 애플리케이션은 `DATABASE_URL`로 연결한다.
- 오디오 바이너리는 DB에 저장하지 않고 로컬/외부 스토리지 경로와 메타데이터만 저장한다.
- 분석과 추천 결과에는 알고리즘 버전을 저장해 재현 가능하게 한다.

## 예상 엔터티

### `Recording`

- `id`, `kind` (`USER_TEST`, `SONG_SOURCE`, `SVC_REFERENCE`, `SVC_TARGET`)
- `storagePath`, `mimeType`, `durationMs`, `sizeBytes`, `sampleRate`
- `status`, `createdAt`, `expiresAt`

### `VocalProfile`

- `id`, `sourceType` (`USER`, `SONG`), `recordingId`
- `minMidi`, `maxMidi`, `p10Midi`, `medianMidi`, `p90Midi`
- `tessituraLowMidi`, `tessituraHighMidi`
- `voicedRatio`, `pitchStability`, `clippingRatio`, `rmsDb`
- `descriptors` (`Json`), `analyzer`, `analyzerVersion`, `createdAt`

### `Song`

- `id`, `title`, `artist`, `originalKey`, `catalogOrder`
- `vocalProfileId`, `analysisStatus`, `metadata` (`Json`)
- 제목·아티스트 복합 unique constraint

### `RecommendationRun`

- `id`, `userVocalProfileId`, `scoringVersion`, `createdAt`

### `RecommendationItem`

- `id`, `runId`, `songId`, `rank`
- `originalKeyScore`, `adjustedScore`, `recommendedShift`
- `reasonCodes` (`Json`), `metrics` (`Json`)
- run 내 `rank`와 `songId` unique constraint

## 보류 사항

- 사용자 인증이 없으므로 초기에는 별도 `User` 테이블을 만들지 않고 `VocalProfile` ID를 로컬 세션 식별자로 사용한다.
- 인증 feature가 생기면 `User`와 profile 소유권을 migration으로 추가한다.
- 100곡 목록 필드와 원본 음원 위치는 사용자 데이터가 전달된 뒤 확정한다.
