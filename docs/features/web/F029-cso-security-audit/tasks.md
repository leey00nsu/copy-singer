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
- **구현 승인**: -
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

---

## 태스크 목록

- [TODO][NON-PRD] T-F029-cso-security-audit-01 공격면·secret·공급망 read-only 감사
  - Date: 2026-08-14
  - Acceptance:
    - gstack cso Phase 0–8 중 architecture/surface/secrets/dependency/CI-CD/infra/integration/AI/skill-supply-chain 항목을 repo에 적용한다.
    - secret 후보는 실제 값을 출력하거나 Git에 기록하지 않는다.
    - CI/CD, IaC, repo-local skill처럼 존재하지 않는 surface도 `NOT_APPLICABLE` 또는 count 0으로 명시한다.
  - Checklist:
    - [ ] Node/Python/Docker/DB/external integration architecture와 trust boundary를 inventory 한다.
    - [ ] public/auth/admin/API/upload/worker/fetch/subprocess surface를 집계한다.
    - [ ] `.env*` tracking/ignore와 Git history secret 후보를 redacted 방식으로 검사한다.
    - [ ] pnpm/Python dependency 및 lockfile/supply-chain 상태를 검사한다.
    - [ ] CI/CD, Docker/IaC, external integration, AI/skill supply-chain surface를 기록한다.

- [TODO][NON-PRD] T-F029-cso-security-audit-02 애플리케이션 OWASP·STRIDE code-tracing 감사
  - Date: 2026-08-14
  - Acceptance:
    - auth/admin/owner scope, upload, raw SQL, URL fetch, media proxy, worker, Python service를 실제 code path로 추적한다.
    - OWASP A01–A10과 주요 component의 STRIDE threat를 evidence 기반으로 평가한다.
    - theoretical concern과 실제 exploit candidate를 구분한다.
  - Checklist:
    - [ ] authentication/session/admin authorization과 IDOR/owner scope를 추적한다.
    - [ ] file upload, private media, external URL/fetch, raw SQL, subprocess/ffmpeg 경로를 검사한다.
    - [ ] Leemage/Modal/Google OAuth 및 Python service의 credential/request/response boundary를 검사한다.
    - [ ] CSP/CORS/security header/error exposure/rate-abuse 관련 경계를 확인한다.
    - [ ] OWASP/STRIDE/data classification matrix를 작성한다.

- [TODO][NON-PRD] T-F029-cso-security-audit-03 candidate active verification 및 posture report
  - Date: 2026-08-14
  - Acceptance:
    - 모든 candidate에 severity/confidence/status/exploit scenario/evidence/recommendation이 있다.
    - `VERIFIED`, `UNVERIFIED`, `TENTATIVE`를 명확히 구분한다.
    - redacted `security-posture.md`를 생성하고 raw secret을 포함하지 않는다.
  - Checklist:
    - [ ] broad scan candidate를 motivating source line까지 좁힌다.
    - [ ] safe code tracing/local-only test로 false positive를 제거한다.
    - [ ] VERIFIED candidate의 variant를 repo 전체에서 재검색한다.
    - [ ] Phase 0–14 결과를 PASS/FINDING/NOT_APPLICABLE로 요약한다.
    - [ ] remediation 대상(`VERIFIED` 또는 confidence 8+)을 T04 범위로 확정한다.

- [TODO][NON-PRD] T-F029-cso-security-audit-04 verified finding remediation 및 exit re-audit
  - Date: 2026-08-14
  - Acceptance:
    - VERIFIED 또는 confidence 8+ finding만 수정한다.
    - 수정된 finding에 regression/security test가 존재한다.
    - unresolved VERIFIED CRITICAL/HIGH가 없거나 명시적 risk acceptance가 기록된다.
  - Checklist:
    - [ ] T03에서 확정된 finding만 최소 범위로 수정한다. finding이 없으면 no-op 근거를 기록한다.
    - [ ] 동일 패턴 variant와 정상 사용자/관리자/worker 경로 회귀를 테스트한다.
    - [ ] daily-style confidence 8/10 gate로 exit re-audit를 수행한다.
    - [ ] `pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`, `pnpm run check:architecture`를 통과한다.
    - [ ] Python 변경 시 관련 service test를 통과한다.
    - [ ] docs와 Git diff에 raw secret이 새로 포함되지 않았음을 확인한다.

---

## 완료 조건

- [ ] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [ ] 테스트 실행 및 통과 기록 완료
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| redacted secret/history audit | - | - |
| Node/Python dependency audit | - | - |
| OWASP/STRIDE code tracing | - | - |
| `pnpm test` | - | - |
| `pnpm run lint` | - | - |
| `pnpm exec tsc --noEmit` | - | - |
| `pnpm run check:architecture` | - | - |
| Python service tests (if changed) | - | - |
