# Feature Spec: data-foundation

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F001
- **기능명**: data-foundation
- **대상 레포**: copy-singer-data
- **작성일**: 2026-08-05
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

후속 보컬 프로필, 곡 카탈로그, 키 적합도 및 추천 결과가 공통으로 사용할 로컬 관계형 데이터 기반을 만든다.
개발자는 별도 관리형 서비스 없이 Docker Compose로 PostgreSQL을 실행하고, Prisma schema와 migration을 통해 동일한 데이터 구조를 재현할 수 있어야 한다.

### 포함 범위

- 로컬 PostgreSQL 서비스와 healthcheck를 정의하는 Docker Compose 구성
- Prisma 설치, `DATABASE_URL` 연결, 초기 schema 및 migration
- `Recording`, `VocalProfile`, `Song`, `RecommendationRun`, `RecommendationItem` 데이터 모델
- 개발 환경 확인용 최소 seed와 DB 개발 명령
- Secret을 제외한 환경 변수 예시와 로컬 실행 문서

### 제외 범위

- 사용자 인증 및 데이터 소유권 모델
- 실제 음원 파일 업로드 또는 PostgreSQL 내 오디오 바이너리 저장
- librosa 기반 보컬 분석과 실제 프로필 생성
- 실제 100곡 카탈로그 및 곡별 분석 데이터 적재
- 적합도 계산, 상위 3곡 추천 및 SoulX-Singer 합성 연동
- 운영 PostgreSQL 배포 및 백업 체계

---

## 사용자 스토리

### US-1: 재현 가능한 로컬 데이터베이스 실행

**As a** copy-singer 개발자
**I want** 저장소의 Docker Compose와 환경 변수 예시만으로 PostgreSQL을 시작하고 상태를 확인하고 싶다
**So that** 후속 기능을 동일한 로컬 데이터 환경에서 개발하고 검증할 수 있다

**Acceptance Criteria:**

- [ ] 사용자가 저장소 루트에서 `docker compose up -d`를 실행하면 PostgreSQL 컨테이너가 기동한다.
- [ ] 컨테이너 healthcheck가 정상 상태를 보고한다.
- [ ] 실제 비밀번호가 Git에 포함되지 않고 `.env.example`에 필요한 변수 이름과 로컬 예시만 제공된다.

### US-2: 버전 관리되는 데이터 구조

**As a** copy-singer 개발자
**I want** Prisma schema와 migration으로 핵심 데이터 구조를 관리하고 싶다
**So that** 환경마다 같은 구조를 재현하고 변경 이력을 추적할 수 있다

**Acceptance Criteria:**

- [ ] 빈 로컬 DB에 저장소의 Prisma migration을 적용할 수 있다.
- [ ] Prisma schema validation과 client generation이 성공한다.
- [ ] 초기 모델의 관계와 unique constraint가 schema 및 migration에 반영된다.

### US-3: 후속 기능을 위한 최소 데이터 확인

**As a** copy-singer 개발자
**I want** 최소 seed 데이터를 넣고 Prisma로 조회하고 싶다
**So that** 프로필·카탈로그·추천 Feature가 데이터 기반을 즉시 사용할 수 있다

**Acceptance Criteria:**

- [ ] seed 명령이 비어 있는 개발 DB에 비민감성 예제 데이터를 중복 충돌 없이 생성한다.
- [ ] seed 결과에서 Recording과 VocalProfile의 연결, Song과 곡 프로필의 연결, RecommendationRun과 RecommendationItem의 연결을 확인할 수 있다.
- [ ] README에 기동, migration, generate, seed, 종료 명령이 기록된다.

---

## 기능 요구사항

### FR-1: PostgreSQL 로컬 서비스

- PostgreSQL 16 이상 이미지를 사용한다.
- DB 이름, 사용자, 비밀번호와 호스트 포트는 환경 변수로 구성한다.
- 데이터는 named volume에 보존하며 서비스 healthcheck를 제공한다.

### FR-2: Prisma 데이터 모델 SSOT

- Prisma schema와 생성된 migration만 DB 구조 변경의 SSOT로 사용한다.
- `DATABASE_URL`을 통해 PostgreSQL에 연결한다.
- 식별자는 외부 노출과 분산 생성을 고려해 UUID 계열 문자열을 사용한다.
- 생성 시각은 모든 주요 엔터티에 저장하고, 변경 가능한 주요 엔터티에는 수정 시각을 저장한다.

### FR-3: Recording 모델

- 녹음 용도(`USER_TEST`, `SONG_SOURCE`, `SVC_REFERENCE`, `SVC_TARGET`)와 처리 상태를 enum으로 제한한다.
- 파일 참조, MIME type, byte 크기, 길이 및 sample rate 메타데이터를 저장할 수 있다.
- 선택적인 만료 시각으로 향후 보관 정책을 지원한다.

### FR-4: VocalProfile 모델

- 사용자 또는 곡에서 생성된 프로필인지 구분한다.
- 프로필당 원본 Recording을 연결하고, 하나의 Recording에서 분석 버전별 프로필을 보존할 수 있다.
- MIDI 음역 통계, tessitura, voiced ratio, pitch stability, clipping ratio, RMS 및 확장 가능한 JSON descriptor를 저장한다.
- analyzer 이름과 버전을 필수로 저장한다.

### FR-5: Song 모델

- 제목, 아티스트, 원키, 카탈로그 순서와 분석 상태를 저장한다.
- 곡 보컬 프로필을 선택적으로 연결할 수 있다.
- 제목과 아티스트의 조합은 중복되지 않는다.

### FR-6: Recommendation 모델

- RecommendationRun은 기준 사용자 보컬 프로필과 scoring version을 저장한다.
- RecommendationItem은 실행, 곡, 순위, 원키 점수, 조정 점수, 추천 semitone 이동, 이유 코드와 계산 metric을 저장한다.
- 동일 실행 내 순위와 곡은 각각 중복되지 않는다.

### FR-7: 개발 명령과 seed

- package script 또는 문서화된 명령으로 Prisma validate, generate, migrate 및 seed를 수행할 수 있다.
- seed는 실제 사용자 음원이나 저작권 음원을 요구하지 않는 합성 메타데이터만 사용한다.
- seed를 반복 실행해도 중복 데이터 오류로 실패하지 않아야 한다.

### FR-8: 애플리케이션 경계

- 이 Feature에서는 사용자-facing DB API를 추가하지 않는다.
- 후속 Next.js 서버 코드가 재사용할 수 있도록 Prisma client 생성과 연결 계약까지만 제공한다.
- 오디오 파일 내용은 DB에 저장하지 않고 storage path와 메타데이터만 저장한다.

---

## 비기능 요구사항

- **재현성**: 새 데이터베이스에 migration과 seed를 순서대로 적용해 같은 초기 구조와 예제 데이터를 만들 수 있어야 한다.
- **보안**: 실제 DB 자격 증명과 `DATABASE_URL`은 Git 및 클라이언트 번들에 포함하지 않는다.
- **데이터 무결성**: 관계, enum, unique constraint 및 필요한 index를 DB schema 수준에서 보장한다.
- **호환성**: 기존 Next.js UI와 Modal SVC API 동작을 변경하지 않는다.
- **검증**: Docker healthcheck, Prisma validate/generate, migration 적용, seed 및 최소 조회 검증이 모두 통과해야 한다.

---

## 관련 문서

- PRD: `../../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-DATA-001`, `PRD-DATA-002`, `PRD-DATA-003`, `PRD-DATA-004`, `PRD-DATA-005`, `PRD-NFR-001`, `PRD-NFR-004`

- Idea: `../../../ideas/I001-data-foundation.md`
