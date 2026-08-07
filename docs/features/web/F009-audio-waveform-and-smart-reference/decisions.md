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
  - **T03 확정 시점**: analyzer가 프로필 계산에 사용한 동일 pYIN frame을 재사용해 연속 유성 phrase를 만들고 저·중·고 각 10초 목표 budget, 품질순 재분배, 원래 시간순 연결과 30ms equal-power crossfade를 적용한다. 선택 descriptor와 별도 WAV endpoint를 추가했으며, PostgreSQL에는 nullable `synthesisReferenceAssetId`, Leemage에는 `SYNTHESIS_REFERENCE`를 저장한다. 저장 실패·legacy profile은 분석 source로 fallback하고 새 mixing job은 준비된 smart asset ID를 snapshot한다. synthetic 3-band reference, 두 Leemage asset, DB queue/worker 테스트가 통과했다.
  - **T05 정량 비교**: 사용자가 기존 검증에 사용한 7.152초 `vocal1.wav`에서 first-30 baseline은 유성 밀도 0.8412, p10–p90 pitch coverage 5.3 semitone이었다. smart reference는 6.495초, 유성 밀도 0.9202, coverage 5.3 semitone으로 무성 구간을 제거하면서 관측 음역을 보존했다. 원본이 짧아 저·중·고 각 10초를 채울 수 없으며 descriptor에 `redistributed:low,mid,high`를 명시한다. 실제 Modal A/B는 비용 승인이 없어 실행하지 않았다.
  - **DONE 전 확정 시점**: 실제 source 정량 비교와 전체 회귀 후 갱신한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T03 task checkpoint commit에서 갱신
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
  - **T04 확정 시점**: 공식 shadcn CLI로 `components/ui/chart.tsx`와 Recharts 3.8.0을 추가했다. range bar, histogram과 `connectNulls=false` pitch line을 `ChartContainer`로 전환했으며 Chrome 로컬 화면에서 chart 3개, 실제 tooltip, 375px viewport의 가로 overflow 없음과 accessibility layer를 확인했다.
  - **T05 확정 시점**: 사용자가 실제 마이크 녹음에서 실시간 파형을 확인했고, 공통 player와 반응형 차트 브라우저 검증을 완료했다. health 확인 effect는 Next.js 개발 모드의 cleanup/remount에서 이유 없는 AbortError를 노출하지 않도록 요청을 강제 중단하는 대신 cleanup 이후 응답을 무시하는 active guard로 변경했다. 화면 이탈과 재진입 후 브라우저 오류 로그가 없음을 확인했다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T01 task checkpoint commit에서 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: https://wavesurfer.xyz/docs/, https://wavesurfer.xyz/docs/types/plugins_record.RecordPluginOptions, https://ui.shadcn.com/docs/components/radix/chart
- **Consequences**: Recharts와 WaveSurfer client bundle이 추가되며 SSR 경계와 instance cleanup 테스트가 필요하다.

## D003: 로컬 로그인 우회는 runtime과 DB 사용자로 이중 제한 (2026-08-07)

- **Context**: 로그인 보호 화면의 반복 UI 검증이 Google OAuth browser session 유무에 의존한다.
- **Constraints**: 테스트 편의 기능이 production 인증을 약화시키거나 임의 사용자를 생성해서는 안 된다.
- **Options**: 보호 route별 예외, 고정 mock 사용자, 공통 session helper의 환경변수 기반 우회를 비교했다.
- **Decision**: 공통 page/API session helper에서 `development|test` runtime, 명시적 enable flag, 기존 DB user ID를 모두 요구하는 우회 session을 제공한다. production에서는 flag를 무조건 무시한다.
- **Rationale**: 실제 사용자 소유권과 DB 데이터를 그대로 검증하면서 OAuth 의존성만 제거하고, 배포 환경 오설정의 영향을 차단한다.
- **Trace**:
  - **탐색 시점**: 모든 보호 page/API가 `lib/auth/session.ts`를 경유하고 있어 단일 정책 적용이 가능함을 확인했다.
  - **T05 확정 시점**: policy 단위 테스트에서 production·미지정 runtime 차단을 확인하고, DB 통합 테스트에서 missing user 실패와 existing user session 생성을 확인했다. `.env.local`의 현재 개발 사용자로 재시작한 뒤 cookie 없는 in-app Browser 보호 page와 무인 API GET이 모두 200으로 동작했다.
  - **T05 확정 시점**: 실제 마이크 browser 검증과 전체 파이프라인 검증을 마쳤으며, 우회 설정은 production 차단 정책을 유지한다.
  - **머지 후 확인**: 머지 후 갱신한다.
- **Evidence**:
  - **Commit**: T05 task checkpoint commit에서 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: `pnpm run test:auth:db`, cookie 없는 `/vocal-profiles`와 `/api/vocal-profiles` 검증
- **Consequences**: 개발 DB에 우회 대상 사용자가 먼저 존재해야 하며 `.env.local`은 로컬에서만 관리한다.

## D004: 브라우저 전송본과 영구 믹싱 결과는 압축 오디오로 분리 (2026-08-07)

- **Context**: 긴 업로드는 현재 원본 전체가 analyzer에 도착한 뒤 60초로 잘리고, WaveSurfer도 원본 전체를 표시한다. Modal 믹싱 WAV는 곡당 10MB를 넘겨 영구 저장·재생 비용이 크다.
- **Constraints**: analyzer 입력은 첫 유효 음성부터 최대 60초여야 하고, 피치 분석은 16kHz mono로 충분하지만 최종 믹싱은 음악 감상을 위해 stereo 품질을 유지해야 한다.
- **Options**: 기존 server trim 유지, ffmpeg.wasm, WebCodecs 기반 Mediabunny의 client conversion을 비교했다. 믹싱 결과는 Modal 자체 변경과 local worker 저장 전 변환을 비교했다.
- **Decision**: 업로드는 동적 로드한 Mediabunny로 client에서 first-audible 최대 60초를 mono 16kHz·64kbps M4A 우선/WebM fallback으로 변환한 파일만 전송한다. 믹싱 결과는 worker가 Leemage 저장 전에 FFmpeg로 stereo AAC/M4A 160kbps로 압축한다. smart reference 구간은 새 오디오를 추가 생성하지 않고 sourceRanges를 기존 source player의 영역 controls로 재생한다.
- **Rationale**: ffmpeg.wasm core 다운로드 부담 없이 브라우저 native codec을 활용하고, 분석·합성에 필요한 품질과 영구 저장 크기를 용도별로 맞춘다. source range 재생은 추가 asset·중복 저장 없이 실제 선택 근거를 들려준다.
- **Trace**:
  - **탐색 시점**: Mediabunny 공식 Conversion API가 trimming, bitrate, resampling과 mono downmix를 지원하고 client에서 MP4/WebM 출력이 가능함을 확인했다. 현재 analyzer는 long-file 동의 시 server에서 WAV로 변환해 저장하며, worker는 Modal의 WAV bytes를 그대로 Leemage에 올리는 경로임을 확인했다.
  - **T06 확정 시점**: Chromium에서 6.8MB·225초 `vocals.m4a`를 선택해 첫 유효 음성부터 60초인 0.5MB Opus/WebM fallback으로 변환되고 WaveSurfer가 1:00만 표시함을 확인했다. AAC encoder가 지원되는 브라우저는 M4A를 우선한다. 실제 저장된 10,512,044B WAV 믹싱 결과를 worker 압축 경로로 변환한 결과 4,440,004B AAC/M4A로 57.8% 감소했다. sourceRanges는 low/mid/high 순서와 원본 시간 순서를 보존하며 한 영역의 복수 range를 연속 재생한다. descriptor가 없는 legacy profile에는 controls를 표시하지 않는다.
  - **T07 확정 시점**: Mediabunny에 정확히 60초 end timestamp를 요청해도 codec/container packet padding 때문에 analyzer가 디코딩한 sample 수가 60초를 소폭 넘을 수 있어 `TOO_LONG`이 발생했다. 서버의 60초 제한을 완화하지 않고 client 출력에 0.25초 headroom을 적용했다. 실제 225초 `vocals.m4a`는 0.5MB·59.76초 WebM으로 변환됐고, 같은 59.758초 경계 파일은 local analyzer에서 HTTP 200과 `durationMs=59750`으로 통과했다.
  - **T08 확정 시점**: 실행 중인 `vocal-profile-api` 컨테이너가 smart reference 구현 전 이미지여서 OpenAPI와 최근 DB profile 모두 `synthesisReference`가 없었다. web이 이를 legacy fallback으로 허용하면서 영역 없는 새 profile이 정상 저장됐다. 새 분석에는 `smart-reference-v1` descriptor 계약을 요구해 구버전이면 `ANALYZER_UPDATE_REQUIRED`로 저장 전에 중단하고, 기존/품질 미달 profile은 누락 이유와 재분석 안내를 표시한다. 로컬 컨테이너를 최신 코드로 재빌드한 뒤 실제 59.75초 입력에서 source range 12개와 low/mid/high 전 영역을 확인했다.
  - **T09 확정 시점**: 프로필 UI는 하나의 source player에서 band 버튼을 전환하지 않고 low/mid/high 각각 독립된 WaveSurfer instance를 제공한다. 각 instance의 기본 control은 descriptor의 해당 band source ranges만 연속 재생하고 합산 시간을 표시한다. 저장·믹싱 계약은 변경하지 않으며 analyzer가 세 band 구간을 원본 시간 순서로 결합한 최대 30초 `SYNTHESIS_REFERENCE` asset을 계속 사용한다. 구간 합산 단위 테스트, low/mid/high player SSR UI 테스트와 전체 `pnpm test`가 통과했다.
  - **T10 확정 시점**: source range 재생 제한만으로는 각 WaveSurfer가 동일한 전체 60초 파형을 그린다. source를 client에서 한 번 decode한 뒤 band별 ranges만 mono PCM으로 연결해 독립 WAV Blob URL을 만들고, 각 player는 이 짧은 URL을 전체 오디오로 재생·표시한다. preview는 메모리 전용이며 실패 시 전체 source를 대신 보여주지 않는다. 실제 smart profile에서 low 4초·mid 18초·high 8초의 서로 다른 Blob waveform과 독립 재생을 확인했으며 합계 30초는 descriptor의 부족분 재분배 결과와 일치했다.
  - **T11 확정 시점**: T05에서 profile health effect만 active guard로 바꿨지만 `RecommendationResults` 초기 fetch와 개발용 `SingerWorkbench` handoff fetch에는 cleanup의 `AbortController.abort()`가 남아 Next.js 16.3 개발 모드 remount에서 Runtime AbortError를 노출했다. 두 경로와 Workbench health fetch를 요청 강제 중단 대신 cleanup 이후 응답과 오류를 무시하는 동일 정책으로 통일했다. 추천 결과와 `/dev/svc` 진입·이탈·재진입 후 신규 AbortError 로그 0건, source 회귀 검사와 전체 `pnpm test` 통과를 확인했다.
- **Evidence**:
  - **Commit**: T06 task checkpoint commit에서 갱신
  - **PR**: local workflow — 해당 없음
  - **Test/Log**: https://mediabunny.dev/guide/converting-media-files
- **Consequences**: client codec 지원 검사가 필요하고, worker runtime에는 FFmpeg 실행 파일이 필요하다. 압축 실패는 큰 WAV 저장으로 조용히 fallback하지 않는다.
