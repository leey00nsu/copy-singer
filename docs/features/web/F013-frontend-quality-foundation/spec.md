# Feature Spec: frontend-quality-foundation

> 기술 스택과 구체 명령은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F013
- **기능명**: frontend-quality-foundation
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved

---

## 목적

F014~F016의 대규모 프론트엔드 리팩토링을 시작하기 전에 빠르고 일관된 정적 검사 기반을 마련한다. Biome를 포맷·일반 린트·import 정리·파일명 규칙의 기본 도구로 도입하고, Husky pre-commit hook에서 staged 파일만 검사해 잘못된 변경이 커밋되는 것을 방지한다.

기존 ESLint는 Next.js 및 접근성 규칙의 보완 검사로 유지한다. Git hook은 staged 범위만 검사하므로 전체 Biome, ESLint, TypeScript와 회귀 테스트를 명시적으로 실행할 수 있는 로컬 script 경계를 함께 제공한다. GitHub Actions 품질 게이트는 Coolify 배포 정책이 정해진 뒤 후속 작업으로 도입한다.

---

## 사용자 스토리

### US-1: 커밋 전에 빠르게 피드백받는 개발자

**As a** copy-singer 개발자  
**I want** 커밋 대상 파일의 포맷·린트·파일명 오류를 커밋 전에 빠르게 확인하고 싶다.  
**So that** 후속 FSD 및 데이터 계층 리팩토링에서 스타일 잡음과 단순 회귀를 줄일 수 있다.

**Acceptance Criteria:**

- [x] 의존성 설치 후 Husky hook이 자동 준비되며 별도의 수동 hook 설치 절차가 필요하지 않다.
- [x] pre-commit은 staged된 Biome 지원 파일만 검사하고, 오류가 있으면 커밋을 실패시킨다.
- [x] pre-commit은 전체 테스트나 전체 빌드를 실행하지 않으며 staged 파일 범위로 제한된다.
- [x] hook은 사용자 동의 없이 파일을 자동 수정하거나 staging 상태를 변경하지 않는다.
- [x] 개발자는 별도 명령으로 포맷/안전한 자동 수정을 실행할 수 있다.

### US-2: 전체 품질 기준을 확인하는 유지보수자

**As a** copy-singer 유지보수자  
**I want** 커밋 전 검사보다 넓은 범위의 정적 검사와 회귀 테스트를 명시적 명령으로 실행하고 싶다.
**So that** 후속 리팩토링을 시작하기 전에 포맷·린트·타입·빌드 안정성을 확인할 수 있다.

**Acceptance Criteria:**

- [x] 하나의 로컬 명령으로 Biome 전체 검사, ESLint, TypeScript 검사를 순서대로 실행할 수 있다.
- [x] 기존 테스트 명령은 Next.js production build와 현재 회귀 suite를 계속 실행한다.
- [x] 하나의 정적 검사라도 실패하면 통합 check 명령이 실패한다.
- [x] 후속 CI가 현재 script를 그대로 재사용할 수 있도록 도구별 script 경계가 제공된다.

---

## 기능 요구사항

### FR-1: Biome 기본 품질 도구

- JavaScript, TypeScript, JSX/TSX, JSON/JSONC, CSS 등 현재 저장소에서 사용하는 Biome 지원 파일에 formatter, linter, import assist를 활성화한다.
- Git VCS 및 `.gitignore` 연동을 활성화한다.
- `.next`, generated Prisma client, build output, Python virtual environment, 외부/생성 자산 등 사람이 직접 유지하지 않는 경로는 검사에서 제외한다.
- 기존 코드베이스를 한 번 정규화해 전체 검사 기준선을 만든다. 대규모 포맷 변경은 기능 로직 변경과 분리해 검토 가능하게 유지한다.

### FR-2: kebab-case 파일명 규칙

- 사람이 작성하는 JavaScript/TypeScript 파일의 기본 이름은 kebab-case로 강제한다.
- `.test`, `.integration`, `.stories`, `.config` 같은 연속 확장자는 허용한다.
- Next.js의 `page`, `layout`, `route`, `loading`, `error`, `not-found` 및 동적 segment 파일/폴더 규칙을 깨지 않는다.
- 생성 코드와 도구가 소유한 파일에는 파일명 규칙을 적용하지 않는다.

### FR-3: Husky pre-commit 검사

- `prepare` lifecycle을 통해 Husky hook을 설치한다.
- pre-commit은 Biome의 Git staged 파일 검사를 실행한다.
- 검사 실패 시 수정 방법을 알 수 있는 진단을 출력하고 커밋을 중단한다.
- 자동 수정은 명시적으로 실행하는 개발 명령으로만 제공한다.

### FR-4: ESLint 보완 검사 유지

- 기존 ESLint의 Next.js Core Web Vitals, React Hooks, JSX 접근성 검사를 제거하지 않는다.
- Biome와 ESLint의 중복 규칙은 충돌하거나 상반된 수정을 요구하지 않도록 조정한다.
- ESLint는 pre-commit 전체 파일 검사에 넣지 않고 명시적 전체 품질 검사에서 실행한다.

### FR-5: 로컬 통합 검사와 후속 CI 경계

- Biome, ESLint, TypeScript를 묶은 로컬 통합 check 명령을 제공한다.
- 기존 회귀 테스트와 Next.js production build 명령은 독립적으로 유지한다.
- 이후 F014~F016이 Steiger, TanStack Query/MSW/Zod, Storybook 검사를 확장할 수 있는 명확한 package script 경계를 제공한다.
- GitHub Actions와 Coolify 배포 연동은 F013 범위에서 제외하고 후속 작업으로 연기한다.

---

## 비기능 요구사항

- **성능**: pre-commit은 staged 파일만 대상으로 하며 전체 `pnpm test` 또는 `next build`를 실행하지 않는다.
- **결정성**: pnpm lockfile과 저장소의 Biome/ESLint 설정을 기준으로 개발자별 로컬 검사 결과가 일치해야 한다.
- **호환성**: Next.js 16.3, React 19.2, TypeScript 5.9, pnpm 11 환경과 호환되어야 한다.
- **보안**: 품질 도구 설정과 package script에 production secret 또는 운영 DB 접속 정보를 포함하지 않는다.
- **회귀 방지**: 애플리케이션 런타임 동작, API 계약, DB schema 및 사용자 UI를 변경하지 않는다.

---

## 범위 제외

- F014의 FSD 디렉터리 이동 및 Steiger 도입
- F015의 TanStack Query, MSW, Zod 도입
- F016의 Storybook, Vitest browser, 접근성 story 검사
- GitHub Actions 품질 게이트와 Coolify 자동 배포 연동
- 기존 ESLint의 즉시 제거
- commit message 규칙 또는 commitlint 도입
- 모든 기존 테스트를 Vitest로 마이그레이션하는 작업

---

## 선행·후속 관계

- **선행 Feature**: 없음
- **후속 Feature**: F014 → F015 → F016
- F013의 정적 검사 및 로컬 package script를 후속 Feature의 검증 기반으로 사용한다.

---

## 관련 문서

- PRD: 해당 없음
- PRD Refs: -
- 분류: 내부 개발 기반 리팩토링 (`NON-PRD`)
