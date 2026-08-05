# Idea: recommendation-card-synthesis

---

## 개요

- **Idea ID**: I006
- **Idea Name**: recommendation-card-synthesis
- **Created**: 2026-08-06
- **Status**: Featureized
  - 값: Active | Featureized | Dropped
- **Feature**: F006-recommendation-card-synthesis
- **PRD Refs**: PRD-US-007, PRD-FR-016, PRD-FR-017, PRD-FR-018, PRD-FR-019, PRD-FR-020, PRD-DATA-007, PRD-NFR-002, PRD-NFR-003, PRD-NFR-006, PRD-NFR-008
- **Component**: web

---

## 배경

추천 상위 3곡을 사용자 보컬 프로필의 녹음으로 자동 합성하고 각 추천 카드에서 준비·믹싱·완료·실패 상태와 결과 오디오를 제공한다. 원곡은 작업 중에만 임시 다운로드하고 auto pitch shift 없이 원곡 멜로디를 유지하며 기존 자유 입력 Workbench는 개발용으로 남긴다.

F005의 자유 입력 Workbench는 모델과 API를 검증하기에는 유용하지만, 일반 사용자가 추천된 곡마다 reference와 target을 다시 준비해야 해 핵심 제품 흐름이 끊긴다. 추천 결과 자체가 바로 청취 가능한 데모가 되어야 “내 목소리에 맞는 곡을 발견하고 들어본다”는 경험이 완성된다.

---

## 대략 범위

- In: 사용자 테스트 녹음의 서버 간 reference 전달, allowlist 원곡의 작업 중 임시 다운로드, 추천 item별 Modal job 자동 생성·상태 저장·폴링, 카드 내 로딩·오류·재생·다운로드, 고정 제품 preset
- Out: 사용자가 조절하는 합성 옵션, 추천 4위 이하 자동 합성, 원곡/중간 stem 영구 저장, 기존 Workbench 제거, Modal 배포와 production 인증·과금

---

## 승격 메모

- F005 추천 순위·점수·이유는 변경하지 않고 각 item에 합성 lifecycle만 보강한다.
- 원곡 피치를 유지하기 위해 `auto_pitch_shift=false`, `pitch_shift=0`으로 고정한다. F004 추천 노래방 키는 표시용이며 합성 pitch와 혼합하지 않는다.
- target은 반주 포함 원곡이므로 vocal separation과 accompaniment remix를 켜고, 사용자 테스트 녹음은 깨끗한 reference로 간주해 prompt separation을 끈다.
- 한 추천당 GPU job 3개가 생기므로 중복 시작 방지, 부분 실패 격리와 무료 크레딧 소비 가시성이 필요하다.
- 원본 음원을 사용자에게 직접 제공하지 않고 합성 결과만 제공하며 모든 원본·중간 파일은 작업 종료 시 삭제해야 한다.
