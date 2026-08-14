# Implementation Plan: cso-security-audit

> gstack 설치 없이 공개된 `cso` v2 methodology를 현재 repo에 수동 적용한다.

---

## 개요

- **기능 ID**: F029
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved
- **실행 모드**: read-only audit first → verified remediation → re-audit

---

## 감사 원칙

- gstack runtime/skill을 설치하지 않는다.
- `garrytan/gstack`의 공개 `cso/SKILL.md`와 `cso/sections/audit-phases.md`를 methodology reference로 사용한다.
- broad scan은 comprehensive 수준으로 수행하지만 제품 코드 수정은 `VERIFIED` 또는 confidence 8/10 이상 finding만 대상으로 한다.
- secret value, private media payload, production credential은 콘솔/문서/commit에 출력하지 않는다.
- live credential validation, 공격성 webhook/SSRF 요청, 외부 서비스 penetration test는 수행하지 않는다.
- 감사 결과와 remediation은 동일 F029에서 추적하되, 감사 task가 끝나기 전에는 제품 코드를 수정하지 않는다.

---

## 실행 단계

### 1. Surface / Supply-chain / Secret audit

- Node/Next.js/TypeScript, Python service, Docker, DB, external integration 경계를 inventory 한다.
- public/auth/admin/machine API, file upload, background worker, server-side fetch, subprocess surface를 집계한다.
- `.env*` tracking/ignore 정책과 Git history secret 후보를 **값을 출력하지 않는 방식**으로 검사한다.
- pnpm lockfile과 Python requirements를 확인하고 가능한 dependency audit을 실행한다.
- CI/CD, IaC, repo-local AI skill의 존재 여부를 기록한다.

### 2. Application security tracing

- authentication/session/admin authorization 및 owner scope를 route → feature → persistence까지 추적한다.
- multipart upload의 size/MIME/content boundary와 storage ownership을 확인한다.
- raw SQL, command/subprocess, external URL fetch, proxy/media URL path를 injection/SSRF 관점에서 추적한다.
- Leemage/Modal/Google OAuth 등 외부 연동에서 credential 경계, response validation, outbound data flow를 확인한다.
- Python Modal/API 서비스의 machine authentication, temp file, subprocess, request validation, error exposure를 확인한다.

### 3. OWASP / STRIDE / Data classification

- Phase 0–8 evidence를 OWASP A01–A10에 매핑한다.
- 주요 component별 STRIDE threat model을 작성한다.
- 음성 원본/session/provider key/operational metadata 등 데이터를 Restricted/Confidential/Internal/Public으로 분류한다.
- best-practice 부재만으로 finding을 만들지 않고 구체적 exploit path를 요구한다.

### 4. Candidate verification / Security Posture Report

- 각 candidate에 motivating source, exploit scenario, severity, confidence, status를 부여한다.
- React escaping, trusted env/CLI input, test-only fixture 등 false-positive precedent를 적용한다.
- 안전한 code tracing 또는 local-only regression reproduction으로 active verification한다.
- finding은 `VERIFIED`, `UNVERIFIED`, `TENTATIVE`로 구분한다.
- `VERIFIED` finding은 동일 패턴 variant를 repo 전체에서 검색한다.
- redacted report를 `docs/features/web/F029-cso-security-audit/security-posture.md`에 기록한다.

### 5. Verified remediation

- `VERIFIED` 또는 confidence 8+ finding만 remediation task로 처리한다.
- CRITICAL/HIGH를 우선하고, 관련 security regression test를 함께 추가한다.
- 범위가 크거나 제품 정책 결정을 요구하는 finding은 즉시 임의 변경하지 않고 risk/decision으로 남긴다.
- secret이 실제 Git history에 발견되면 값은 문서화하지 않고 rotation/history rewrite가 필요한지 별도 사용자 결정 경계로 둔다.

### 6. Exit audit

- 수정된 path와 variant를 재검사한다.
- daily-style confidence 8/10 gate로 unresolved CRITICAL/HIGH finding이 없는지 확인한다.
- `pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`, `pnpm run check:architecture`를 실행한다.
- Python 변경이 있으면 해당 `pytest`/service test를 추가 실행한다.

---

## 감사 대상 우선순위

1. `src/_app/api-routes/admin/**`, `src/features/authentication/**`
2. vocal profile/catalog/custom mixing file upload 및 private media proxy
3. background queue/lease/worker ownership
4. `src/shared/media/**`, Leemage, Modal adapters
5. `services/*` Python endpoints, machine auth, subprocess/temp file handling
6. Prisma/raw SQL, URL fetch, ffmpeg/subprocess 경로
7. `.env*`, Git history, server config
8. pnpm/Python dependency supply chain
9. Docker/deploy configuration
10. CSP/CORS/error/logging/monitoring 경계

---

## Evidence 방식

- 코드 근거는 file/line 또는 symbol 수준으로 기록한다.
- secret scan은 `path`, `commit`, `pattern category`까지만 기록하고 실제 match value는 출력하지 않는다.
- dependency advisory는 package/version/advisory ID와 reachable evidence만 기록한다.
- raw local evidence 파일은 만들지 않는 것을 기본으로 하며 필요 시 Git ignored 상태를 먼저 검증한다.
- 사용자-visible report에는 민감 payload를 redaction한다.

---

## 예상 산출물

```text
docs/features/web/F029-cso-security-audit/spec.md
docs/features/web/F029-cso-security-audit/plan.md
docs/features/web/F029-cso-security-audit/tasks.md
docs/features/web/F029-cso-security-audit/decisions.md
docs/features/web/F029-cso-security-audit/security-posture.md
<verified finding에 필요한 source/test changes only>
```

---

## 완료 판정

- Phase 0–14의 applicable 항목을 모두 PASS / FINDING / NOT_APPLICABLE로 분류한다.
- 모든 실제 finding은 concrete exploit scenario와 confidence/status가 있다.
- unresolved `VERIFIED CRITICAL/HIGH`가 없다. 수정하지 않는 경우 명시적 risk acceptance가 있어야 한다.
- tentative finding은 제품 코드 변경 근거로 사용하지 않는다.
- 최종 재감사와 repository quality gate가 통과한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Decisions: [decisions.md](./decisions.md)
- Security Posture Report: [security-posture.md](./security-posture.md)
