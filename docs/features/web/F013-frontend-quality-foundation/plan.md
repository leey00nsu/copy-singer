# Implementation Plan: frontend-quality-foundation

---

## 개요

- **기능 ID**: F013
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-09
- **상태**: Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| formatter / general linter | `@biomejs/biome` | 빠른 단일 binary로 format, lint, import assist, staged 검사를 제공 |
| framework lint | 기존 ESLint 9 flat config | Biome에 없는 Next.js/React/JSX 접근성 규칙을 보완 |
| Git hook | Husky | pnpm `prepare` lifecycle과 저장소 기반 hook을 단순하게 유지 |
| package manager | 기존 pnpm 11 | `packageManager`/lockfile 기준을 유지하고 신규 lockfile을 만들지 않음 |

---

## 아키텍처

### 검사 계층

```text
개발 중
  -> editor / pnpm format:write
  -> Biome format + safe lint fixes

git commit
  -> Husky pre-commit
  -> pnpm check:staged
  -> biome check --staged (read-only)

명시적 전체 검사
  -> pnpm check
  -> Biome full check
  -> ESLint
  -> TypeScript
  -> pnpm test (existing build/regression suite)
```

pre-commit과 전체 검사의 목적을 분리한다. pre-commit은 빠른 staged 검사만 수행하고, import graph·타입·전체 테스트처럼 전체 저장소가 필요한 검사는 명시적 로컬 `check` 및 `test`에서 수행한다.

### Biome와 ESLint 역할 분담

- Biome는 formatter, recommended 일반 lint, import 정리, kebab-case 파일명을 담당한다.
- ESLint는 기존 `@next/eslint-plugin-next`, React Hooks, JSX a11y 구성을 유지한다.
- 중복 진단이 서로 다른 수정을 요구하면 Biome 또는 ESLint 한쪽 규칙을 명시적으로 끈다.
- F013 완료 시점에는 ESLint 의존성을 제거하지 않는다. 제거 여부는 후속 별도 감사 대상으로 남긴다.

### 파일명 정책

`useFilenamingConvention`을 opt-in error로 활성화하고 기본 파일 이름을 kebab-case로 고정한다. Biome가 인식하는 Next.js dynamic route와 `page.tsx`, `route.ts` 같은 framework convention은 허용한다. `.test.ts`, `.integration.ts`, `.stories.tsx`, `.config.ts`는 base name만 kebab-case인지 검사한다.

### 후속 CI와 Coolify 경계

- F013은 GitHub Actions workflow를 포함하지 않는다.
- Coolify는 Next.js와 PostgreSQL 운영 배포를 담당하고, GitHub Actions 품질 게이트 및 배포 선행 조건은 실제 배포 정책이 정해진 뒤 별도 Feature에서 설계한다.
- 후속 CI는 `check`, `test`, Prisma migration 및 필요한 테스트 seed 경계를 재사용한다.
- CI 도입 전에는 배포 전에 로컬 `pnpm check`와 `pnpm test`를 명시적으로 실행한다.

---

## Package Script 계약

최종 이름은 구현 중 CLI 호환성을 확인해 확정하되 다음 역할을 유지한다.

| script | 역할 |
| ------ | ---- |
| `format` | 전체 저장소 포맷 상태 검사 |
| `format:write` | 전체 저장소 포맷 및 안전한 자동 수정 |
| `check:biome` | 전체 Biome formatter/linter/assist 검사 |
| `check:staged` | staged 파일 Biome read-only 검사 |
| `typecheck` | `tsc --noEmit` |
| `check` | Biome + ESLint + TypeScript 정적 검사 |
| 기존 `test` | build를 포함한 전체 회귀 테스트 유지 |

기존 `lint` script는 ESLint 의미를 유지해 lee-spec-kit post-merge check와 기존 개발 명령을 깨지 않는다.

---

## 파일 구조

```text
.
├── biome.json
├── package.json
├── pnpm-lock.yaml
├── eslint.config.mjs
├── .husky/
│   └── pre-commit
```

도구 설정 파일 이름은 각 도구의 고정 convention이므로 kebab-case 정책의 예외가 아니다.

---

## 구현 순서

1. Biome/Husky 의존성과 package script를 추가하고 `biome.json`을 만든다.
2. 현재 소스에 Biome를 read-only 실행해 ESLint와 충돌하는 규칙 및 제외 경로를 확정한다.
3. 지원 파일을 한 번 포맷하고 변경 후 전체 빌드/테스트로 동작 회귀가 없는지 확인한다.
4. Husky pre-commit을 추가하고 정상 파일/의도적 오류 파일을 각각 임시 index로 검증한다.
5. 로컬 통합 검사와 전체 회귀 테스트를 실행하고 문서/evidence를 동기화한다.

---

## 테스트 전략

- **설정 검증**:
  - `biome check` 전체 통과
  - kebab-case 위반 fixture 또는 임시 파일이 실패하고 Next.js convention 파일은 통과
  - generated/build/virtualenv 경로가 검사 대상에서 제외되는지 확인
- **Hook 통합 검증**:
  - 정상 staged 파일은 pre-commit command 통과
  - format/lint 오류가 있는 staged 파일은 실패
  - unstaged 파일 및 hook 실행 전후 index 내용이 바뀌지 않음
- **정적 검사**:
  - ESLint 전체 통과
  - `tsc --noEmit` 통과
- **회귀 검증**:
  - 기존 `pnpm test` 통과
  - Prisma schema validate 및 migration status 확인
- **후속 CI 준비성**:
  - 품질 도구별 package script와 전체 회귀 명령이 독립적으로 실행 가능
  - 원격 CI와 배포 연동은 후속 Feature에서 Coolify 정책과 함께 검증

---

## 롤백 전략

- Biome 도입 문제는 `biome.json`, 관련 scripts/의존성을 제거하면 기존 ESLint 경로로 복귀할 수 있다.
- Husky가 특정 환경에서 설치되지 않아도 수동 `pnpm check`가 정적 품질 기준을 유지한다.

---

## 후속 Feature 연계

- F014는 `check`에 Steiger 구조 검사를 추가한다.
- F015는 TanStack Query/MSW/Zod 검증을 기존 테스트 경계에 추가한다.
- F016은 `build-storybook`과 Storybook Vitest browser 검사를 로컬 script 경계에 추가한다.
- GitHub Actions 품질 게이트는 F014~F016의 완료를 막지 않으며 Coolify 배포 정책 확정 후 별도 Feature로 도입한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
