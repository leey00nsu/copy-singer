# Feature Spec: cso-security-audit

> 기술 스택과 실행 계획은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F029
- **기능명**: cso-security-audit
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved
- **PRD Refs**: `NON-PRD` — 제품 기능 추가가 아닌 보안 posture 감사 및 hardening
- **감사 기준**: `garrytan/gstack`의 `cso` v2 공개 methodology (`cso/SKILL.md`, `cso/sections/audit-phases.md`)

---

## 목적

현재 서비스의 보안 posture를 gstack `cso` v2가 정의한 Phase 0–14 기준으로 전수 점검하고, 실제 exploit path가 확인되거나 높은 확신도로 검증된 finding을 우선순위화해 안전하게 수정한다.

이 feature는 gstack을 로컬에 설치하거나 runtime dependency로 추가하지 않는다. 공개된 `cso` methodology를 감사 체크리스트와 판정 기준의 reference로 사용한다. 감사 단계는 read-only로 수행하고, 감사 결과에서 별도로 승인된 remediation task에서만 제품 코드를 수정한다.

현재 repo는 Next.js/TypeScript 애플리케이션과 Python 기반 Modal/분석 서비스, 관리자 API, 파일 업로드, OAuth/session, Leemage/Modal 외부 연동, background worker, Docker 구성을 포함한다. 따라서 웹 코드만이 아니라 서비스·운영 경계까지 같은 감사 범위에 포함한다.

---

## 사용자 스토리

### US-1: 실제 공격면을 이해하는 개발자

**As a** 서비스를 운영·배포하는 개발자
**I want** 인증·관리자 API·파일 업로드·외부 서비스·worker·Python 서비스·container를 포함한 전체 공격면을 한 번에 지도화하고
**So that** 코드 일부만 보고 놓치는 신뢰 경계와 운영 위험을 확인하고 싶다.

**Acceptance Criteria:**

- [ ] Phase 0에서 Node/TypeScript, Next.js 및 repo 내부 Python 서비스와 주요 외부 의존성을 식별한다.
- [ ] Phase 1에서 public/authenticated/admin/API/file-upload/external-integration/background-job surface를 구분해 기록한다.
- [ ] container/IaC/CI/CD/webhook/secret-management surface의 존재 여부도 함께 기록한다.
- [ ] 각 surface가 어떤 사용자 입력·권한·외부 시스템과 연결되는지 trust boundary를 요약한다.

### US-2: 낮은 노이즈의 보안 finding을 받는 개발자

**As a** 보안 finding을 실제 수정해야 하는 개발자
**I want** 단순 패턴 매치가 아니라 exploit scenario와 code-tracing 근거가 있는 finding을 받고
**So that** false positive를 쫓지 않고 실제 위험부터 고칠 수 있다.

**Acceptance Criteria:**

- [ ] comprehensive 방식으로 낮은 확신도의 후보까지 탐색하되 `TENTATIVE`, `UNVERIFIED`, `VERIFIED`를 구분한다.
- [ ] 모든 보고 finding에는 severity, confidence, status, category, file/line, exploit scenario, impact, recommendation이 포함된다.
- [ ] 실제 remediation task로 승격하는 기준은 기본적으로 `VERIFIED` 또는 confidence 8/10 이상이다.
- [ ] confidence 8 미만의 candidate는 추가 검증 없이는 제품 코드 변경 근거로 사용하지 않는다.
- [ ] finding이 `VERIFIED`가 되면 동일 취약점 패턴의 variant를 repo 전체에서 재검색한다.

### US-3: 민감 정보를 노출하지 않고 감사를 수행하는 개발자

**As a** secret과 사용자 데이터를 다루는 개발자
**I want** 감사 중 credential이나 민감 데이터가 새 Git 기록·로그·문서에 재노출되지 않게 하고
**So that** 보안 감사를 하다가 새로운 유출을 만들지 않고 싶다.

**Acceptance Criteria:**

- [ ] secret archaeology는 실제 key 형식 여부까지 확인하되 live API로 credential 유효성을 테스트하지 않는다.
- [ ] raw secret 값이나 민감한 request/response payload는 canonical feature docs에 기록하지 않는다.
- [ ] 감사 evidence가 secret을 포함할 수 있는 경우 로컬 임시 evidence로만 유지하고 Git에 커밋하지 않는다.
- [ ] feature 문서에는 redacted finding, 경로, 원인, remediation, 검증 결과만 남긴다.

---

## 감사 범위

### Phase 0: Architecture Mental Model + Stack Detection

- root와 nested service의 언어/framework를 식별한다.
- `README`, 환경 설정, auth/admin/media/worker/service 경계를 읽어 application architecture와 trust boundary를 작성한다.
- root에서 탐지되지 않은 언어도 SQL injection, command injection, hardcoded secret, SSRF 같은 high-signal 패턴은 catch-all로 확인한다.

### Phase 1: Attack Surface Census

다음 surface의 수와 위치를 기록한다.

- unauthenticated/public endpoint
- authenticated endpoint
- admin-only endpoint
- machine-to-machine API
- file upload point
- external integration
- background job/worker
- webhook receiver
- WebSocket channel
- container configuration
- IaC/deploy target
- secret management 방식

### Phase 2: Secrets Archaeology

- 현재 tracked file과 Git history에서 credential prefix, private key, token, password/secret/api key 후보를 검사한다.
- `.env`/`.env.*` tracking 및 `.gitignore` 정책을 확인한다.
- CI configuration에 inline credential이 있는지 확인한다.
- placeholder와 test-only fixture는 제외하되 실제로 노출된 과거 secret은 rotated 여부와 별개로 finding 후보로 취급한다.

### Phase 3: Dependency Supply Chain

- Node/pnpm 및 Python requirements의 vulnerability audit 가능 여부를 확인한다.
- lockfile 존재 및 Git tracking을 검증한다.
- production dependency의 install/preinstall/postinstall script를 점검한다.
- high/critical advisory는 실제 direct dependency 및 vulnerable code path 사용 여부를 추적해 VERIFIED/UNVERIFIED를 나눈다.

### Phase 4: CI/CD Pipeline Security

- GitHub Actions 등 CI workflow가 존재하면 third-party action pinning, `pull_request_target`, untrusted expression의 shell interpolation, secret exposure, CODEOWNERS 보호를 확인한다.
- 현재 workflow가 없으면 `CI/CD workflows: 0`으로 attack surface에 기록하고 finding을 조작하지 않는다.

### Phase 5: Infrastructure Shadow Surface

- production-relevant Dockerfile에서 non-root user, secret ARG/COPY, exposed port를 확인한다.
- committed config의 production DB/Redis 등 credential-bearing URL을 검사한다.
- Terraform/K8s가 있으면 wildcard IAM, privileged container, host networking 등 권한 과다를 검사한다.
- local-only compose와 tmp/dev artifact는 production 연결 근거가 없으면 finding에서 제외한다.

### Phase 6: Webhook & Integration Audit

- webhook/callback/inbound integration endpoint의 signature/HMAC 검증 존재 여부를 code tracing한다.
- TLS verification disable 패턴을 검사한다.
- OAuth scope가 실제 필요 권한보다 넓은지 확인한다.
- Leemage, Modal, Google OAuth 등 외부 연동의 server-only credential 경계와 outbound data flow를 기록한다.
- webhook/SSRF 검증을 위해 실제 외부 HTTP 공격 요청을 보내지 않는다.

### Phase 7: LLM & AI Security

- user input이 system prompt/tool schema/function calling context로 들어가는 경로가 있는지 확인한다.
- AI/모델 결과를 HTML/code로 신뢰해 렌더링·실행하는 escape hatch를 검사한다.
- AI tool/function call 실행 전 validation/authorization 여부를 확인한다.
- API key hardcoding과 사용자가 무제한 AI 호출·비용을 유발할 수 있는 경로를 확인한다.
- 단순히 user content가 normal user-message 위치에 있다는 이유만으로 prompt injection finding을 만들지 않는다.

### Phase 8: Skill Supply Chain

- repo-local AI skill/agent instruction이 존재하는지 확인하고, 존재할 경우 network exfiltration, credential access, prompt override, overly broad tool permission 패턴을 검사한다.
- 현재 repo-local `.claude/skills`가 없으면 해당 사실을 surface 결과로 기록한다.
- 사용자 홈의 global skill/hook 스캔은 repo 밖 개인 설정을 읽는 작업이므로 이 feature 기본 범위에서 제외한다. 필요 시 별도 사용자 승인으로만 수행한다.
- gstack 자체는 설치하지 않으므로 gstack installed-skill 검사는 요구하지 않는다.

### Phase 9: OWASP Top 10 Assessment

- **A01 Broken Access Control**: owner scope, IDOR, admin vertical escalation, auth 없는 API route
- **A02 Cryptographic Failures**: weak crypto, hardcoded secret, sensitive data transport/storage
- **A03 Injection**: raw SQL, command execution, template/HTML escape hatch, prompt injection
- **A04 Insecure Design**: server-side business rule, auth abuse 방어, security-critical rate/attempt controls
- **A05 Security Misconfiguration**: CORS, CSP/security header, production debug/error exposure
- **A06 Vulnerable Components**: Phase 3 결과 연결
- **A07 Authentication Failures**: Better Auth/session/OAuth lifecycle, token/session invalidation, admin authentication boundary
- **A08 Data/Software Integrity**: external payload validation, pipeline/dependency integrity
- **A09 Logging/Monitoring**: 실제 공격 탐지에 필요한 auth/admin security event가 존재하는지 확인하되, 단순 audit log 부재만으로 취약점 판정하지 않는다.
- **A10 SSRF**: user-controlled URL → server-side fetch 경로, host/protocol 통제, internal reachability

### Phase 10: STRIDE Threat Model

주요 component마다 다음을 평가한다.

- Spoofing
- Tampering
- Repudiation
- Information Disclosure
- Denial of Service
- Elevation of Privilege

최소 component 후보:

- Next.js public/product application
- Better Auth / Google OAuth boundary
- admin API surface
- vocal profile analysis upload + worker
- song catalog upload + analysis worker
- mixing queue + Modal SoulX
- Leemage media storage/proxy
- Python Modal/service boundaries
- PostgreSQL persistence

### Phase 11: Data Classification

서비스가 처리하는 데이터를 다음으로 분류하고 저장·전송·retention 경계를 확인한다.

- **Restricted**: auth credential/session secret, 개인 음성 원본처럼 유출 시 높은 피해가 있는 데이터
- **Confidential**: provider API key, 내부 분석/믹싱 artifact metadata, 운영 configuration
- **Internal**: system log, non-public operational metadata
- **Public**: 공개 콘텐츠, marketing/legal 문서

분류 자체가 법적 compliance 인증을 의미하지 않으며, 실제 저장 위치와 접근 경계를 근거로 작성한다.

### Phase 12: False Positive Filtering + Active Verification

- broad scan은 comprehensive 수준으로 후보를 넓게 찾는다.
- candidate마다 실제 motivating code/config line을 확인한다.
- 가능한 경우 안전한 code tracing으로 exploitability를 검증한다.
- live credential test, 실제 webhook 공격, 실제 SSRF request는 금지한다.
- status는 `VERIFIED`, `UNVERIFIED`, `TENTATIVE` 중 하나로 기록한다.
- React 기본 escaping, trusted env/CLI input, test-only fixture 등 cso의 documented false-positive precedent를 적용한다.

### Phase 13: Findings Report + Remediation

각 finding은 다음을 포함한다.

- Severity: CRITICAL / HIGH / MEDIUM
- Confidence: 1–10
- Status: VERIFIED / UNVERIFIED / TENTATIVE
- Phase / Category
- File:Line 또는 config 위치
- Description
- Concrete exploit scenario
- Impact
- Recommendation
- Verification 방식

Remediation 우선순위:

1. VERIFIED CRITICAL/HIGH
2. confidence 8+ CRITICAL/HIGH
3. VERIFIED MEDIUM
4. 추가 검증이 필요한 UNVERIFIED
5. TENTATIVE appendix

감사 보고 후 코드 수정은 별도 F029 remediation task로 수행한다. Finding을 고칠 때 관련 regression/security test를 추가하고 동일 패턴 variant도 함께 처리한다.

### Phase 14: Report Persistence

- raw report가 secret/민감 evidence를 포함할 수 있으므로 `.gstack/security-reports`를 repo에 새로 만들거나 commit하는 것을 요구하지 않는다.
- canonical evidence는 F029 docs에 **redacted 형태**로 기록한다.
- 필요 시 local-only report를 생성하되 반드시 Git untracked/ignored 상태인지 확인한다.
- 이전 audit report가 존재하는 경우에만 resolved/persistent/new trend를 비교하며, 첫 감사에서는 `first_run`으로 기록한다.

---

## 프로젝트별 우선 감사 영역

초기 surface census 기준으로 다음을 우선순위로 둔다.

1. `src/_app/api-routes/admin/**` 및 `src/features/authentication/**`의 관리자/권한 경계
2. vocal profile, catalog target, custom mixing의 multipart/file upload 검증
3. `src/_app/background-jobs/**`와 durable queue lease/ownership 경계
4. Leemage media storage/proxy와 Modal service 호출의 URL·credential·owner scope
5. `services/*` Python Modal/API 서비스의 auth key, subprocess/file handling, temporary artifact cleanup
6. raw SQL/Prisma query, server-side fetch, subprocess/ffmpeg 경로의 injection/SSRF 가능성
7. `.env.local` 비추적 및 Git history secrets archaeology
8. pnpm lockfile/Python requirements 공급망
9. production-relevant Dockerfile 및 compose/deploy 연결 여부
10. CSP/CORS/error response와 private audio/data exposure

---

## Finding 판정 규칙

### Severity

- **CRITICAL**: 현실적인 exploit path로 credential/account/admin/DB/remote-code 수준의 중대한 compromise가 가능함
- **HIGH**: 권한 상승, 민감 데이터 접근, 공급망/외부 연동 compromise 등 큰 영향이 현실적으로 가능함
- **MEDIUM**: exploit 조건이 더 필요하거나 영향 범위가 제한적이지만 구체적인 보안 문제가 존재함
- 단순 best-practice 부재나 exploit path 없는 theoretical concern은 finding으로 만들지 않는다.

### Confidence / Status

- 9–10: 특정 code/config를 읽고 exploit path를 구체적으로 확인
- 8: 명확한 취약 패턴과 알려진 exploitation 방식이 연결됨
- 5–7: 추가 검증 필요 — 기본적으로 remediation 전에 재검증
- 2–4: comprehensive candidate — `TENTATIVE` appendix
- 1: speculation — 원칙적으로 제외

제품 코드 자동 수정 기준은 **VERIFIED 또는 confidence 8+**이다. 그 아래 finding은 사용자 확인 또는 추가 evidence 없이는 수정하지 않는다.

---

## 검증 및 완료 조건

- [ ] Phase 0–11 surface/audit pass를 완료한다.
- [ ] 모든 candidate에 Phase 12 false-positive filtering과 active verification을 적용한다.
- [ ] 보고되는 모든 finding에 concrete exploit scenario와 motivating source evidence가 있다.
- [ ] VERIFIED finding은 variant analysis를 수행한다.
- [ ] CRITICAL/HIGH VERIFIED finding은 수정하거나 명시적으로 risk acceptance를 기록한다.
- [ ] 수정된 finding마다 관련 unit/integration/security regression test를 추가한다.
- [ ] 수정 후 daily-style 8/10 confidence gate로 재감사해 unresolved CRITICAL/HIGH finding이 없는지 확인한다.
- [ ] `pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`, architecture checks를 통과한다.
- [ ] Python service 변경이 있으면 해당 서비스 테스트도 통과한다.
- [ ] canonical docs와 Git history에 raw secret이 새로 기록되지 않았음을 확인한다.

---

## 범위 제외

- gstack 설치 또는 repo dependency 추가
- production credential의 live 유효성 테스트
- 실제 외부 서비스에 공격성 webhook/SSRF/pentest request 전송
- 무단 네트워크 penetration testing
- global AI skill/user setting 스캔 (별도 승인 없이는 제외)
- 보안과 무관한 일반 성능 최적화 또는 코드 스타일 정리
- 전문 penetration test/compliance certification의 대체

---

## 비기능 요구사항

- **Read-only first**: finding 확정 전 감사 과정에서는 제품 코드를 수정하지 않는다.
- **Evidence-based**: file/config 근거와 realistic exploit scenario 없는 finding은 remediation backlog로 승격하지 않는다.
- **Secret-safe**: credential value 자체를 feature docs, commit message, test fixture에 복제하지 않는다.
- **Least privilege**: 인증·관리자·worker·외부 서비스 경계 수정 시 필요한 최소 권한을 유지한다.
- **Regression safety**: security hardening으로 기존 owner scope, admin workflow, 분석·믹싱 queue의 정상 경로가 깨지지 않게 한다.
- **Disclosure**: 이 감사는 AI-assisted first pass이며 전문 보안 감사/침투 테스트의 대체가 아니다.

---

## 참고 기준

- `garrytan/gstack` — `cso/SKILL.md` v2.0.0
- `garrytan/gstack` — `cso/sections/audit-phases.md`
- OWASP Top 10 분류는 gstack cso Phase 9의 audit mapping을 따른다.
