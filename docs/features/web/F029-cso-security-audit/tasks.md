# Tasks: cso-security-audit

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 상태를 갱신합니다.
- `[DOING] → [DONE]`: Acceptance와 Checklist를 실제 검증 후 함께 완료합니다.
- 감사 태스크(T01–T03)는 read-only이며 제품 코드 변경을 금지합니다.
- remediation(T04)는 `VERIFIED` 또는 confidence 8+ finding만 대상으로 합니다.
- secret value나 민감 payload는 canonical docs/commit에 기록하지 않습니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/cso-security-audit`
- **대기 중 변경 요청**: -
- **스펙 승인**: 2026-08-14 사용자 응답 `자동진행해줘`를 workflow 승인 옵션 `A`로 기록
- **구현 승인**: 2026-08-14 사용자 응답 `나머지 진행해줘` — workflow 승인 옵션 `A`
- **로컬 머지 승인**: 2026-08-14 별도 `local_merge` 경계를 사전 안내받은 뒤 동일 응답 `나머지 진행해줘`로 승인
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

---

## 태스크 목록

- [DONE][NON-PRD] T-F029-cso-security-audit-01 공격면·secret·공급망 read-only 감사
  - Date: 2026-08-14
  - Acceptance:
    - gstack cso Phase 0–8 중 architecture/surface/secrets/dependency/CI-CD/infra/integration/AI/skill-supply-chain 항목을 repo에 적용한다.
    - secret 후보는 실제 값을 출력하거나 Git에 기록하지 않는다.
    - CI/CD, IaC, repo-local skill처럼 존재하지 않는 surface도 `NOT_APPLICABLE` 또는 count 0으로 명시한다.
  - Checklist:
    - [x] Node/Python/Docker/DB/external integration architecture와 trust boundary를 inventory 한다.
    - [x] public/auth/admin/API/upload/worker/fetch/subprocess surface를 집계한다.
    - [x] `.env*` tracking/ignore와 Git history secret 후보를 redacted 방식으로 검사한다.
    - [x] pnpm/Python dependency 및 lockfile/supply-chain 상태를 검사한다.
    - [x] CI/CD, Docker/IaC, external integration, AI/skill supply-chain surface를 기록한다.
  - Evidence:
    - API route file 44개(관리자 20개), tracked Python source 29개, server fetch file 9개, raw SQL file 8개, subprocess/ffmpeg 관련 file 9개를 surface로 확인했다.
    - tracked IaC/deploy config는 root `docker-compose.yml`과 `services/vocal-profile-api/Dockerfile`; GitHub workflow 0개, repo-local AI skill 0개, LLM API/tooling indicator 0개다.
    - `.env.local`은 `.gitignore`로 제외되고 현재/과거 tracked `.env*`는 `.env.example`만 확인됐다. high-signal credential prefix/private-key 패턴은 current/history path scan 모두 0건이었다.
    - pnpm lockfile과 `allowBuilds` policy가 tracked 상태이며 `pnpm audit`은 high 3건(`image-size` 2, `nanoid` 1)을 candidate로 반환했다. `image-size`는 Storybook dev dependency 경로이며 `nanoid`는 Next/PostCSS 경로도 포함해 T03 reachability 검증 대상으로 남긴다.
    - pinned Python direct requirements는 `pip-audit --no-deps --disable-pip` 기준 확인한 파일에서 0건이었다. SoulX requirements는 non-exact range 때문에 동일 방식의 완전 감사가 불가해 supply-chain candidate로 남긴다.

- [DONE][NON-PRD] T-F029-cso-security-audit-02 애플리케이션 OWASP·STRIDE code-tracing 감사
  - Date: 2026-08-14
  - Acceptance:
    - auth/admin/owner scope, upload, raw SQL, URL fetch, media proxy, worker, Python service를 실제 code path로 추적한다.
    - OWASP A01–A10과 주요 component의 STRIDE threat를 evidence 기반으로 평가한다.
    - theoretical concern과 실제 exploit candidate를 구분한다.
  - Checklist:
    - [x] authentication/session/admin authorization과 IDOR/owner scope를 추적한다.
    - [x] file upload, private media, external URL/fetch, raw SQL, subprocess/ffmpeg 경로를 검사한다.
    - [x] Leemage/Modal/Google OAuth 및 Python service의 credential/request/response boundary를 검사한다.
    - [x] CSP/CORS/security header/error exposure/rate-abuse 관련 경계를 확인한다.
    - [x] OWASP/STRIDE/data classification matrix를 작성한다.
  - Evidence:
    - admin route 20개는 모두 `requireAdminApi`, auth/health를 제외한 사용자 API route는 모두 session/admin guard를 직접 적용한다. owner scope는 vocal profile, private media, recommendation, mixing job 경로에서 `session.user.id`까지 persistence query로 전달되는 것을 확인했다.
    - 회귀 검증은 auth DB 3/3, vocal-profile history UI 3/3 + private/owner 3/3, admin UI 4/4 + integration 1/1, mixing DB 1/1 PASS였다.
    - Prisma unsafe raw API 사용은 0건이며 raw SQL은 tagged template만 사용한다. YouTube source는 HTTPS/host/video-id를 검증한 뒤 shell이 아닌 argv subprocess로 전달하고, TLS verification disable/NEXT_PUBLIC credential 노출 패턴도 0건이었다.
    - Leemage/Modal machine credential은 server-only env에서 읽고 누락 시 fail-closed하며, Python Modal web app은 global API-key dependency와 constant-time 비교를 사용한다. private audio는 owner-scoped DB asset에서만 external URL을 얻어 `private, no-store`로 proxy한다.
    - OWASP/STRIDE mapping에서 A01/A03/A10 및 IDOR/SQLi/command injection/SSRF는 PASS evidence가 확보됐다. A02/A04/A05/A06 후보는 T03으로 좁혔다: known auth-secret fallback, vocal-analysis admission abuse, multipart pre-parse resource bound, transitive dependency advisories.
    - data classification은 Restricted=auth/session secret 및 사용자 원본 음성, Confidential=provider/Leemage/Modal credential과 분석·믹싱 artifact metadata, Internal=job/error/운영 metadata, Public=published catalog·marketing/legal로 분류했다.

- [DONE][NON-PRD] T-F029-cso-security-audit-03 candidate active verification 및 posture report
  - Date: 2026-08-14
  - Acceptance:
    - 모든 candidate에 severity/confidence/status/exploit scenario/evidence/recommendation이 있다.
    - `VERIFIED`, `UNVERIFIED`, `TENTATIVE`를 명확히 구분한다.
    - redacted `security-posture.md`를 생성하고 raw secret을 포함하지 않는다.
  - Checklist:
    - [x] broad scan candidate를 motivating source line까지 좁힌다.
    - [x] safe code tracing/local-only test로 false positive를 제거한다.
    - [x] VERIFIED candidate의 variant를 repo 전체에서 재검색한다.
    - [x] Phase 0–14 결과를 PASS/FINDING/NOT_APPLICABLE로 요약한다.
    - [x] remediation 대상(`VERIFIED` 또는 confidence 8+)을 T04 범위로 확정한다.
  - Evidence:
    - `security-posture.md`에 VERIFIED 3건을 확정했다: `SEC-01` auth secret fallback(HIGH, 10/10), `SEC-02` unbounded vocal-analysis admission(MEDIUM, 10/10), `SEC-03` multipart pre-parse body bound(MEDIUM, 8/10).
    - `SEC-01`은 production mode에서 auth secret env를 제거한 local import가 성공하는 것으로 fail-open을 재현했다. 실제 fallback 값은 report에 복제하지 않았다.
    - `SEC-02`는 local DB + mock storage로 동일 사용자 distinct idempotency 2건이 동시에 active job으로 admission되는 것을 재현하고 테스트 데이터를 삭제했다.
    - pnpm high advisory 3건은 `image-size` Storybook dev path 및 `nanoid` vulnerable custom-generator API 미사용을 확인해 TENTATIVE로 유지했다.
    - Phase 0–14 status, OWASP A01–A10, STRIDE, data classification, T04 remediation scope를 redacted report에 기록했다.

- [DONE][NON-PRD] T-F029-cso-security-audit-04 verified finding remediation 및 exit re-audit
  - Date: 2026-08-14
  - Acceptance:
    - VERIFIED 또는 confidence 8+ finding만 수정한다.
    - 수정된 finding에 regression/security test가 존재한다.
    - unresolved VERIFIED CRITICAL/HIGH가 없거나 명시적 risk acceptance가 기록된다.
  - Checklist:
    - [x] T03에서 확정된 `F029-SEC-01/02/03`만 remediation하고 tentative dependency 후보는 제품 security fix로 변경하지 않았다.
    - [x] SEC-03 동일 패턴 variant를 확인해 vocal-analysis뿐 아니라 admin catalog/custom-mixing multipart route도 공용 bounded reader로 통일했다.
    - [x] daily-style confidence 8/10 exit re-audit에서 unbounded `request.formData()` application variant 0, high-signal tracked secret file 0을 확인했다.
    - [x] `pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`, `pnpm run check:architecture`를 통과했다.
    - [x] Python 제품 코드 변경이 없어 Python service test 추가 실행은 불필요했다.
    - [x] docs와 Git diff에 raw secret이 새로 포함되지 않았음을 확인했다.
  - Evidence:
    - **SEC-01 RESOLVED**: production/test/dev secret policy를 분리하고 production에서 `BETTER_AUTH_SECRET` 누락 시 fail-closed하도록 변경했다. auth navigation regression 8/8 PASS.
    - **SEC-02 RESOLVED**: partial unique DB index로 사용자별 active `PENDING/PROCESSING` job을 1개로 제한하고 `ANALYSIS_BUSY` 409 contract를 추가했다. 순차 busy + 실제 concurrent distinct request race에서 1건만 admission되고 loser media cleanup까지 검증했으며 queue integration 6/6 PASS.
    - **SEC-03 RESOLVED**: streaming bounded multipart reader가 `Content-Length` 및 chunked body를 byte budget에서 중단하도록 하고 모든 application multipart route variant에 적용했다. bounded multipart + query/custom-mixing tests 32/32 PASS.
    - Prisma schema valid, 21 migrations 기준 local DB up-to-date, full `pnpm test` 및 Storybook 154/154 PASS, lint/typecheck/architecture PASS.
    - exit `pnpm audit`는 기존 high 3건(`image-size` 2, `nanoid` 1)을 그대로 반환했으나 T03 reachability 판정이 바뀌지 않아 `TENTATIVE` 상태를 유지한다.
    - Remediation commit: `771da70 fix(F029): verified security findings hardening`.

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [x] 테스트 실행 및 통과 기록 완료
- [x] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

- 2026-08-14 구현 승인: 사용자가 별도 구현 승인/로컬 머지 경계를 안내받은 뒤 응답 `나머지 진행해줘`로 남은 완료 흐름 진행을 승인함.

<!-- lee-spec-kit:workflow-sync 2026-08-14T10:23:28.000Z -->

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| redacted secret/history audit | `2026-08-14` | `PASS — tracked/history high-signal secret candidate 0; .env.local ignored` |
| Node/Python dependency audit | `2026-08-14` | `CANDIDATES — pnpm high 3; audited pinned Python direct deps 0; SoulX non-exact range unresolved` |
| OWASP/STRIDE code tracing | `2026-08-14` | `PASS/CANDIDATES — access-control/injection/SSRF 방어 확인; auth-secret/analysis-admission/multipart/dependency 후보를 T03로 승격` |
| `pnpm test` | `2026-08-14` | `PASS — full suite + Storybook 154/154` |
| `pnpm run lint` | `2026-08-14` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-14` | `PASS` |
| `pnpm run check:architecture` | `2026-08-14` | `PASS — Steiger 0 issues, architecture boundary 4/4` |
| security remediation targeted | `2026-08-14` | `PASS — auth 8/8, analysis queue 6/6 incl. concurrent race, query/custom-multipart 32/32` |
| exit static audit | `2026-08-14` | `PASS — unbounded multipart variant 0, high-signal tracked secret file 0, Prisma migration current` |
| Python service tests (if changed) | `2026-08-14` | `N/A — Python product code unchanged` |
