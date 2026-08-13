# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D024: admin-song-catalog-management 결정 (2026-08-13)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 카탈로그 런타임 SSOT와 revision 경계 (2026-08-13)

- **Context**: 현재 JSON artifact는 정적 100곡의 분석 재현에는 유리하지만 runtime direct import와 정확히 100곡 검증 때문에 관리자 변경이 재배포를 요구하고 영상 교체 중간 상태를 표현할 수 없다.
- **Constraints**: 서비스는 아직 배포 전이라 DB 호환 migration은 요구되지 않는다. 기존 100곡 READY 분석값, 추천 결정성, analyzer contract와 target asset 안전성은 보존해야 한다.
- **Options**: JSON을 관리자 UI가 직접 수정, Song.metadata JSON에 전부 저장, 현재 Song/VocalProfile을 mutable하게 확장, 곡·출처·분석·카탈로그를 normalized revision 모델로 분리.
- **Decision**: PostgreSQL을 runtime SSOT로 전환하고 `SongSource`와 `SongAnalysis`를 immutable revision으로, `CatalogEntry`를 곡 identity와 분리한다. `Song`은 active source/analysis/target pointer를 소유하고 추천은 published+READY DB snapshot만 사용한다. 기존 JSON은 bootstrap/export/fixture로만 유지한다.
- **Rationale**: DB transaction으로 준비되지 않은 revision의 부분 공개를 막고, 출처 교체·재분석 이력과 과거 추천 근거를 보존하면서 앱 재배포 없이 카탈로그를 확장할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 구현 승인 전 설계 단계에서 JSON direct write보다 normalized DB revision과 active pointer 전환이 교체 원자성과 재현성을 가장 잘 만족한다고 판단했다.
  - **DONE 전 확정 시점**: -
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: -
  - **PR**: -
  - **Test/Log**: 기존 JSON/DB runtime coupling 조사 — `recommendation-service.ts`, `recommendation-data.ts`, `target-assets.ts`, Prisma `Song`
- **Consequences**: 기존 F003 D005의 JSON SSOT 결정은 F024 완료 시 superseded가 된다. 개발 DB는 reset/bootstrap이 필요하고 초기 배포 절차에 bootstrap 검증이 추가된다.

## D002: 관리자 분석·공개 lifecycle (2026-08-13)

- **Context**: 영상 분석은 수분이 걸릴 수 있고 target upload와 분석 중 하나만 성공할 수 있어 동기 HTTP 등록이나 즉시 공개는 불완전한 추천·믹싱 상태를 만든다.
- **Constraints**: 일반 사용자는 관리자 mutation에 접근할 수 없어야 하고, 재시작·재시도·중복 클릭에도 같은 source revision이 중복 활성화되면 안 된다.
- **Options**: 등록 요청에서 동기 분석, 분석 성공 즉시 자동 공개, durable job과 관리자 명시 공개 gate.
- **Decision**: source 등록과 durable analysis job 생성을 transaction으로 묶고, target upload는 source revision에 결합한다. READY analysis와 READY target이 모두 일치할 때만 관리자 publish transaction이 active pointer와 catalog entry를 한 번에 전환한다.
- **Rationale**: 긴 작업을 request timeout과 분리하고 기존 READY revision을 유지한 채 새 revision을 준비할 수 있다. 명시 공개는 잘못된 영상·분석의 자동 노출을 막는다.
- **Trace**:
  - **DOING 시작 시점**: 기존 vocal/mixing queue의 claim·retry 패턴을 재사용하되 곡 분석 전용 상태와 payload로 분리하는 방향을 선택했다.
  - **DONE 전 확정 시점**: -
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: -
  - **PR**: -
  - **Test/Log**: -
- **Consequences**: 관리자는 분석 완료와 target 준비 후 별도 공개 action을 수행한다. 새 revision 준비 중에도 기존 공개 곡은 계속 추천 가능하다.

## D003: 교체 음원 삭제 순서 (2026-08-13)

- **Context**: 사용자가 신규 영상 ID가 포함된 m4a 네 파일을 `tmp/catalog-targets`에 추가했고 기존 잘못된 ID의 m4a 네 파일 삭제를 명시적으로 요청했다.
- **Constraints**: 잘못된 파일을 먼저 삭제하면 신규 파일 검증·업로드 실패 시 복구 입력이 사라질 수 있다. remote asset이 기존 MixingJob에 참조되면 즉시 삭제할 수 없다.
- **Options**: 즉시 기존 파일 삭제, 새 파일 확인 후 로컬만 삭제, 새 analysis/target 활성화 후 로컬과 참조 없는 remote asset 정리.
- **Decision**: 신규 파일의 video ID·MIME·크기·hash를 먼저 검증하고 새 source analysis와 target을 READY로 활성화한 뒤 기존 로컬 파일 네 개를 삭제한다. 기존 remote asset은 참조 수가 0일 때만 삭제하고 아니면 superseded 상태로 보존한다.
- **Rationale**: 사용자의 삭제 요청을 이행하면서도 신규 처리 실패 시 되돌릴 수 있는 안전 경계를 확보하고 과거 믹싱 참조를 깨뜨리지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 신규 ID `HdTUQhHHJEg`, `vepz3RlTd4M`, `saK6H76TyMI`, `zBTINvN-rCk` 파일과 기존 ID 파일 네 개가 local staging에 함께 존재함을 확인했다.
  - **DONE 전 확정 시점**: -
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: -
  - **PR**: -
  - **Test/Log**: `find`/`ls -lah tmp/catalog-targets` identity 확인
- **Consequences**: 실제 삭제는 구현 승인 후 Task 05에서 수행하며, 삭제된 local staging 파일은 Git으로 복구할 수 없다.
