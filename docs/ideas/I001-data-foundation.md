# Idea: data-foundation

---

## 개요

- **Idea ID**: I001
- **Idea Name**: data-foundation
- **Created**: 2026-08-05
- **Status**: Featureized
  - 값: Active | Featureized | Dropped
- **Feature**: F001-data-foundation
- **PRD Refs**: PRD-DATA-001, PRD-DATA-002, PRD-DATA-003, PRD-DATA-004, PRD-DATA-005, PRD-NFR-001, PRD-NFR-004
- **Component**: data

---

## 배경

PostgreSQL Docker Compose와 Prisma schema/migration/seed 기반을 구축한다.

후속 프로필·곡·추천 기능이 모두 버전이 있는 관계형 데이터를 필요로 하므로 첫 번째 선행 기능이다.

---

## 대략 범위

- In: `docker-compose.yml`, PostgreSQL healthcheck, Prisma 설치와 초기 schema, migration/seed skeleton, `.env.example`, DB 개발 명령
- Out: 사용자 인증, 실제 100곡 seed, 오디오 binary 저장, 운영 DB 배포

---

## 승격 메모

- PostgreSQL 16+, Prisma migration SSOT, 오디오는 경로만 저장한다.
- 로컬 포트·DB명·개발 credential을 확정해야 한다.
- 다음 단계: 가장 먼저 `data` component Feature로 승격한다.

---

## 데이터 모델 초안

이 내용은 I001을 Feature로 승격할 때 해당 Feature의 `plan.md`로 이동한다. 기술 선택의 확정 근거는 `decisions.md`에 기록한다.

### Prisma/PostgreSQL 원칙

- Prisma schema와 migration을 DB 구조의 SSOT로 사용한다.
- 로컬 PostgreSQL은 Docker Compose로 실행하고 애플리케이션은 `DATABASE_URL`로 연결한다.
- 오디오 바이너리는 DB에 저장하지 않고 로컬/외부 스토리지 경로와 메타데이터만 저장한다.
- 분석과 추천 결과에는 알고리즘 버전을 저장해 재현 가능하게 한다.

### 예상 엔터티

#### `Recording`

- `id`, `kind` (`USER_TEST`, `SONG_SOURCE`, `SVC_REFERENCE`, `SVC_TARGET`)
- `storagePath`, `mimeType`, `durationMs`, `sizeBytes`, `sampleRate`
- `status`, `createdAt`, `expiresAt`

#### `VocalProfile`

- `id`, `sourceType` (`USER`, `SONG`), `recordingId`
- `minMidi`, `maxMidi`, `p10Midi`, `medianMidi`, `p90Midi`
- `tessituraLowMidi`, `tessituraHighMidi`
- `voicedRatio`, `pitchStability`, `clippingRatio`, `rmsDb`
- `descriptors` (`Json`), `analyzer`, `analyzerVersion`, `createdAt`

#### `Song`

- `id`, `title`, `artist`, `originalKey`, `catalogOrder`
- `vocalProfileId`, `analysisStatus`, `metadata` (`Json`)
- 제목·아티스트 복합 unique constraint

#### `RecommendationRun`

- `id`, `userVocalProfileId`, `scoringVersion`, `createdAt`

#### `RecommendationItem`

- `id`, `runId`, `songId`, `rank`
- `originalKeyScore`, `adjustedScore`, `recommendedShift`
- `reasonCodes` (`Json`), `metrics` (`Json`)
- run 내 `rank`와 `songId` unique constraint

### 보류 사항

- 사용자 인증이 없으므로 초기에는 별도 `User` 테이블을 만들지 않고 `VocalProfile` ID를 로컬 세션 식별자로 사용한다.
- 인증 Feature가 생기면 `User`와 profile 소유권을 migration으로 추가한다.
- 100곡 목록 필드와 원본 음원 위치는 사용자 데이터가 전달된 뒤 확정한다.
