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
  - **DONE 전 확정 시점**: 신규 파일 네 개의 video ID·MIME·크기·SHA-256을 기록하고 Modal CPU 분석과 관리자 공개를 완료했다. 네 active pointer가 신규 source/analysis/target revision을 가리키고 기존 remote asset 참조가 0건임을 확인한 뒤 기존 로컬 파일 네 개를 삭제했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: -
  - **PR**: -
  - **Test/Log**: `tmp/catalog-targets` 8개 파일 identity·MIME·size·SHA-256 확인, DB active revision/remote asset 조회, `catalog:db:verify` 100/100 READY
- **Consequences**: 삭제된 기존 local staging 파일 네 개는 Git 추적 대상이 아니므로 Git으로 복구할 수 없다. 기존 remote asset row도 참조가 없어 publish cleanup 과정에서 제거됐다.

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
- **Consequences**: 초기 환경은 migration 후 `catalog:bootstrap`을 실행해야 한다. `Song.catalogOrder`와 legacy artifact 생성·분석 pipeline은 Task 06에서 제거됐고 JSON은 bootstrap/fixture 입력으로만 남는다.

## D005: 곡 분석을 Modal 비동기 작업으로 분리 (2026-08-13)

- **Context**: 관리자가 업로드한 네 target audio를 로컬 CPU 분석기에 병렬 전달한 결과 Demucs 작업이 메모리 한계를 넘어 종료되었다. 사용자는 현재 보컬 진단과 마찬가지로 곡 분석도 Modal에서 실행하도록 방향을 변경했다.
- **Constraints**: Modal Web Function의 HTTP 요청은 장시간 분석보다 짧은 timeout을 가지므로 submit과 결과 조회를 분리해야 한다. 승인된 업로드 음원만 분석 입력으로 사용해야 하며 분석 자원 종류는 D008의 운영 경계를 따른다.
- **Options**: 보컬 진단 endpoint에 곡 분석 추가, 로컬 worker 유지, 전용 Modal job과 인증된 submit/poll endpoint.
- **Decision**: `song-catalog-analyzer`를 전용 Modal 비동기 job service로 전환한다. 웹 endpoint는 DB job ID를 idempotency key로 받아 분석 함수를 spawn하고 즉시 external job ID를 반환하며, 앱 worker는 그 ID를 `SongAnalysisJob`에 저장해 poll한다. READY `CatalogTargetAsset`이 없는 job은 claim하지 않는다. API 인증은 기존 server-side `X-API-Key` secret을 재사용한다. 구체 compute 자원은 D008로 대체한다.
- **Rationale**: 앱의 DB lease·retry·publish gate를 유지하면서 장시간 분석을 request lifecycle에서 분리한다. 외부 job ID를 저장하면 앱 worker가 재시작돼도 동일 Modal 결과를 회수하며, 업로드된 파일을 입력으로 써 YouTube 다운로드 실패와 출처 불일치를 제거한다.
- **Trace**:
  - **DOING 시작 시점**: 기존 저장소에 Demucs·librosa가 포함된 비배포용 Modal batch analyzer가 있음을 확인했다. Modal job queue의 `spawn()` + `FunctionCall.get(timeout=0)` polling 패턴을 관리자 durable job에 결합하기로 했다.
  - **DONE 전 확정 시점**: 인증된 submit/poll endpoint와 external job ID 재사용, READY target claim gate, 결과 만료·실패 retry 계약을 구현하고 통합 테스트 6/6을 통과했다. 초기 GPU 자원 선택은 이후 사용자 결정 D008로 대체됐다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: -
  - **PR**: -
  - **Test/Log**: `pnpm run test:song-analysis-queue` 6/6, Modal catalog analyzer unittest 4/4, 원격 health/submit/poll 확인
- **Consequences**: 곡 분석에는 별도 Modal endpoint URL과 서버 API key 설정이 필요하다. 분석 compute는 D008에 따라 CPU만 사용하며 보컬 진단용 Modal app과 곡 믹싱 GPU app은 변경하지 않는다.

## D006: 음원 운영 진입점을 관리자 페이지로 단일화 (2026-08-13)

- **Context**: 초기 Task 05 진행에서는 로컬 파일 네 쌍을 일회성 교체 스크립트로 처리하려 했지만, 사용자는 실제 운영 방식이 관리자만 접근 가능한 `음원 관리` 페이지의 `음원 추가` 버튼이어야 한다고 정정했다.
- **Constraints**: 음원 등록 API와 페이지는 모두 서버 관리자 권한을 확인해야 한다. 분석 job은 target upload보다 먼저 실행되면 안 되며, 곡 메타데이터만 저장되거나 파일만 저장되는 UI 흐름을 피해야 한다.
- **Options**: 로컬 스크립트 유지, 기존 `/admin` 대시보드의 분리된 곡/target 폼 유지, 전용 `/admin/songs` 페이지에서 단일 multipart 등록.
- **Decision**: 일회성 F024 교체 스크립트와 package command를 제거한다. `/admin/songs`를 `requireAdminPage()`로 보호하고 `음원 추가` dialog에서 곡·출처 정보와 음원 파일을 한 번에 받는다. API는 source/job을 생성한 뒤 같은 요청에서 target을 저장하고, worker는 READY target이 있는 job만 claim한다.
- **Rationale**: 테스트용 로컬 절차가 실제 운영 인터페이스로 굳어지는 것을 막고, 관리자에게 반복 가능한 단일 진입점과 명확한 분석 상태를 제공한다. target 준비 gate 덕분에 외부 저장 실패 시 Modal이 잘못 시작되지 않는다.
- **Trace**:
  - **DOING 시작 시점**: 기존 `/admin` 안에 곡 추가와 source별 target 업로드가 분리되어 있고, 별도 교체 스크립트가 추가된 상태를 확인했다.
  - **DONE 전 확정 시점**: `/admin/songs` route가 production build에 포함되고 비관리자 요청은 404가 됨을 확인했다. `음원 추가`와 출처 교체 API 모두 multipart로 메타데이터와 필수 audio를 받으며 Storybook에서 dialog·필수 파일·모바일 viewport·접근성 상호작용을 검증했다. 실제 네 곡도 이 관리자 API/UI 흐름으로 등록·공개했다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: -
  - **PR**: -
  - **Test/Log**: `pnpm run test:admin` 5/5, catalog manager Storybook 6/6, TypeScript·Biome·ESLint·architecture boundary, production build
- **Consequences**: `/admin`은 운영 요약과 `/admin/songs` 진입 링크만 제공한다. 신규 음원은 dialog 등록 후 분석 대기 상태로 표시되고, READY 분석 결과는 기존 명시 공개 action을 거친다.

## D007: 관리자 입력 최소화와 분석 원키 확정 (2026-08-13)

- **Context**: 음원 추가·출처 교체 폼이 운영자에게 원키, YouTube video ID, 출처 라벨을 직접 입력하게 해 파생값과 분석값의 책임이 UI에 노출되어 있었다.
- **Constraints**: 기존 공개 곡은 교체 revision 분석 중에도 현재 원키를 유지해야 한다. YouTube 입력은 지원하는 HTTPS URL 형태만 허용하고 video ID는 정확히 11자여야 한다. 자동 원키는 확률적 추정값이므로 공개 전 관리자가 결과와 신뢰도를 확인할 수 있어야 한다.
- **Options**: 원키·video ID 직접 입력 유지, video ID만 파생하고 원키는 비워 두기, video ID를 URL에서 파생하고 원키를 분석 revision에서 추정한 뒤 공개 시 확정.
- **Decision**: 관리자는 제목·아티스트·HTTPS YouTube URL·음원만 입력한다. 서버가 URL에서 video ID를 검증·추출하고 출처 라벨을 부여한다. Modal은 전체 믹스 chroma와 key profile correlation으로 estimatedKey/keyConfidence를 산출해 SongAnalysis revision에 저장하며, 명시 공개 transaction에서만 Song.originalKey에 반영한다.
- **Rationale**: 중복 입력과 URL-ID 불일치를 제거하고, 교체 분석 중 기존 공개 곡의 키를 유지하면서 분석 결과를 revision 단위로 검토·공개할 수 있다.
- **Trace**:
  - **At DOING start**: 사용자 피드백으로 원키와 video ID의 생성 책임이 관리자 폼이 아니라 분석기와 서버에 있어야 함을 확인했다.
  - **Before DONE**: 입력 필드를 제거하고 URL 파생 계약, major/minor key profile 추정, analysis persistence, 공개 transaction 반영과 관리자 결과 표시를 테스트했다.
  - **Post-merge check**: Update this line after merge when applicable.
- **Evidence**:
  - **Test/Log**: test: pnpm run test:admin, pnpm run test:song-analysis-queue, Modal analyzer unittest
- **Consequences**: 신규 곡의 `originalKey`는 등록 직후 null이며 분석 revision 공개 시 채워진다. 키 추정 정확도는 음원 구성에 영향을 받으므로 관리자 화면에 신뢰도를 함께 표시한다. 기존 v1 분석은 키 값이 없고 재분석 전까지 기존 원키를 유지한다.

## D008: 곡 분석 CPU와 곡 믹싱 GPU 자원 경계 (2026-08-13)

- **Context**: 곡 분석 함수가 Demucs 때문에 L4 GPU를 사용하도록 설계됐지만, 사용자는 Demucs를 포함한 카탈로그 분석은 CPU로 처리하고 GPU는 곡 믹싱에만 사용하도록 운영 경계를 변경했다.
- **Constraints**: Demucs CPU 처리는 GPU보다 오래 걸릴 수 있고 앞선 로컬 병렬 실행은 메모리 부족으로 실패했다. 분석은 durable submit/poll과 작업별 임시 파일 정리 계약을 유지해야 하며 기존 곡 믹싱 GPU 경로에는 회귀가 없어야 한다.
- **Options**: 카탈로그 분석에도 L4 GPU 사용, Demucs만 GPU 사용하고 나머지 CPU 처리, 카탈로그 분석 전체 CPU 처리 및 믹싱만 GPU 사용.
- **Decision**: song-catalog-analyzer의 analyze_song은 GPU 요청과 CUDA 검사 없이 8 vCPU, 16 GiB 메모리의 Modal CPU 함수에서 Demucs --device cpu, librosa-pYIN, chroma key estimation을 수행한다. 곡 믹싱/합성 GPU 경로는 변경하지 않는다.
- **Rationale**: 분석 처리시간 증가는 허용하되 GPU 사용 범위를 실제 믹싱 작업으로 제한해 자원 정책과 비용 의도를 명확하게 유지한다. 높은 메모리 할당으로 앞선 로컬 병렬 Demucs 메모리 실패를 격리한다.
- **Trace**:
  - **At DOING start**: 사용자가 Demucs의 CPU 실행 가능성을 근거로 GPU를 믹싱에만 사용하도록 명시했다. analyzer의 `gpu=` 요청, CUDA 검사와 `--device cuda`를 제거하는 범위를 확정했다.
  - **Before DONE**: 8 vCPU·16 GiB·최대 4 container의 CPU 함수로 배포하고 health contract를 확인했다. 네 곡을 병렬 제출해 모두 READY로 회수했으며 repo resource audit에서 GPU 할당은 `services/soulx-singer-svc/modal_app.py`의 믹싱 경로에만 남았다.
  - **Post-merge check**: Update this line after merge when applicable.
- **Evidence**:
  - **Test/Log**: test: Modal catalog analyzer unittest; health compute contract; 4곡 CPU analysis run
- **Consequences**: 카탈로그 분석은 GPU 비용을 발생시키지 않지만 곡 길이와 Modal CPU 가용량에 따라 처리시간이 늘어날 수 있다. 분석과 믹싱의 비용·autoscaling·장애 경계가 코드와 배포 단위로 명확히 분리된다.

## D009: 카탈로그 순위 SSOT와 legacy artifact 축소 (2026-08-13)

- **Context**: DB runtime 전환 후에도 Song.catalogOrder와 과거 JSON 생성·검증·로컬 분석 명령이 남아 CatalogEntry.position과 중복되고 새 관리자 흐름을 우회했다.
- **Constraints**: 기존 `RecommendationItem.catalogPosition` null row를 보존 가능한 값으로 backfill해야 한다. 초기 TJ 100곡의 재현 가능한 bootstrap 입력과 점수 회귀 fixture는 계속 필요하며, 사용자-visible `catalogOrder` 응답 계약은 유지해야 한다.
- **Options**: 중복 `Song.catalogOrder` 유지, JSON pipeline 전체 유지하되 runtime에서만 미사용, `CatalogEntry.position`/recommendation snapshot 단일화와 JSON bootstrap/fixture 축소.
- **Decision**: Song.catalogOrder를 제거하고 CatalogEntry.position을 runtime 순위 SSOT로 사용하며 RecommendationItem.catalogPosition을 필수 snapshot으로 만든다. JSON은 bootstrap과 테스트 fixture 입력만 유지하고 과거 생성·검증·분석 스크립트와 package command를 제거한다.
- **Rationale**: 중복 순위 drift와 배포 artifact를 runtime처럼 다루는 경로를 제거하면서 과거 추천·믹싱 표시에는 immutable catalogPosition snapshot 또는 현재 CatalogEntry position을 사용한다.
- **Trace**:
  - **At DOING start**: runtime import audit에서 `src`의 JSON direct import는 없었지만 schema·seed·일부 조회가 `Song.catalogOrder`를 사용하고 과거 artifact scripts가 package command로 남아 있음을 확인했다.
  - **Before DONE**: migration이 기존 null recommendation snapshot에서 처음 실패해 `Song.catalogOrder` 기반 backfill을 선행하도록 보완했다. migration 적용, bootstrap 2회, DB 100/100 READY, 전체 `pnpm test`와 lint를 통과했고 bootstrap JSON도 신규 네 source/analysis revision으로 갱신했다.
  - **Post-merge check**: Update this line after merge when applicable.
- **Evidence**:
  - **Test/Log**: test: pnpm test; pnpm run lint; catalog bootstrap 2회 및 DB 100/100 READY; runtime JSON/direct import rg audit
- **Consequences**: 카탈로그 순위 변경은 `CatalogEntry.position`만 갱신하면 되고 신규 RecommendationItem은 항상 당시 위치를 저장한다. 과거 JSON 생성·URL 다운로드·로컬 분석 명령은 더 이상 지원하지 않으며 신규 분석은 관리자 UI와 Modal CPU job만 사용한다.

## D010: 추천 스냅샷 제거와 믹싱 입력 분리 (2026-08-13)

- **Context**: `RecommendationRun`이 보컬 프로필당 하나로 고정되어 관리자 곡 교체·추가 후에도 과거 결과를 반환했다. 100여 곡의 READY 수치 비교는 외부 분석이나 GPU 작업 없이 짧게 계산할 수 있어 결과 전체를 영속할 필요가 없다.
- **Constraints**: 브라우저 캐시는 서버 영속성의 대체물이 아니며 카탈로그 변경을 식별할 revision이 필요하다. 추천 스냅샷을 제거해도 이미 접수된 믹싱은 분석·target·추천 키가 바뀌지 않아야 하고 티켓·worker 내구성은 유지해야 한다.
- **Options**: 기존 단일 스냅샷 유지, catalog 변경 때 모든 스냅샷 삭제·재생성, 추천은 on-demand 계산하고 믹싱 입력만 영속.
- **Decision**: `RecommendationRun`과 `RecommendationItem`을 제거하고 보컬 프로필 ID를 추천 route identity로 사용한다. `Catalog.revision`은 공개 결과 변경 transaction에서 증가하며 추천 응답과 TanStack Query key는 profile ID·catalog revision·scoring version을 포함한다. item identity는 immutable `SongAnalysis.id`를 사용한다. 믹싱 API는 profile ID와 analysis ID를 받아 서버에서 현재 추천을 재검증한 뒤 `MixingJob`에 analysis·target·catalog position·recommended shift·catalog/scoring revision을 저장한다.
- **Rationale**: 카탈로그 변경이 다음 조회에 즉시 반영되고 클라이언트 캐시도 revision 단위로 자연스럽게 분리된다. 비용이 큰 작업은 믹싱뿐이므로 그 입력만 영속하면 재현성과 worker 안정성을 유지하면서 중복 추천 데이터를 없앨 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 현재 query key가 run ID뿐이고 `createRecommendationRun`이 기존 row를 즉시 반환해 catalog revision을 보지 않는 것을 확인했다. 또한 MixingJob이 RecommendationItem을 통해 shift 근거를 간접 참조하고 current Song target을 읽는 불일치를 확인했다.
  - **DONE 전 확정 시점**: Prisma migration 적용 후 추천 조회가 DB write 없이 현재 catalog revision을 반영하고, 공개·보관 시 revision이 증가하며 동일 재공개는 idempotent함을 통합 테스트로 확인했다. 믹싱 job은 current catalog 검증 후 analysis·target·position·shift·catalog/scoring revision을 자체 저장한다.
  - **머지 후 확인**: -
- **Evidence**:
  - **Commit**: T07 task checkpoint
  - **PR**: -
  - **Test/Log**: `pnpm test`, `pnpm run lint`, `pnpm exec prisma validate`, `pnpm run test:recommendation:db`, `pnpm run test:mixing:db`, `node --conditions react-server --import tsx --test tests/admin-song-catalog.integration.ts` 통과. Storybook 48/48 files·135/135 tests 통과.
- **Consequences**: 추천 결과 삭제 action과 추천 개수 개념은 사라진다. 같은 프로필 URL은 최신 catalog revision 결과를 보여주며, 과거 믹싱 이력은 작업 row에 저장된 immutable 입력을 사용한다.
