# Idea: user-vocal-profile

---

## 개요

- **Idea ID**: I002
- **Idea Name**: user-vocal-profile
- **Created**: 2026-08-05
- **Status**: Active
  - 값: Active | Featureized | Dropped
- **Feature**: -
- **PRD Refs**: PRD-US-001, PRD-US-002, PRD-FR-001, PRD-FR-002, PRD-FR-003, PRD-FR-004, PRD-NFR-002, PRD-NFR-003, PRD-NFR-004
- **Component**: web

---

## 배경

브라우저 테스트 녹음과 librosa 기반 사용자 보컬 프로필 생성·저장을 구현한다.

추천 엔진의 핵심 입력이다. 잘 정의된 녹음 프로토콜과 품질 검증이 없으면 이후 점수의 신뢰도를 설명할 수 없다.

---

## 대략 범위

- In: MediaRecorder 또는 파일 업로드, 미리 듣기/재녹음, librosa pYIN 분석, 품질 gate, VocalProfile 저장/조회, fixture 테스트
- Out: 음색 기반 가수 유사도, 의료적 발성 진단, 계정별 장기 이력, 모바일 브라우저 완전 최적화

---

## 승격 메모

- `docs/designs/vocal-profile-open-source.md`의 MVP 계약과 분석 버전 저장을 유지한다.
- 테스트 녹음 문구/멜로디와 최소 유효 길이를 feature spec에서 확정해야 한다.
- I001 data-foundation 완료 후 승격한다.
