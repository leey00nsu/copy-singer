# Decisions: cso-security-audit

## 작성 규칙

- 각 결정은 Context / Constraints / Options / Decision / Rationale / Trace / Evidence / Consequences를 기록합니다.
- 감사 중 finding을 확정하거나 remediation 범위를 바꾸는 결정은 이 문서에 추가합니다.
- secret value와 민감 payload는 Evidence에 기록하지 않습니다.

---

## D029-01: gstack을 설치하지 않고 공개 cso v2 methodology를 수동 적용 (2026-08-14)

- **Context**: 사용자는 gstack `cso`가 어떤 항목을 검사하는지 확인한 뒤, 별도 설치 없이 동일한 기준으로 현재 repo를 감사하고자 했다.
- **Constraints**: 사용자 홈/global Codex skill 변경을 피하고 repo dependency도 추가하지 않는다. 공개 methodology와 실제 repo evidence만 사용한다.
- **Options**: (a) gstack 설치 후 `/cso`, (b) gstack source를 vendor, (c) 공개 `cso/SKILL.md`/`audit-phases.md`를 reference로 수동 적용.
- **Decision**: (c)를 채택한다.
- **Rationale**: 감사 기준을 재현하면서 사용자 환경과 repo dependency를 변경하지 않는다.
- **Trace**: F029 spec과 plan에 Phase 0–14 및 confidence/verification 원칙을 명시했다.
- **Evidence**: 공개 gstack cso v2 문서 기반. 실제 repo audit evidence는 T01–T03에서 추가한다.
- **Consequences**: 결과는 “gstack cso methodology 기반 수동 감사”이며 gstack runtime 자체가 생성한 report라고 표현하지 않는다.

---

## D029-02: read-only audit를 remediation보다 먼저 완료 (2026-08-14)

- **Context**: broad security scan은 false positive가 많고, 감사 도중 곧바로 코드를 고치면 원래 posture와 finding 근거가 섞일 수 있다.
- **Constraints**: gstack cso는 감사 스킬 자체가 코드를 수정하지 않고 posture/report/remediation을 제시하는 방식을 취한다.
- **Options**: (a) candidate 발견 즉시 수정, (b) T01–T03 감사/검증을 먼저 완료한 뒤 T04에서 수정.
- **Decision**: (b)를 채택한다.
- **Rationale**: candidate와 verified finding을 분리하고 false positive 기반의 불필요한 변경을 막는다.
- **Trace**: tasks.md T01–T03는 read-only, T04만 제품 코드 수정 가능으로 정의했다.
- **Evidence**: TBD — T03 posture report.
- **Consequences**: 감사 중 실제 high-risk candidate를 발견해도 먼저 안전한 code tracing으로 검증한 뒤 remediation한다. 단, 즉시 credential rotation이 필요한 실제 노출이 확인되면 사용자에게 별도 경고/결정을 요청한다.

---

## D029-03: 제품 코드 자동 remediation 기준은 VERIFIED 또는 confidence 8+ (2026-08-14)

- **Context**: comprehensive scan은 confidence 2 이상 tentative candidate까지 넓게 수집할 수 있다.
- **Constraints**: security hardening은 정상 auth/upload/worker 흐름을 깨뜨릴 수 있으므로 근거 없는 수정 비용이 크다.
- **Options**: (a) 모든 candidate 수정, (b) MEDIUM 이상 전부 수정, (c) VERIFIED 또는 confidence 8+만 자동 remediation.
- **Decision**: (c)를 채택한다.
- **Rationale**: gstack cso의 기본 8/10 confidence gate와 active verification 원칙을 따른다.
- **Trace**: spec/plan/tasks에 동일 threshold를 기록했다.
- **Evidence**: 실제 finding별 confidence/status는 `security-posture.md`에 기록한다.
- **Consequences**: confidence 8 미만 finding은 추가 evidence 또는 사용자 결정 전까지 TENTATIVE/UNVERIFIED로 남는다.

---

## D029-04: secret-safe / non-invasive verification (2026-08-14)

- **Context**: secret history와 SSRF/webhook/integration 검사는 감사 자체가 새로운 유출이나 외부 공격 트래픽을 만들 위험이 있다.
- **Constraints**: raw credential과 개인 음성은 민감하며 live production service에 공격성 요청을 보내면 안 된다.
- **Options**: (a) live credential/API verification, (b) raw grep 결과 보관, (c) path/commit/pattern만 기록하고 code tracing/local-only test 사용.
- **Decision**: (c)를 채택한다.
- **Rationale**: exploitability 근거를 확보하면서도 새로운 secret exposure와 외부 side effect를 피한다.
- **Trace**: spec Phase 2/6/12/14와 plan Evidence 방식에 반영했다.
- **Evidence**: 감사 command는 가능한 한 filename/commit/status만 출력하도록 구성한다.
- **Consequences**: 일부 finding은 live exploit 없이 UNVERIFIED로 남을 수 있으며, 그 경우 과장해 VERIFIED로 승격하지 않는다.

---

## D029-05: T04 remediation은 verified 3건으로 제한 (2026-08-14)

- **Context**: T01–T03 감사에서 auth secret fallback, vocal-analysis admission, multipart pre-parse resource bound가 구체적인 source/exploit path를 가진 candidate로 남았고, pnpm high advisory 3건은 transitive dependency에서만 탐지됐다.
- **Constraints**: T04는 `VERIFIED` 또는 confidence 8+만 수정한다. dependency advisory는 upstream severity만으로 제품 exploitability를 가정하지 않는다.
- **Options**: (a) audit에서 나온 모든 advisory/observation을 수정, (b) verified 3건만 수정하고 reachability가 없는 dependency 후보는 report에 유지, (c) remediation 없이 report만 종료.
- **Decision**: (b)를 채택한다. `F029-SEC-01` production auth secret fail-closed, `F029-SEC-02` per-user active vocal-analysis admission bound, `F029-SEC-03` bounded multipart pre-parse를 T04 대상으로 확정한다.
- **Rationale**: 세 건은 각각 production-mode local verification, local DB/mock-storage active verification, route-level body-consumption tracing으로 confidence 8+ evidence가 있다. `image-size`는 Storybook dev path, `nanoid`는 vulnerable custom-generator API의 repo 직접 사용이 없어 자동 security fix 근거가 부족하다.
- **Trace**: 상세 severity/confidence/exploit scenario는 아래 D029-06 canonical summary와 Git ignored local-only `security-posture.md`에 기록했다.
- **Evidence**: auth module은 production + secret 미설정 상태에서 초기화 성공; 동일 사용자 distinct idempotency 2건이 active queue로 동시 admission됨; 두 multipart route 모두 `request.formData()` 후에 25MB policy를 적용한다.
- **Consequences**: T04는 제품 보안 경계 세 곳만 최소 변경하고 dependency 후보는 exit audit에서 재확인한다.

---

## D029-06: first-run Security Posture 확정 (2026-08-14)

- **Context**: lee-spec-kit은 feature folder에 `spec.md`, `plan.md`, `tasks.md`, `decisions.md`, `issue.md`, `pr.md` 외의 canonical file을 허용하지 않는다. 따라서 상세 report 파일은 local-only evidence로 두고 canonical posture를 이 결정에 남긴다.
- **Constraints**: raw secret value나 private payload는 기록하지 않는다. finding은 concrete exploit path와 confidence/status가 있어야 한다.
- **Options**: (a) 비정규 `security-posture.md`를 commit, (b) report를 폐기, (c) 상세 local report는 Git ignored로 유지하고 canonical 요약을 decisions/tasks에 기록.
- **Decision**: (c)를 채택한다.
- **Rationale**: 감사 evidence는 보존하면서 lee-spec-kit taxonomy와 secret-safe persistence 원칙을 모두 지킨다.
- **Trace**:

| ID | Severity | Confidence | Status | Canonical finding |
| --- | --- | --- | --- | --- |
| `F029-SEC-01` | HIGH | 10/10 | VERIFIED | production에서 auth secret 미설정 시 repository-known fallback으로 초기화가 성공하는 fail-open 구성 |
| `F029-SEC-02` | MEDIUM | 10/10 | VERIFIED | 한 authenticated user가 distinct idempotency key로 active vocal-analysis job을 제한 없이 admission 가능 |
| `F029-SEC-03` | MEDIUM | 8/10 | VERIFIED (application layer) | 두 vocal-analysis multipart route가 body byte cap 적용 전에 `request.formData()`로 전체 body를 소비 |
| `DEP-01` | upstream HIGH | 3/10 | TENTATIVE | `image-size@2.0.2` advisory는 Storybook dev dependency path만 확인 |
| `DEP-02` | upstream HIGH | 3/10 | TENTATIVE | `nanoid@3.3.17` advisory는 vulnerable custom-generator API의 repo 직접 사용이 없음 |
| `DEP-03` | MEDIUM observation | 5/10 | UNVERIFIED | SoulX Python non-exact requirement range는 resolved-version 기준 재현 감사가 불완전 |

- **Evidence**:
  - A01 Broken Access Control: PASS — admin guard coverage와 owner/private-media integration tests 통과.
  - A02/A07: `F029-SEC-01` finding.
  - A03 Injection/A10 SSRF: PASS — unsafe Prisma raw API 0, strict YouTube identity validation, argv subprocess, persisted storage URL proxy.
  - A04/A05: `F029-SEC-02`, `F029-SEC-03` finding.
  - A06: transitive advisory candidates만 남고 verified product exploit path는 없음.
  - A08: PASS — Modal artifact integrity/server-only credential boundary 확인.
  - A09: durable error/attempt state는 존재하며 별도 exploitable finding 없음.
  - STRIDE: auth Spoofing root secret과 analysis DoS만 finding으로 승격; admin tampering/elevation, media disclosure, SQL injection, Modal spoofing 경로는 현재 controls로 PASS.
  - Data classification: Restricted=auth/session secret·사용자 원본 음성, Confidential=provider/Leemage/Modal credential·private artifact metadata, Internal=job/error/ops metadata, Public=published catalog·marketing/legal.
  - Phase 0–14: 0/1/2 PASS, 3 CANDIDATES, 4 NOT_APPLICABLE, 5 PASS/OBSERVATION, 6 PASS, 7/8 NOT_APPLICABLE, 9/10 FINDINGS, 11/12 PASS, 13 T04 PENDING, 14 PASS.
- **Consequences**: T04는 세 VERIFIED finding만 수정한다. dependency 후보는 제품 security fix로 강제하지 않고 exit audit에서 다시 분류한다.

---

## D029-07: verified finding remediation과 exit re-audit 완료 (2026-08-14)

- **Context**: D029-05에서 확정한 `F029-SEC-01/02/03`을 T04에서 최소 범위로 수정하고 daily-style confidence gate로 재검증했다.
- **Constraints**: 정상 auth/upload/admin/worker 경로를 유지하고, migration은 기존 active duplicate를 임의로 정리하지 않으며, dependency candidate는 reachability 없이 강제 업그레이드하지 않는다.
- **Options**: (a) app-layer check만 추가, (b) auth fail-closed + DB admission invariant + bounded multipart reader를 함께 적용, (c) report만 유지하고 risk acceptance.
- **Decision**: (b)를 적용했다.
- **Rationale**: 세 finding의 exploit-enabling primitive를 각 경계에서 직접 제거하고 race/variant까지 방어한다.
- **Trace**:
  - `F029-SEC-01`: production/test 환경 정책을 분리한 `resolveAuthSecret`을 도입해 production에서 explicit secret 없이는 auth 초기화가 실패한다.
  - `F029-SEC-02`: pre-admission active check와 PostgreSQL partial unique index `VocalProfileAnalysisJob_one_active_per_user`를 함께 적용하고 conflict는 `ANALYSIS_BUSY`로 처리한다. 기존 idempotency race는 유지한다.
  - `F029-SEC-03`: shared `readBoundedMultipartFormData`가 declared length와 실제 stream byte를 모두 제한하며, vocal profile 2개 route뿐 아니라 발견된 admin multipart variant까지 모두 이 경계를 사용한다.
- **Evidence**:
  - implementation commit: `771da70 fix(F029): verified security findings hardening`.
  - exit verification: production + secret unset import=`FAILED`; active-admission DB index=1; `src/_app/api-routes`의 direct `request.formData()`=0.
  - targeted: auth navigation 8/8, bounded multipart 3/3, vocal analysis queue 6/6, query contract 27/27 + server tests 5/5, admin 4/4 + 1/1, song analysis/admin catalog 6/6.
  - quality: lint PASS, typecheck PASS, Steiger 0 issue + architecture 4/4, `git diff --check` PASS.
  - full regression: 최초 Storybook 3개 readiness/timing flake 후 해당 files 16/16 PASS, 최종 `pnpm test` 전체 Storybook 154/154 PASS.
  - dependency exit audit: critical 0, high 3(`image-size`, `nanoid`)로 T03와 동일하며 verified product path는 새로 확인되지 않았다.
  - secret-safe diff count: private-key marker 0, provider-key prefix 0.
- **Consequences**: audit에서 확인된 VERIFIED CRITICAL/HIGH는 unresolved 0이며, dependency advisory는 TENTATIVE 상태로 일반 dependency maintenance에서 추적한다. Python service 코드는 변경하지 않았다.

---

## D029-07: VERIFIED 3건 remediation 완료 및 exit posture 확정 (2026-08-14)

- **Context**: T03에서 `F029-SEC-01/02/03` 세 건이 remediation threshold를 충족했고, T04에서 실제 hardening과 regression test를 적용했다.
- **Constraints**: tentative dependency advisory는 제품 exploit path가 확인되지 않았으므로 security fix 범위에 포함하지 않는다. Python 제품 코드는 변경하지 않는다.
- **Options**: (a) verified 3건만 최소 수정, (b) advisory까지 광범위 dependency update, (c) report만 남기고 수정하지 않음.
- **Decision**: (a)를 완료했다. SEC-01은 production auth secret fail-closed, SEC-02는 DB partial unique index 기반 사용자별 active analysis 1건 + `ANALYSIS_BUSY`, SEC-03은 shared bounded multipart reader 및 동일 application variant 적용으로 닫았다.
- **Rationale**: 세 변경 모두 원래 exploit path를 직접 차단하면서 기존 auth/admin/upload/worker 정상 경로를 유지한다. dependency 후보는 reachability evidence가 바뀌지 않았다.
- **Trace**:
  - `F029-SEC-01`: production secret 누락 시 throw, development/test fallback만 허용.
  - `F029-SEC-02`: `PENDING/PROCESSING` partial unique index + application pre-check/409; 실제 concurrent distinct request에서 one-winner invariant와 loser media cleanup 검증.
  - `F029-SEC-03`: `Content-Length` 사전 거절과 chunked stream byte cap을 가진 bounded reader; vocal-analysis 및 같은 `request.formData()` variant에 적용.
- **Evidence**:
  - Commit: `771da70 fix(F029): verified security findings hardening`.
  - Targeted: auth navigation 8/8, vocal-analysis queue 6/6, query/custom multipart 32/32 PASS.
  - Full: `pnpm test` PASS (Storybook 154/154 포함), `pnpm run lint` PASS, `pnpm exec tsc --noEmit` PASS, `pnpm run check:architecture` PASS.
  - Exit static audit: application `request.formData()` unbounded variant 0, high-signal tracked secret file 0, Prisma schema valid 및 21 migrations local DB up-to-date.
  - Dependency audit: high 3건은 기존 `image-size`/`nanoid` tentative 후보로 유지; verified product call path는 새로 확인되지 않았다.
- **Consequences**: unresolved VERIFIED CRITICAL/HIGH finding은 0건이다. F029는 implementation approval checkpoint로 이동할 수 있으며, tentative dependency 후보는 일반 dependency maintenance 또는 별도 verified finding이 생길 때 다룬다.
