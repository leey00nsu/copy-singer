# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: openwiki-writing-style 결정 (2026-09-04)`
> 결정 ID는 Feature별로 독립된 번호를 사용하며 Feature ID와 관계없이 `D001`부터 시작합니다.

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
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
  - **Commit**: task checkpoint commit에서 확정한다.
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
