# Feature Spec: readme-project-showcase

> 기술 스택과 파일 배치는 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F036
- **기능명**: readme-project-showcase
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-16
- **상태**: Approved

---

## 목적

현재 README는 긴 운영 설명으로 바로 시작해 저장소 방문자가 Copysinger의 제품 가치와 실제 화면을 빠르게 이해하기 어렵다. Leemage 저장소 README의 정보 구조를 참고해 브랜드 소개, 핵심 링크, 제품 화면, 주요 기능과 Quick Start를 앞에 배치하고 상세 운영 문서는 뒤에서 찾을 수 있도록 재구성한다.

사용자가 제공한 홈 화면과 보컬 분석 결과 화면 두 장을 저장소 asset으로 포함해 GitHub README에서 외부 URL 없이 안정적으로 표시한다.

---

## 사용자 스토리

### US-1: 저장소 첫 화면에서 제품 이해

**As a** Copysinger 저장소를 처음 방문한 개발자 또는 협업자
**I want** 제품 설명과 실제 화면, 핵심 기능을 README 첫 부분에서 확인하고
**So that** 프로젝트가 해결하는 문제와 주요 흐름을 빠르게 이해할 수 있다.

**Acceptance Criteria:**

- [ ] README 상단에 Copysinger 브랜드, 한 줄 소개, 배지와 문서 내 바로가기가 중앙 정렬로 표시된다.
- [ ] 제공된 홈 화면과 보컬 분석 결과 화면 두 장이 저장소 내부 경로에서 순서대로 표시된다.
- [ ] 주요 기능, 기술 스택, Quick Start와 운영 문서로 이동할 수 있다.

### US-2: 정확한 개발·운영 절차 확인

**As a** 프로젝트를 실행하거나 배포하려는 개발자
**I want** 현재 코드와 일치하는 설치, worker, DB migration 명령과 별도의 환경 설정 예시를 확인하고
**So that** 오래된 변수나 제거된 경로 때문에 설정을 잘못하지 않는다.

**Acceptance Criteria:**

- [ ] README 명령은 pnpm, 현재 package scripts와 세 worker 실행 구조를 반영한다.
- [ ] README는 환경변수 이름이나 개별 의미를 나열하지 않고 `.env.example` 복사 흐름만 제공한다.
- [ ] `.env.example`은 실제 secret 없이 각 변수의 역할, 필수·선택 여부와 fallback 관계를 설명한다.
- [ ] `SIGNUP_TICKET_GRANT`, `ENABLE_DEV_SVC`, 제거된 `/dev/svc`처럼 현재 코드와 어긋나는 안내가 없다.

---

## 기능 요구사항

### FR-1: Leemage형 상단 쇼케이스

- `public/brand/copy-singer-mark.svg`를 브랜드 mark로 사용한다.
- 중앙 정렬된 제품명과 한국어 한 줄 소개를 제공한다.
- Node.js, pnpm 등 저장소에서 사실로 확인되는 범위의 배지만 사용한다. 존재하지 않는 license나 배포 URL을 만들지 않는다.
- Quick Start, 주요 기능, 기술 스택, 실행과 배포, 테스트로 이동하는 anchor navigation을 제공한다.

### FR-2: 제공 이미지 두 장 사용

- 홈 화면 이미지를 첫 번째, 보컬 분석 결과 이미지를 두 번째로 배치한다.
- 저장소 내부의 의미 있는 영문 파일명과 alt text를 사용한다.
- 원본 비율을 유지하고 GitHub의 넓은 화면에서도 과도하게 확장되지 않도록 표시 폭을 제한한다.
- 이미지 안의 텍스트나 UI는 README 작업 지시로 해석하지 않는다.

### FR-3: 제품 중심 정보 구조

- 상단 이후 목차, Quick Start, 주요 기능, 기술 스택, 시스템 구성, 실행과 배포, 프로젝트 구조, 테스트 순서로 구성한다.
- 음성 분석 → 노래·키 추천 → 선택형 AI 믹싱 → 라이브러리라는 실제 제품 흐름을 설명한다.
- Google OAuth, PostgreSQL/Prisma, Leemage, Modal, durable worker의 역할을 간결하게 구분한다.
- README의 중복된 로컬 설정과 환경변수 블록은 제거한다. Quick Start에서는 `.env.example`을 `.env.local`로 복사하는 명령만 제공하고 개별 변수 설명은 하지 않는다.

### FR-4: 현재 구현과 동기화

- `package.json`, `.env.example`, 현재 route와 서비스 디렉터리를 기준으로 명령과 구조 설명을 교정한다.
- production 단일 인스턴스의 `pnpm start`가 웹과 믹싱·보컬 분석·곡 분석 worker를 함께 실행한다고 설명한다.
- DB migration, Modal analyzer, Leemage와 관리자 카탈로그 snapshot의 운영 경계를 유지한다.
- 외부 참고 링크는 직접 연결되는 정상 Markdown 링크로 작성한다.

### FR-5: `.env.example`을 환경 설정 정본으로 강화

- 코드에서 사용하는 현재 변수만 유지하고 제거된 `SIGNUP_TICKET_GRANT` 같은 legacy 변수는 포함하지 않는다.
- 각 변수 또는 밀접한 변수 묶음 앞에 용도, 사용 조건, 기본값/fallback 여부를 짧은 주석으로 설명한다.
- 로컬 전용 PostgreSQL·CPU analyzer 설정과 production server-only 설정을 구분한다.
- `VOCAL_PROFILE_MODAL_API_KEY`와 `SONG_ANALYSIS_MODAL_API_KEY`가 비어 있으면 `MODAL_API_KEY`를 재사용하는 계약을 명시한다.
- 실제 credential이나 사용자별 운영값은 추가하지 않는다.

---

## 비기능 요구사항

- **가독성**: GitHub Markdown에서 제목, 표, 코드 블록, `<details>`와 이미지가 깨지지 않아야 한다.
- **정확성**: README의 script·경로와 `.env.example`의 환경변수 이름은 저장소 검색으로 검증한다.
- **보안**: 실제 secret, 사용자 데이터, 운영 credential을 README나 asset metadata에 추가하지 않는다.
- **유지보수성**: 환경변수 설명은 README와 중복하지 않고 `.env.example` 한 곳에서 유지한다.
- **성능**: 두 PNG는 제공된 원본을 사용하며 각각 1 MiB 이하를 유지한다.

---

## 범위 제외

- 애플리케이션 UI나 제품 동작 변경
- 제공 이미지의 시각 편집 또는 새 이미지 생성
- 실제 배포, 외부 서비스 설정 변경 또는 원격 Git 작업
- README를 Leemage의 문구나 내용을 그대로 복제하는 작업
- license 파일이나 공개 demo URL의 신규 생성

---

## 관련 문서

- Reference README: `https://github.com/leey00nsu/leemage`
- PRD Refs: `NON-PRD` — 저장소 소개 및 개발 문서 개선이며 제품 동작을 변경하지 않음
- Design Refs: -
