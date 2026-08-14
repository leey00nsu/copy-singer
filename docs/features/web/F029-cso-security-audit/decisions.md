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
