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
  - **DONE 전 확정 시점**: 기존 runtime 필드는 Task 02 전환 완료 전까지 유지하면서 `SongSource`, `SongAnalysis`, `SongAnalysisJob`, `Catalog`, `CatalogEntry`와 active pointer를 먼저 추가했다. readiness validator가 source·analysis·target revision 일치와 published entry를 함께 검사하고 DB unique/FK가 revision identity를 보호함을 확인했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `aa2848c` (`feat(F024-admin-song-catalog-management): 카탈로그 revision 모델 구축`)
  - **PR**: -
  - **Test/Log**: `pnpm exec prisma validate`, `pnpm exec tsc --noEmit`, catalog domain 3/3, DB integration 1/1
- **Consequences**: 기존 F003 D005의 JSON SSOT 결정은 F024 완료 시 superseded가 된다. 개발 DB는 reset/bootstrap이 필요하고 초기 배포 절차에 bootstrap 검증이 추가된다.

## D002: 관리자 분석·공개 lifecycle (2026-08-13)

- **Context**: 영상 분석은 수분이 걸릴 수 있고 target upload와 분석 중 하나만 성공할 수 있어 동기 HTTP 등록이나 즉시 공개는 불완전한 추천·믹싱 상태를 만든다.
- **Constraints**: 일반 사용자는 관리자 mutation에 접근할 수 없어야 하고, 재시작·재시도·중복 클릭에도 같은 source revision이 중복 활성화되면 안 된다.
- **Options**: 등록 요청에서 동기 분석, 분석 성공 즉시 자동 공개, durable job과 관리자 명시 공개 gate.
- **Decision**: source 등록과 durable analysis job 생성을 transaction으로 묶고, target upload는 source revision에 결합한다. READY analysis와 READY target이 모두 일치할 때만 관리자 publish transaction이 active pointer와 catalog entry를 한 번에 전환한다.
- **Rationale**: 긴 작업을 request timeout과 분리하고 기존 READY revision을 유지한 채 새 revision을 준비할 수 있다. 명시 공개는 잘못된 영상·분석의 자동 노출을 막는다.
- **Trace**:
  - **DOING 시작 시점**: 기존 vocal/mixing queue의 claim·retry 패턴을 재사용하되 곡 분석 전용 상태와 payload로 분리하는 방향을 선택했다.
  - **DONE 전 확정 시점**: 관리자 allowlist route와 Zod identity 검증을 모든 mutation 앞에 두고, job claim에는 DB lease·heartbeat·bounded retry를 적용했다. 새 source는 DRAFT로 유지하며 분석과 target이 같은 source revision에 READY일 때만 publish transaction이 active pointer와 catalog entry를 전환하도록 검증했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `ce2a47a` (`feat(F024-admin-song-catalog-management): 관리자 곡 API와 durable 분석 작업 구현`)
  - **PR**: -
  - **Test/Log**: song analysis/admin catalog integration 4/4, 기존 admin 2/2, architecture 4/4, process supervisor 5/5, targeted Biome·ESLint·TypeScript
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

## D004: 초기 artifact 이전과 runtime cutover (2026-08-13)

- **Context**: 기존 100곡 JSON은 모든 분석값이 READY이고 DB target asset 100개도 준비되어 있지만 추천·합성 코드가 JSON identity와 정확히 100곡 계약을 직접 사용했다.
- **Constraints**: 초기 분석값과 결정적 추천 점수는 그대로 보존하면서 관리자 추가 곡은 JSON 수정·재배포 없이 반영돼야 한다. 전환 중 중복 source/analysis/target을 만들면 안 된다.
- **Options**: JSON/DB dual read 장기 유지, 배포 때마다 JSON import, 한 번의 idempotent bootstrap 후 DB-only runtime.
- **Decision**: 기존 JSON을 읽는 `catalog:bootstrap`을 초기화 경계로만 두고 source video ID, pipeline contract와 catalog position unique key로 upsert한다. runtime 추천·합성·target lookup은 published DB catalog와 active revision만 읽고, JSON은 export/fixture 역할만 유지한다.
- **Rationale**: bootstrap을 반복해도 같은 revision과 pointer가 유지되고 runtime은 관리자 변경을 즉시 반영한다. dual read drift와 정확히 100곡이라는 장애 단위를 제거한다.
- **Trace**:
  - **DOING 시작 시점**: 기존 target 100/100 READY를 확인한 뒤 분석·target·catalog entry를 묶어 100곡 모두 publish할 수 있다고 판단했다.
  - **DONE 전 확정 시점**: bootstrap 2회 결과가 동일했고 DB 100/100 READY, export 100곡, 기존 JSON과 DB ranking 전체 parity를 확인했다. `src`에서 artifact direct import와 고정 catalog size가 사라졌다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: `219d026` (`feat(F024-admin-song-catalog-management): 기존 100곡 bootstrap과 DB 추천 전환`)
  - **PR**: -
  - **Test/Log**: bootstrap parity 1/1, recommendation 33/33, recommendation DB 3/3, catalog target 1/1, mixing queue 1/1, TypeScript·Prisma validation
- **Consequences**: 초기 환경은 migration 후 `catalog:bootstrap`을 실행해야 한다. 기존 `Song.catalogOrder` 등 transitional column과 legacy artifact pipeline 코드는 Task 06에서 제거한다.
