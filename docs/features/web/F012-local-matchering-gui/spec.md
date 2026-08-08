# Feature Spec: mixing-clarity-finalization

> 기존 F012 로컬 Matchering GUI 초안은 폐기하고, 이 문서부터 F012를 production AI 믹싱 결과의 Clarity 후처리 Feature로 사용합니다.

---

## 개요

- **기능 ID**: F012
- **기능명**: mixing-clarity-finalization
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-08
- **상태**: Approved

---

## 목적

SoulX AI 믹싱이 성공한 뒤 사용자에게 저장·재생·다운로드되는 최종 음원에 로컬 A/B 테스트에서 선택한 **Clarity / Normal** 보정을 일관되게 적용한다. 또한 SoulX의 자동 반주 믹싱 단계에서 생성 보컬이 반주보다 과도하게 크게 들리는 문제를 줄이기 위해 고정된 보컬/반주 gain contract를 적용한다.

현재 SoulX 결과는 곧바로 AAC/M4A로 압축해 Leemage에 저장한다. F012에서는 최종 압축 직전에 고정된 FFmpeg DSP 체인을 적용해 답답한 저중역을 줄이고 보컬 존재감과 공기감을 높인 뒤, -14 LUFS / -1 dBTP 기준으로 finalization하고 한 번만 AAC로 인코딩한다.

---

## 사용자 스토리

### US-1: 더 선명한 최종 AI 믹싱 음원

**As a** AI 믹싱을 실행한 사용자  
**I want** 합성 직후 별도 조작 없이 Clarity 보정이 적용된 결과를 받기를 원한다.  
**So that** 보컬이 반주 안에서 더 명확하게 들리고 결과 음원의 체감 완성도가 높아진다.

**Acceptance Criteria:**

- [x] SoulX가 `succeeded`를 반환한 결과 오디오에 Clarity / Normal 후처리가 최종 저장 전에 자동 적용된다.
- [x] 최종 결과는 기존과 동일하게 `audio/mp4` M4A로 Leemage에 저장되고 기존 재생·다운로드 API를 그대로 사용한다.
- [x] 후처리와 AAC 압축 사이에 불필요한 lossy 중간 인코딩을 추가하지 않는다.
- [x] Clarity 보정 실패 시 원본 SoulX 결과를 조용히 저장하지 않고 안정적인 오류 코드로 실패/재시도 경계를 유지한다.
- [x] 기존 catalog target, mid-only reference, 티켓, 소유권, 결과 asset lifecycle semantics를 변경하지 않는다.
- [x] `auto_mix_accompaniment=true`인 SoulX 결과는 생성 보컬 -2.0 dB, 반주 0.0 dB로 합산한 뒤 기존 peak protection을 거친다.

---

## 기능 요구사항

### FR-1: 고정 Clarity / Normal DSP

production AI 믹싱 결과에는 다음 고정 파라미터를 적용한다.

- high-pass: 25 Hz
- low shelf: 95 Hz, Q 0.7, -0.4 dB
- low-mid EQ: 280 Hz, Q 0.9, -1.4 dB
- presence EQ: 3.5 kHz, Q 0.9, +1.3 dB
- treble shelf: 8.5 kHz, Q 0.6, +1.7 dB
- compressor: threshold 0.20, ratio 1.5:1, attack 20 ms, release 220 ms, knee 2.8, RMS detection, maximum channel link
- stereo width: 1.05
- soft clipping: 사용하지 않음
- loudness: integrated -14 LUFS, LRA 11, true peak -1.0 dBTP
- final output: 44.1 kHz stereo AAC 160 kbps M4A

이 설정의 version은 `clarity-normal-v1`로 고정한다.

### FR-2: SoulX 보컬/반주 밸런스

`auto_mix_accompaniment=true`일 때 생성 보컬에는 -2.0 dB gain을 적용하고 분리된 target 반주는 0.0 dB gain으로 유지한 뒤 합산한다. 반주 pitch shift와 합산 후 peak protection은 기존 동작을 유지한다. 이 설정은 `vocal-balance-v2`로 고정한다.

### FR-3: 최종 저장 경계

SoulX 결과 bytes는 `Clarity DSP → AAC/M4A encode → Leemage upload` 순서로 처리한다. Clarity와 AAC encode는 가능한 한 하나의 FFmpeg invocation에서 수행해 intermediate WAV 저장과 추가 인코딩을 피한다.

### FR-4: 실패 및 재시도

후처리/인코딩 실패는 `MIXING_FINALIZATION_FAILED`로 식별한다. 이미 SoulX job이 접수된 뒤의 단계이므로 기존 Modal job을 재사용해 bounded retry하고, 성공하지 못한 경우 미보정 결과를 사용자에게 성공 결과로 노출하지 않는다.

---

## 비기능 요구사항

- **음질**: 로컬 A/B 테스트에서 선택한 Clarity / Normal 파라미터와 production 구현이 동일해야 한다.
- **결정성**: 같은 입력 bytes와 FFmpeg 버전/설정에는 같은 filter contract를 사용한다.
- **성능**: 전체 곡 길이 후처리를 worker에서 수행하되 임시 디렉터리를 항상 정리하고 기존 mixing lease/retry를 깨지 않는다.
- **호환성**: 기존 완료된 MixingJob과 저장 결과는 재처리하지 않는다. F012 적용 이후 새로 성공하는 믹싱부터 적용한다.
- **보안·소유권**: 사용자/카탈로그 오디오의 외부 저장 및 접근 정책은 기존 Leemage/owner-scoped API를 유지한다.

---

## 범위 제외

- 사용자가 UI에서 mastering preset이나 intensity를 선택하는 기능
- BandLab 또는 외부 mastering SaaS 연동
- Matchering reference 기반 mastering
- 기존 완료 결과의 일괄 재마스터링
- DB schema에 mastering preset/version을 별도로 영구 저장하는 작업

---

## 관련 문서

- PRD: `../../prd/copy-singer-prd.md`
- PRD Refs: `PRD-FR-044`
