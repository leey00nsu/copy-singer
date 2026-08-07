# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `D009: audio-waveform-and-smart-reference 결정 (2026-08-07)`

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.

---

## D001: 프로필 분석 소스와 합성 reference를 분리 (2026-08-07)

- **Context**: 프로필 analyzer는 최대 60초 전체로 통계를 만들지만 SoulX-Singer는 prompt의 앞 30초만 사용한다. 업로드 자체를 저·중·고 각 10초로 편집하면 histogram과 tessitura의 자연 분포가 인위적으로 균등해진다.
- **Constraints**: 사용자는 제출 음성을 다시 들을 수 있어야 하고, SVC prompt는 30초를 넘지 않으며 reference는 장기 저장 후 반복 사용된다.
- **Options**: 모든 입력을 30초 연속 자르기, 30초 저·중·고 편집본만 분석·저장, 60초 분석 source와 30초 합성 reference를 분리하는 방식을 비교했다.
- **Decision**: 마이크 녹음과 업로드 모두 최대 60초 분석 source를 프로필 통계와 사용자 재생용으로 유지하고, 분석 결과로 별도 최대 30초 합성 reference를 만든다. 내부 무음을 제외한 저·중·고 phrase에 각 10초 목표 budget을 두되 품질 미달 또는 부족분은 다른 음역의 좋은 phrase로 재분배한다.
- **Rationale**: 추천 정확도에 필요한 자연 음정 분포를 보존하면서 SoulX-Singer가 실제 사용하는 prompt의 음역 다양성과 유성 밀도를 개선한다.
- **Trace**:
  - **탐색 시점**: `DEFAULT_ANALYSIS_CONFIG.max_duration_seconds=60`, analyzer의 first-audible 60초 처리와 SoulX engine의 `audio[:30 * sample_rate]`를 확인했다. 사용자 검토로 마이크 녹음도 60초로 맞추고 합성 reference만 30초로 재구성하기로 범위를 확정했다.
  - **DONE 전 확정 시점**: 구현·비교 검증 후 갱신한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: 구현 후 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `services/vocal-profile-api/app/config.py`, `services/vocal-profile-api/app/media.py`, `services/soulx-singer-svc/api/engine.py`
- **Consequences**: profile당 제출/분석 source와 합성 reference 두 asset의 수명주기와 legacy fallback이 필요하다.

## D002: 파형은 WaveSurfer, 분석 그래프는 shadcn Chart로 표준화 (2026-08-07)

- **Context**: 현재 native audio player, 수동 72-bar waveform, CSS range profile과 직접 작성한 SVG histogram/pitch trace가 혼재한다.
- **Constraints**: 녹음은 실시간이어야 하고, 저장 음성은 보호 Range API를 통과하며, 최대 5분 오디오는 browser memory 제한을 고려해야 한다.
- **Options**: 기존 custom UI 보강, WaveSurfer만 도입, WaveSurfer와 shadcn Chart/Recharts를 역할별로 도입하는 방식을 비교했다.
- **Decision**: 녹음·오디오 파형과 재생은 `wavesurfer.js`/`@wavesurfer/react`, 수치형 profile 그래프는 shadcn Chart/Recharts를 사용한다. 긴 오디오는 pre-decoded peaks 또는 native media fallback을 둔다.
- **Rationale**: 오디오 시간축 상호작용과 분석 데이터 차트를 목적에 맞는 검증된 라이브러리로 분리하면서 현재 수동 drawing 코드를 줄인다.
- **Trace**:
  - **탐색 시점**: WaveSurfer Record plugin의 continuous/scrolling waveform과 React wrapper, shadcn Chart가 Recharts v3 composition임을 공식 문서에서 확인했다.
  - **T01 확정 시점**: `VocalProfileRecorder`가 WaveSurfer Record plugin의 `record-progress`와 `record-end`를 단일 lifecycle로 관리하고, 실제 경과 시간 60초에서 정지하며 cleanup 시 recorder·mic·plugin을 종료하도록 구현했다. MIME 확장자와 60초 경계 단위 테스트, TypeScript·ESLint·production build가 통과했다. 실제 마이크 권한을 수반하는 브라우저 검증은 T05에서 사용자 승인 하에 수행한다.
  - **T02 확정 시점**: Blob URL과 로그인 보호 API URL을 함께 받는 `AudioWaveformPlayer`로 profile 제출본·저장본, 추천 결과, 믹싱 히스토리와 개발 SVC 화면의 native player를 교체했다. 파형 seek·재생·음소거·시간 controls를 제공하고 WaveSurfer decode 오류에는 native media fallback을 유지한다. 기존 private audio proxy Range 전달 테스트와 관련 UI 회귀 테스트가 통과했다.
  - **DONE 전 확정 시점**: 공통 player·chart 구현과 브라우저 검증 후 갱신한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T01 task checkpoint commit에서 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: https://wavesurfer.xyz/docs/, https://wavesurfer.xyz/docs/types/plugins_record.RecordPluginOptions, https://ui.shadcn.com/docs/components/radix/chart
- **Consequences**: Recharts와 WaveSurfer client bundle이 추가되며 SSR 경계와 instance cleanup 테스트가 필요하다.
