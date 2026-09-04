# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: openwiki-writing-style 결정 (2026-09-04)`
> 결정 ID는 Feature별로 독립된 번호를 사용하며 Feature ID와 관계없이 `D001`부터 시작합니다.

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 수동 기록도 마지막 ADR 뒤에 ID 순서대로 추가한다. 같은 결정의 반복 검증은 Trace/Evidence를 갱신하며 기존 ID는 유지한다.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.
- 디자인 시스템 변경이나 예외를 기록할 때는 영향 받는 규칙과 범위, 예외 이유, 제거 조건, 실행 가능한 정본의 동기화 영향을 함께 남깁니다.

---

## D001: 로컬 0.9.12의 관리형 writing policy로 Knowledge를 재생성한다 (2026-09-04)

- **Context**: F040에서 생성한 OpenWiki는 코드 근거와 provenance를 제공하지만 writing policy가 없어 사람을 위한 설명 순서와 문장 품질을 일관되게 요구할 수 없다.
- **Constraints**: lee-spec-kit 0.9.12는 아직 registry에 배포하지 않는다. CopySinger의 기존 schema 2 receipt와 사용자 INSTRUCTIONS를 보존하면서, 사용자 소유 OpenWiki skill을 덮지 않아야 한다.
- **Options**: 생성 문서를 직접 윤문하는 방식은 다음 생성에서 사라지고 derived surface를 수동 SSOT처럼 만든다. CopySinger 전용 지침만 추가하면 writing policy 교체와 provenance가 소비자 저장소에 결합된다. 로컬 0.9.12의 관리형 skill·INSTRUCTIONS 어댑터를 쓰면 정책 소유권과 생성물 검증을 lee-spec-kit 경계에 유지할 수 있다.
- **Decision**: 로컬 build의 CLI를 직접 실행하고, workflow Knowledge gate가 관리형 skill 설치·지침 연결·schema 3 receipt·재생성을 원자적으로 처리하게 한다.
- **Rationale**: 생성 Markdown을 수동 관리하지 않으면서 writing style을 lee-spec-kit의 교체 가능한 adapter 경계에 유지하고, 실제 소비자 저장소에서 배포 전에 검증할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 로컬 CLI가 0.9.12이고 CopySinger receipt가 schema 2이며 `~/.openwiki/skills/lee-spec-kit-technical-writing`이 아직 없음을 확인했다. 기존 INSTRUCTIONS를 기준선으로 보존한다.
  - **DONE 전 확정 시점**: `knowledge doctor`가 OpenWiki 0.5.0/OKF 0.2, `openai-chatgpt`의 `gpt-5.6-luna`, OAuth credential 준비를 확인했다. 기존 receipt는 schema 2여서 `OPENWIKI_WRITING_POLICY_STALE`로 판정됐고 전체 재생성 대상이 맞다.
  - **머지 후 확인**: 실제 결과/영향
- **Evidence**:
  - **Commit**: task checkpoint `f4c1c182df39fb7f9584c00c91bef0dc68ee9a51`.
  - **PR**: PR 링크
  - **Test/Log**: 로컬 CLI `--version`, `detect --json`, `knowledge doctor --json`; 기존 INSTRUCTIONS `sha256:6edc1607029c8f9cc3fea2683e7a56a14189c0a1917b8df70372f9cc3f7f64db`; writing skill 경로 부재 확인.
- **Consequences**: task checkpoint 뒤 workflow의 Knowledge gate가 외부 skill 설치와 generated surface 갱신을 수행한다. 앱 코드와 curated docs는 변경하지 않는다.

---

## D002: Feature review의 독자용 원문 링크 누락을 project instruction으로 보완한다 (2026-09-04)

- **Review metadata**:
  - **Reviewer**: `/root/f041_feature_review_r1` (`feature_reviewer`, read-only)
  - **Configured model / effort**: `inherit` / `high`
  - **Round**: 1 / max review rounds 1
  - **Target**: `eb164d718d66b2ce3e177fc03727ae60ec0add3d..1d8d703b5e80a6c7ed2c800f21e1b5454c3e2e2a`
  - **Tree**: `f76ec37fd7fa3cdc4f873fcb58265d8fc152338b`
  - **Decision**: `changes_requested`
- **Finding**: schema 3 receipt와 15개 claim 파일은 177개 claim, `repo-lines-v1` 451개, `repo-file-v1` 18개를 검증했지만, 대표 문서 `quickstart.md`, `architecture/system-map.md`, `workflows/vocal-profile-analysis.md`에는 독자가 누를 수 있는 `repo://` Markdown 원문 링크가 없었다. 15개 상세 문서 중 직접 원문 링크가 있는 문서도 4개뿐이었다.
- **Positive evidence**: 관리형 skill 설치, 기존 INSTRUCTIONS 보존, 단일 managed block, writing policy provenance, 전체 생성과 audit은 계획대로 동작했다. 표본 문서는 결론 우선 구조, 일관된 용어와 정확한 worker·route·상태 경계를 제공했다.
- **Decision**: generated Markdown을 직접 수정하지 않는다. `openwiki/INSTRUCTIONS.md`의 project-specific 영역에 모든 non-index 상세 페이지가 중요한 tracked source/test로 이동할 수 있는 최소 하나의 설명형 `repo://` Markdown 링크를 제공하도록 명시하고 Knowledge를 다시 생성한다.
- **Rationale**: machine claim evidence는 무결성 검증에 충분하지만 신규 개발자의 원문 탐색 경로를 대신하지 않는다. CopySinger의 표본 acceptance를 충족하면서 관리형 skill block과 프로젝트별 보완 규칙의 소유권을 분리한다.
- **Evidence**:
  - **Review commands**: supplied SHA/tree 확인, `knowledge audit`, `knowledge doctor`, 15개 페이지의 source-link coverage 검사, 표본 문서와 tracked source 대조.
  - **Audit**: source `f4c1c182df39fb7f9584c00c91bef0dc68ee9a51`, output `sha256:c441406616b7f2e3f2c60c86d54dee4577e735ccc6ac4ab68ad95559daa73b8e`.
- **Residual risks**:
  - `maxReviewRounds=1`이므로 remediation 결과는 두 번째 fresh 독립 리뷰를 받지 않는다. 수정 후 원문 링크 coverage와 audit을 메인 에이전트가 직접 검증한다.
  - 0.9.12 기본 writing skill은 evidence link를 권장하지만 상세 페이지별 최소 원문 링크를 보장하지 않는다. 다른 소비자에서도 같은 기준이 필요하면 후속 lee-spec-kit 버전에서 기본 policy 강화를 별도로 검토해야 한다.
- **Remediation outcome**:
  - `openwiki/INSTRUCTIONS.md`의 project-specific 영역에 non-index 상세 페이지마다 최소 하나의 설명형 `repo://` source/test 링크를 요구하는 규칙을 추가했다. 관리형 writing block과 기존 사용자 지침은 보존했다.
  - 첫 update run은 기본 절대 상한 30분에 8/15 페이지를 완료하고 `OPENWIKI_ABSOLUTE_TIMEOUT`을 반환했다. 같은 run ID `97f97a25-e211-420e-b4c4-d45b76d7f509`를 idle 20분·absolute 90분으로 재개해 15/15, skipped 0으로 완료했다.
  - 최종 receipt는 source `39e94cf4fcfae1f66ebe11b04a5740753acc9eb9`, output `sha256:2fb848800cc57126cc98decf3527328b315da1bc8b168b5ffecf74fb5dca3b64`를 기록한다. `knowledge audit`은 15 claim files, 261 claims, 623 repo-line evidence, 46 repo-file evidence를 검증했다.
  - 최종 source-link coverage는 15개 상세 페이지 중 4개만 한 개 이상의 `repo://` Markdown 링크를 포함했다. 대표 문서 세 개는 여전히 0개여서 review finding은 해결되지 않았다.
  - generated Markdown을 수동 수정하지 않았다. remediation Knowledge commit은 `fe26e8532d5a3ffb6442d19c02bfc715691df821`이며 review target 이후 변경이지만 최대 Round 소진 정책에 따라 별도 fresh 리뷰를 실행하지 않는다.

---

## D003: 제공된 adapter 1.2.0을 적용해 생성 결과를 검증한다 (2026-09-05)

- **Context**: 제공된 직접 윤문본과 비교하면 이전 결과에는 해요체 계약과 독자 목적별 구성 지침이 부족했다.
- **Decision**: 로컬 lee-spec-kit 0.9.12, writing adapter 1.2.0을 사용해 전체 Knowledge를 재생성했다. 생성 문서는 직접 교정하지 않았다.
- **Trace**: run `adb56e67-6687-4b81-bc28-54d4ab242a6d`가 9개 페이지를 완료했다. 모든 job에서 해요체·행동형 문장·출처 링크 지침 전달을 확인했다. 첫 검사는 목록의 `만료됨`을 오탐해 receipt 기록을 차단했다. lee-spec-kit에서 명사형 오탐과 중첩 경로 오류 표시를 수정한 뒤 run `b0e557e1-539a-40e6-963a-65d89cc5e85d`가 기존 페이지를 보존하는 0-page update로 검증을 완료했다.
- **Evidence**: `knowledge sync`는 `OPENWIKI_SYNCED`, `knowledge audit`는 검증 후 커밋 대기인 `OPENWIKI_COMMIT_REQUIRED`를 반환했다. 상세 페이지 9개, 유효한 본문 출처 링크 85개, claims 93개, repo-line evidence 201개를 검증했다. Receipt는 `.lee-spec-kit/openwiki-sync.json`, output hash는 `sha256:1f185f7d4567b9b718c96681621af7270c9845d072da9bcbb62854fcfc67d2dc`다. lee-spec-kit 전체 359개 회귀 테스트와 이후 오탐/중첩 경로에 관한 표적 검사가 통과했다.
- **Outcome**: 빠른 시작·시스템 경계·테스트 선택 표본에 해요체, 행동형 안내, 결론 우선, 본문 출처 링크가 적용됐다. 이전 D002의 출처 링크 누락은 이번 결과에서 해소됐다. 이는 메인 에이전트 검증이며 fresh 독립 Feature 리뷰를 수행했다는 뜻은 아니다.
- **Residual risks**: OpenWiki 기본 플래너가 `architecture/concepts` 등 시스템 중심 분류를 유지했다. 일반 영문 용어와 긴 문단도 일부 남아 있으므로 제공된 윤문본과 동일한 전체 편집 품질이나 독자 목적별 정보 구조를 완전히 달성했다고 보지 않는다. 자동 문체 검사는 문장 의미·문서 누락·톤의 모든 측면을 보증하지 않는다.

---

## D004: F041을 제공된 writing skill의 소비자 적용 범위로 명확히 한다 (2026-09-05)

- **Context**: 이전 기록에 정책 설계와 소비자 적용 요구사항이 섞여 있었다.
- **Decision**: Spec과 Plan은 제공된 policy의 설치·생성·검증만 정의한다. 문체·분할·편집 규칙과 adapter·검사 로직은 lee-spec-kit이 소유한다.
- **Trace**: D001~D003은 실험 이력으로 보존한다. 이 기록의 정책 수정 내역을 CopySinger의 구현 책임으로 해석하지 않는다. 이번 검증은 제공된 adapter 1.3.0의 적용 효과를 관찰한다.
- **Evidence**: [spec.md](./spec.md)의 제외 범위와 [plan.md](./plan.md)의 소유권 표를 docs checkpoint `f5518050f6a5ce392ef4c8c755ae90b1841770c9`에 반영했다. Run `b78ee63f-ea5d-4ac6-acaa-7c9710dc273a`는 제공된 adapter 1.3.0으로 상세 페이지 9개를 생성했지만, 최종 sync는 `OPENWIKI_OUTPUT_INVALID`로 실패했다. `operations/configuration-and-deployment.md:186`의 `repo://prisma/migrations`가 일반 파일이 아닌 Git tree를 가리킨다. 성공 receipt는 새로 기록되지 않았으며 남아 있는 adapter 1.2.0 receipt는 이번 결과의 검증 증거가 아니다.
- **Observed improvement**: 빠른 시작의 실행 순서·단계별 확인 지점·목적별 다음 문서 안내, 변경 검증의 실행 순서와 선택표를 확인했다. 해요체와 워커·수명 주기·변경 범위 테스트 용어가 적용됐다. 9개 상세 페이지 모두 본문 출처 링크를 포함하며 총 73개 링크 후보가 있지만, 위 오류 때문에 전체 출처 검증 통과로 기록하지 않는다.
- **Residual risks**: 시스템 중심 디렉터리, 혼합된 문서 유형, 긴 문단과 영문 일반 용어가 남아 있다. 운영 문서의 `.env.example` 미확인 설명은 `git ls-files -- .env.example`의 tracked 파일 존재와 어긋나므로 입력 가시성과 실제 파일 존재를 구분해야 한다. 메인 에이전트 표본 검사이며 의미 정확성 전체 검증이나 fresh 독립 리뷰가 아니다.
- **Ownership and status**: 문체·생성 지침과 검증 후 상태 진단은 lee-spec-kit에서 다룬다. 이번 실험에서 audit이 생성 완료 후 검증 실패를 큐 저장 전 중단으로 안내하는 결함을 발견해 toolkit에서 `OPENWIKI_POST_GENERATION_VALIDATION_PENDING`으로 구분하도록 수정하고 회귀 검사를 통과했다. 생성 Markdown은 수동 수정하지 않았고 Knowledge commit·Feature 완료·통합 승인은 진행하지 않는다. 생성 오류를 해결한 후 sync와 audit을 다시 통과해야 한다.
- **후속 재검증 계획**: lee-spec-kit commit `3157f4f`의 로컬 0.9.12/adapter 1.4.0을 적용한다. 기존 OpenWiki provider와 모델을 유지하고 이번 실행에만 absolute timeout 90분을 사용한다. 출처 오류 수정 경로와 입력 가시성 표현, 편집 결과를 실제 생성 후 확인하며 종료 전 성공으로 기록하지 않는다.
