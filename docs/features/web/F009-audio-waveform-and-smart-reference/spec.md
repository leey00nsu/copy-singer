# Feature Spec: audio-waveform-and-smart-reference

> 기술 스택은 plan.md에서 다룹니다.

---

## 개요

- **기능 ID**: F009
- **기능명**: audio-waveform-and-smart-reference
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-07
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 목적

테스트 녹음 중 실제 입력을 확인할 수 없고, 화면별 native audio player와 직접 작성한 waveform·SVG 차트가 서로 다른 경험을 제공한다. 또한 보컬 프로필 분석기는 최대 60초 전체를 분석하지만 SoulX-Singer는 저장된 reference의 앞 30초만 사용하므로, 긴 제출 음성의 좋은 음역·품질 구간이 합성에 반영되지 않을 수 있다.

녹음과 재생은 WaveSurfer 기반으로 통일하고, 프로필 시각화는 shadcn Chart/Recharts로 전환한다. 제출 음성은 최대 60초 분석 소스로 유지하되 AI 믹싱용 reference는 분석 결과를 이용해 무음과 저품질 구간을 제외하고 저·중·고 음역을 대표하는 phrase를 최대 30초로 별도 생성한다.

> 현재 구현 확인: 음역 프로필은 CSS absolute positioning, 음정 분포와 상세 피치 추적은 직접 작성한 SVG이며 shadcn Chart가 아니다. 프로젝트에는 `components/ui/chart.tsx`와 `recharts`도 아직 없다.

---

## 사용자 스토리

### US-1: 녹음 중 입력 파형 확인

**As a** 테스트 녹음을 만드는 사용자
**I want** 녹음 중 마이크 입력 파형과 경과 시간을 실시간으로 보고 싶다
**So that** 무음·마이크 오류를 녹음 완료 전에 알아차릴 수 있다

**Acceptance Criteria:**

- [ ] 녹음 시작과 동시에 실제 마이크 스트림 기반 파형이 움직인다.
- [ ] 수동 정지 또는 60초 자동 종료 후 동일 녹음이 파형 플레이어에서 재생된다.
- [ ] 권한 거부·녹음 취소·컴포넌트 이탈 시 stream, recorder와 WaveSurfer instance가 정리된다.

### US-2: 일관된 파형 오디오 플레이어

**As a** 녹음·업로드·합성 결과를 듣는 사용자
**I want** 모든 화면에서 같은 파형 플레이어를 사용하고 싶다
**So that** 재생 위치와 진행 상태를 직관적으로 확인할 수 있다

**Acceptance Criteria:**

- [ ] 보컬 프로필 입력·저장 음성, 추천·믹싱 결과와 개발 Workbench의 사용자 재생 오디오가 공통 플레이어를 사용한다.
- [ ] 재생·일시정지, 파형 탐색, 현재/전체 시간, loading·error 상태와 키보드 접근을 제공한다.
- [ ] Blob URL과 same-origin Range API를 지원하며 큰 파일 decode 실패 시 재생 가능한 fallback을 제공한다.

### US-3: 분석과 합성에 맞는 reference 사용

**As a** 긴 노래 파일을 제출하는 사용자
**I want** 프로필은 충분한 구간으로 분석하고 합성에는 밀도 높은 대표 음성을 사용하고 싶다
**So that** 추천 통계와 AI 믹싱 음질을 동시에 보존할 수 있다

**Acceptance Criteria:**

- [ ] 60초 초과 파일 동의 흐름은 최초 유효 음성부터 최대 60초의 분석 소스를 만든다.
- [ ] 프로필 통계·histogram·pitch track은 편집되지 않은 분석 소스의 자연 분포를 사용한다.
- [ ] 분석 완료 후 내부 무음과 저품질 frame을 제외한 유성 phrase를 저·중·고 음역에서 각 10초 목표로 선택해 최대 30초의 별도 합성 reference를 만든다.
- [ ] 특정 음역의 품질 좋은 phrase가 10초보다 부족하면 억지 반복·무음 padding 없이 남은 시간을 다른 음역의 좋은 phrase에 재분배한다.
- [ ] 사용자에게 재생되는 제출 음성은 분석 소스이고 worker는 별도 합성 reference를 SoulX-Singer prompt로 사용한다.

### US-4: 일관된 보컬 프로필 차트

**As a** 보컬 프로필을 확인하는 사용자
**I want** 음역·분포·피치 흐름을 반응형 차트와 tooltip으로 보고 싶다
**So that** 모바일과 데스크톱에서 분석 근거를 정확히 탐색할 수 있다

**Acceptance Criteria:**

- [ ] 음역 프로필, histogram, pitch trace가 shadcn Chart/Recharts 기반으로 표시된다.
- [ ] histogram hover/focus에 음이름·MIDI·비율이 표시되고 중앙음이 구분된다.
- [ ] pitch trace는 무성 구간을 선으로 잇지 않고 시간·음이름 tooltip을 제공한다.
- [ ] 차트는 반응형이며 accessibility layer와 기존 텍스트 요약을 함께 유지한다.

---

## 기능 요구사항

### FR-1: WaveSurfer 실시간 녹음

- `wavesurfer.js` Record plugin의 continuous 또는 scrolling waveform을 사용한다.
- 녹음 Blob은 기존 analyzer가 허용하는 WebM/MP4 MIME 계약을 유지한다.
- 녹음은 수동 정지 또는 60초에 자동 종료하고 업로드와 동일한 최대 분석 길이를 사용한다.
- 하나의 마이크 권한과 stream만 사용하고 React Strict Mode 재마운트에서도 중복 recorder를 만들지 않는다.

### FR-2: WaveSurfer 공통 플레이어

- `wavesurfer.js`와 `@wavesurfer/react`로 재사용 가능한 client component를 제공한다.
- 기존 native `<audio>` 재생 위치를 공통 플레이어로 교체하되 다운로드 링크와 보호 API를 유지한다.
- WaveSurfer가 전체 파일을 browser memory에서 decode한다는 제약을 고려해 긴 파일은 pre-decoded peaks 또는 native media fallback을 사용한다.

### FR-3: 분석 소스와 30초 합성 reference 분리

- 프로필 분석 최대 길이는 60초로 유지한다. 30초 제한은 SoulX-Singer prompt에만 적용한다.
- analyzer의 pitch/VAD·품질 결과로 내부 무음을 제거한 phrase 후보를 만들고 저음(p10 부근), 중심음(p50 부근), 고음(p90 부근)에 각 10초의 목표 budget을 둔다. 각 후보는 voiced density, clipping, RMS와 phrase 연속성을 함께 평가한다.
- 품질 기준을 통과한 phrase가 부족한 band의 미사용 budget은 다른 band에 재분배한다. 선택은 원본 시간 순서를 보존하고 최소 phrase 길이와 짧은 crossfade를 사용하며 총 길이는 30초를 넘지 않는다.
- 동일 source에 대해 selection 결과가 결정적이어야 하며, 단순 앞 30초 baseline과 비교 가능한 selection metadata를 남긴다.
- 제출/분석 source와 합성 reference를 별도 MediaAsset으로 영속화하고 selection policy/version/source ranges를 저장한다.
- 합성 reference 생성 실패 시 프로필 저장 전체를 잃지 않으며, 안전한 30초 연속 구간 fallback 또는 명시적 reference 준비 실패 상태를 사용한다.

### FR-4: shadcn Chart 기반 프로필 시각화

- shadcn CLI의 Chart component와 Recharts v3를 사용한다.
- 음역 profile은 ranged bar/reference line, histogram은 bar chart, pitch trace는 null gap을 보존하는 line chart로 구성한다.
- `ChartTooltip`, chart theme token, responsive container와 accessibility layer를 사용한다.

### FR-5: 기존 데이터·화면 호환성

- 과거 profile에 합성 reference가 없으면 기존 reference의 앞 30초를 사용하는 명시적 legacy fallback을 유지한다.
- 시각화 descriptor가 없는 과거 profile의 unavailable UI를 유지한다.
- 관리자에게 사용자 reference 접근 권한을 추가하지 않는다.

### FR-6: 업로드·믹싱 결과 경량화와 reference 구간 재생

- 60초 초과 업로드는 브라우저에서 첫 유효 음성부터 최대 60초만 남기고 음성 분석에 적합한 mono 저비트레이트 오디오로 변환한 뒤 전송한다.
- 60초 이하 업로드도 같은 경량 포맷으로 표준화하며, 선택 완료 화면의 파일 크기·길이·파형은 실제 전송할 변환본을 기준으로 표시한다.
- 브라우저 변환이 지원되지 않거나 실패하면 원본 전체를 조용히 전송하지 않고 사용자에게 다시 선택 가능한 오류를 표시한다.
- AI 믹싱 결과는 장기 저장 전에 스트리밍·다운로드 가능한 압축 오디오로 변환하며 UI의 파일명과 MIME도 실제 포맷을 따른다.
- smart synthesis reference의 `sourceRanges`를 저음·중앙·고음 영역으로 묶어 제출한 60초 source 위에서 각 영역을 선택 재생할 수 있게 한다.
- 과거 profile처럼 selection descriptor가 없으면 영역 재생 UI를 숨기고 기존 source 재생을 유지한다.

## 비기능 요구사항

- **성능**: 60초 녹음 파형이 일반 노트북·모바일에서 지속적으로 갱신되어도 녹음 chunk 수집을 방해하지 않아야 한다. 긴 업로드는 사용자 확인 후 브라우저에서 한 번만 decode·trim·압축하고, WaveSurfer에는 변환된 최대 60초 파일만 전달한다.
- **정확성**: 합성 reference 편집은 프로필 통계 입력에 사용하지 않아 histogram과 음역 분포를 인위적으로 10:10:10으로 바꾸지 않는다.
- **보안·개인정보**: browser에는 Leemage 원본 URL을 노출하지 않고 기존 소유권 검증 audio proxy를 유지한다.
- **접근성**: 재생 컨트롤은 button label, keyboard focus와 시간 text를 제공하고 차트는 시각 정보와 동등한 텍스트 요약을 유지한다.
- **호환성**: Chromium·Safari의 MediaRecorder MIME 차이를 유지하고 WaveSurfer 초기화 실패 시 기본 재생 기능을 잃지 않는다.

## 범위 제외

- 사용자가 직접 cut point를 편집하는 오디오 편집기
- spectrogram, EQ, gain·noise reduction UI
- 원곡 target의 영구 waveform peak 저장
- SoulX-Singer 모델 자체 변경 또는 30초 prompt limit 확대

---

## 관련 문서

- PRD: `../../prd/`
- PRD Refs: `PRD-US-016`, `PRD-US-017`, `PRD-US-018`, `PRD-FR-040`, `PRD-FR-041`, `PRD-FR-042`, `PRD-FR-043`, `PRD-NFR-005`
