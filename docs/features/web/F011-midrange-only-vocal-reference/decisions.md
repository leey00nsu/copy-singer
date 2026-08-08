# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D011: midrange-only-vocal-reference 결정 (2026-08-08)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 새 synthesis reference는 기존 mid boundary를 유지한 mid-only selection으로 생성 (2026-08-08)

- **Context**: F009 `smart-reference-v1`은 low/mid/high를 약 10초씩 채우지만 사용자 실험에서는 안정적인 중음만 prompt로 사용했을 때 합성이 더 깔끔했다.
- **Constraints**: 최대 60초 분석 source와 profile 통계는 유지해야 하고, 기존 `smart-reference-v1` 저장 프로필은 migration 없이 계속 읽어야 한다. 30초는 SoulX prompt 최대 길이이지 최소 목표가 아니다.
- **Options**: 기존 10:10:10 유지, mid 우선 후 부족분 low/high 보충, mid-only + 짧은 reference 허용을 비교한다.
- **Decision**: 새 `smart-reference-mid-v1`은 기존 p10/median/p90 band boundary와 candidate 품질 평가를 재사용하되 `mid` candidate만 최대 30초까지 선택한다. low/high 보충, 반복, silence padding은 하지 않는다.
- **Rationale**: profile 의미를 바꾸지 않고 실제 합성 품질에서 관찰된 중음 reference 장점을 직접 반영하며, 불안정한 저·고음이 prompt에 다시 들어오는 경로를 제거한다.
- **Trace**:
  - **DOING 시작 시점**: 기존 `_build_candidates`는 유지하고 `_select_candidates`를 mid-only budget으로 단순화하며 output은 시간순/crossfade를 유지한다.
  - **DONE 전 확정 시점**: `_select_candidates`를 mid-only 단일 pass로 바꿔 candidate 반복·low/high 재분배를 제거했다. 거의 단일 음정인 녹음에서 segmented pYIN median의 미세 오차로 mid가 사라지는 edge case를 테스트가 발견해 boundary에 ±0.25 semitone tolerance를 추가했다. 새 descriptor는 `voiced-mid-phrase-selection` / `smart-reference-mid-v1`이며 unavailable reason은 `no-quality-mid-phrase`다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `33b5852`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: target 17/17 PASS; 전체 analyzer suite 35 passed, remote-only 3 skipped
- **Consequences**: 새 reference는 30초보다 짧을 수 있으며, mid candidate가 전혀 없으면 profile은 저장되더라도 synthesis reference는 unavailable 상태가 된다.

## D002: analyzer consumer는 v1을 읽고 mid-v1을 엄격 검증하는 dual-read 계약을 사용 (2026-08-08)

- **Context**: 새 분석은 `smart-reference-mid-v1`을 생성하지만 DB에는 기존 `smart-reference-v1` profile이 남아 있고 F010 local/Modal adapter가 같은 TypeScript validator를 사용한다.
- **Constraints**: 기존 profile migration 없이 읽어야 하며, 새 mid-v1에 low/high source range 또는 descriptor/artifact version mismatch가 섞이면 persistence 전에 차단해야 한다.
- **Options**: 기존 validator를 mid-v1로 단순 교체, 모든 string version 허용, 명시적 v1+mid-v1 dual-read를 비교한다.
- **Decision**: 지원 version을 `smart-reference-v1 | smart-reference-mid-v1`로 명시하고 descriptor와 artifact version 일치를 검증한다. mid-v1 success payload는 descriptor/artifact의 모든 source range가 `band: mid`여야 한다.
- **Rationale**: 과거 데이터 호환을 유지하면서 새 policy drift를 transport 경계에서 즉시 발견할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: 기존 `hasSmartReferenceContract` export는 유지하고 version 판별 helper를 추가해 이후 UI/mixing에서도 같은 판별을 재사용한다.
  - **DONE 전 확정 시점**: `hasSmartReferenceContract`를 v1+mid-v1 dual-read로 확장하고 `synthesisReferenceContractVersion()` helper를 추가했다. mid-v1 success payload는 descriptor/artifact version 일치와 non-empty `band: mid` sourceRanges를 양쪽 모두 검증한다. Modal health capability도 실제 생성 계약인 `smart-reference-mid-v1`로 변경했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `cb13340`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: TS contract 5/5, Modal transport 9/9, local↔Modal parity 4/4, analyzer adapter 8/8, tsc PASS
- **Consequences**: 지원하지 않는 future version은 명시적으로 analyzer update/contract 오류가 되며 조용히 저장되지 않는다.

## D003: mid-v1 UI는 source range 재조합 대신 저장된 synthesis reference를 직접 재생 (2026-08-08)

- **Context**: F009 UI는 60초 source에서 low/mid/high sourceRanges를 브라우저에서 잘라 preview하지만 F011의 목표는 실제 SoulX prompt와 동일한 중음 artifact를 확인하는 것이다.
- **Constraints**: Leemage URL을 client에 노출하지 않고 Range playback/owner scope를 유지해야 하며, 기존 v1 profile은 현재 3-band UI를 유지해야 한다.
- **Options**: mid sourceRanges를 browser에서 다시 합성, synthesis asset URL 직접 전달, owner-scoped same-origin proxy로 저장 artifact 재생을 비교한다.
- **Decision**: mid-v1 profile은 `/api/vocal-profiles/:id/synthesis-reference/audio`를 통해 READY `SYNTHESIS_REFERENCE`를 재생하는 단일 WaveSurfer player를 사용한다. v1은 기존 sourceRanges 3-band preview를 유지한다.
- **Rationale**: 사용자가 듣는 내용과 실제 mixing prompt bytes를 일치시키면서 기존 private audio proxy 보안 경계를 재사용한다.
- **Trace**:
  - **DOING 시작 시점**: history owner lookup + audio proxy route를 추가하고 `synthesisReferenceContractVersion()`으로 UI를 분기한다.
  - **DONE 전 확정 시점**: owner-scoped `getVocalProfileSynthesisReference()`와 `/api/vocal-profiles/:id/synthesis-reference/audio` proxy를 추가했다. `VocalProfileResults`는 mid-v1이면 저장된 synthesis reference용 `AudioWaveformPlayer` 하나를 표시하고 unavailable이면 재녹음 안내를 보여주며, v1/legacy는 기존 3-band source preview를 유지한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `2c438c1`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: vocal-profile-results UI 5/5, private audio + history ownership 3/3, tsc/lint PASS
- **Consequences**: mid-v1 player는 source player와 별도 HTTP stream을 사용하지만 reference가 최대 30초라 browser decode 부담은 제한적이다.

## D004: mid-v1 mixing은 synthesis reference를 강제하고 legacy만 source fallback 허용 (2026-08-08)

- **Context**: 현재 mixing selector는 READY synthesis asset이 없으면 항상 source `REFERENCE`로 fallback한다. F011에서 이 fallback을 유지하면 mid-only 정책 실패가 사용자에게 보이지 않은 채 최대 60초 source가 SoulX prompt로 들어갈 수 있다.
- **Constraints**: 새 profile은 strict해야 하지만 기존 `smart-reference-v1`/version 없는 profile의 과거 동작은 유지해야 한다. 티켓 차감 전에 reference availability를 확정해야 한다.
- **Options**: 모든 profile strict, 모든 profile fallback 유지, contract-version-aware strict/fallback을 비교한다.
- **Decision**: `smart-reference-mid-v1`은 owner-scoped READY `SYNTHESIS_REFERENCE`가 없으면 selection 실패로 반환하고 source fallback을 금지한다. v1/legacy는 기존 smart-first/source-fallback 정책을 유지한다.
- **Rationale**: 새 품질 정책을 보장하면서 과거 profile의 사용 가능성을 깨지 않고, 현재 enqueue 트랜잭션의 reference 검증→티켓 차감 순서로 부작용도 막는다.
- **Trace**:
  - **DOING 시작 시점**: `synthesisReferenceContractVersion()` 결과를 mixing selector에 전달하고 기존 `referenceAssetId` snapshot은 유지한다.
  - **DONE 전 확정 시점**: `selectMixingReference()`가 contract version을 받아 mid-v1에서는 READY synthesis asset이 없으면 즉시 null을 반환하도록 변경했다. queue는 profile descriptor version을 전달하고 기존 `MIXING_REFERENCE_UNAVAILABLE`를 티켓 차감 전에 발생시킨다. integration test에서 mid-v1 reference missing 시 ticketBalance 유지, MixingJob 0, debit ledger 0을 확인한 뒤 synthesis asset 연결 후 기존 snapshot/worker flow가 정상 동작함을 검증했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: `c9306a0`
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: mixing selector 4/4, mixing DB integration 1/1, tsc/lint PASS
- **Consequences**: mid reference unavailable profile은 추천 결과를 볼 수 있어도 AI mixing enqueue는 명시적으로 거부된다.

## D005: 사람용 3-band 분석 표시와 모델용 mid-only reference를 분리 (2026-08-08)

- **Context**: 원격 배포 직전 사용자 의도를 재확인한 결과, F011의 목표는 사람이 보는 기존 보컬 분석 UI를 바꾸는 것이 아니라 실제 믹싱 prompt만 중음 기반으로 바꾸는 것이다. T03의 mid-v1 단일 synthesis-reference player는 이 범위를 과도하게 확장했다.
- **Constraints**: 기존 low/mid/high preview 경험을 새 profile에서도 유지하면서 `smart-reference-mid-v1.sourceRanges`는 모델용 mid-only 계약으로 엄격하게 남겨야 한다. 기존 smart-reference-v1 저장 profile도 계속 읽어야 한다.
- **Options**: mid-only sourceRanges로 UI도 mid만 표시, synthesis descriptor에 low/high 표시 범위를 섞기, 사람용 분석 descriptor를 별도로 분리하는 방식을 비교한다.
- **Decision**: 기존 band candidate selection을 사람용 `analysisReferenceBands` descriptor로 별도 저장하고 UI는 이를 우선 사용한다. `synthesisReference`는 mid-only 모델 prompt 의미만 유지한다. 기존 v1 profile은 synthesisReference sourceRanges를 3-band UI fallback으로 계속 사용한다.
- **Rationale**: 분석 결과 표현과 모델 입력을 서로 독립적으로 버전 관리해 사용자가 보는 정보는 유지하면서 reference 품질 정책만 바꿀 수 있다.
- **Trace**:
  - **DOING 시작 시점**: T06에서 analyzer descriptor 분리와 UI 복원을 먼저 완료한 뒤 T07 원격 배포를 수행한다. 기존 T03 single-player 결정은 이 ADR로 supersede한다.
  - **DONE 전 확정 시점**: shared analyzer가 한 번의 candidate 계산에서 `analysisReferenceBands`(low/mid/high)와 `synthesisReference`(mid-only)를 함께 만든다. UI helper는 새 analysis descriptor를 우선 읽고 기존 v1 profile은 synthesisReference sourceRanges fallback을 유지한다. 결과 화면은 다시 3-band source preview를 사용하며 mixing strict mid-only policy는 그대로 유지된다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: task commit 후 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: target Python 8/8, UI/segment 8/8, 전체 `pnpm test` PASS, analyzer 35 passed/3 skipped, Modal local 9/9, local parity 4/4, tsc/lint PASS
- **Consequences**: synthesis-reference audio proxy 코드는 당장 UI에서 사용되지 않을 수 있으나 모델 reference 저장/소유권 경계에는 영향을 주지 않는다.

## D006: F011 원격 배포는 dbstndla1212 workspace에서만 수행 (2026-08-08)

- **Context**: 로컬 Modal CLI에는 `dbstndla1212`, `dbstndla1212yt` 두 profile이 함께 존재한다.
- **Constraints**: F011 analyzer는 기존 production 자원이 있는 `dbstndla1212` workspace에만 배포해야 하며 다른 workspace를 건드리면 안 된다.
- **Options**: 현재 profile을 신뢰하고 바로 배포, profile/workspace를 확인한 뒤 배포를 비교한다.
- **Decision**: Modal 1.5.3 CLI에서 `modal profile current`와 `modal profile list`로 active profile/workspace가 `dbstndla1212`임을 확인한 뒤에만 deploy를 실행한다.
- **Rationale**: 로컬 다중 계정 환경에서 잘못된 workspace 배포를 방지한다.
- **Trace**:
  - **DOING 시작 시점**: active profile `dbstndla1212`, workspace `dbstndla1212`; inactive profile `dbstndla1212yt` 확인 후 배포 진행.
  - **DONE 전 확정 시점**: `dbstndla1212` active profile에서 `copy-singer-vocal-profile-analyzer`를 Modal 1.5.3으로 재배포했다. authenticated health는 `smart-reference-mid-v1`, CPU 2 cores, memory 4096 MiB, scale-to-zero 설정을 확인했고 10/30/60초 deployed parity가 local profile JSON과 source/reference bytes exact match 3/3으로 통과했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: task commit 후 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `modal profile current/list` 확인, deploy PASS, wrong key 401/authenticated health PASS, 10초 benchmark PASS, deployed local↔remote parity 3/3 PASS
- **Consequences**: F011 remote 변경은 `dbstndla1212`의 `copy-singer-vocal-profile-analyzer`에만 적용한다.

## D007: mixing song-target도 analyzer backend를 따르고 preflight 실패를 단계별 재시도 (2026-08-08)

- **Context**: F011 실제 Lemon 믹싱에서 reference asset은 READY/200이었지만 최근 3개 job이 모두 `MIXING_PREFLIGHT_FAILED`, `modalJobId=null`, `fetch failed`로 종료됐다. probe 결과 `VOCAL_PROFILE_API_URL=http://localhost:8001`의 local analyzer만 연결 실패했고 `VOCAL_PROFILE_ANALYZER_BACKEND=modal` 설정은 mixing song-target 경로에 적용되지 않고 있었다.
- **Constraints**: production modal backend에서는 로컬 analyzer 컨테이너 없이 믹싱해야 한다. 기존 catalog allowlist와 yt-dlp/FFmpeg target 생성 계약, SoulX 접수 전 실패 환불 semantics는 유지해야 한다. 네트워크성 일시 오류는 `maxAttempts`를 활용해야 한다.
- **Options**: local analyzer를 항상 띄우기, song-target 전용 별도 서비스, 기존 `copy-singer-vocal-profile-analyzer`에 authenticated `/v1/song-target`을 추가하는 방식을 비교한다.
- **Decision**: Modal analyzer image에 pinned yt-dlp와 catalog allowlist를 포함하고 shared `download_song_target()` 기반 `/v1/song-target`을 추가한다. mixing worker는 analyzer backend에 따라 local/Modal song-target endpoint를 선택하고, preflight 단계별 stable error code와 retryable terminal 판단을 도입한다.
- **Rationale**: 이미 배포·인증·scale-to-zero가 검증된 CPU analyzer를 재사용해 로컬 컨테이너 의존성을 제거하면서, 장애 위치와 retry 여부를 운영자가 바로 식별할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: T08에서 Modal song-target endpoint, backend-aware worker, stage error/retry, env/docs 정리를 구현한 뒤 `dbstndla1212` workspace에만 재배포한다.
  - **DONE 전 확정 시점**: Modal analyzer에 `song-target-v1` capability와 shared `download_song_target()` streaming endpoint를 추가하고 `yt-dlp==2026.7.4`/catalog allowlist를 image에 포함했다. mixing worker는 backend-aware target config를 사용하고 `MixingJob.nextAttemptAt/retryable` 기반 exponential backoff를 도입했다. reference/song-target/status/result GET의 transient failure는 재시도하며 SoulX submit network 단절은 idempotency 부재로 terminal 처리한다. `dbstndla1212` 재배포 후 Lemon target이 52,660,710-byte RIFF WAV로 13.264초에 반환됐다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: task commit 후 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm test` PASS, mixing DB integration PASS, Prisma 9 migrations up to date, Python analyzer 35 passed/3 skipped, Modal unit 9/9, Lemon remote song-target probe PASS, 10초 analyzer benchmark PASS
- **Consequences**: production modal backend에서 `VOCAL_PROFILE_API_URL`은 더 이상 mixing에 필요하지 않고 local 개발 backend에서만 사용한다.
