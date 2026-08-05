# Idea: top-three-recommendations

---

## 개요

- **Idea ID**: I005
- **Idea Name**: top-three-recommendations
- **Created**: 2026-08-05
- **Status**: Featureized
  - 값: Active | Featureized | Dropped
- **Feature**: F005-top-three-recommendations
- **PRD Refs**: PRD-US-005, PRD-US-006, PRD-FR-011, PRD-FR-012, PRD-FR-013, PRD-FR-014, PRD-FR-015, PRD-NFR-006, PRD-NFR-007
- **Component**: web

---

## 배경

상위 3곡과 구조화된 추천 이유를 API와 UI에 표시하고 기존 합성 데모로 연결한다.

분석 수치를 사용자가 선택할 수 있는 결과로 번역하고 이미 검증된 SVC 데모를 제품 흐름에 연결한다.

---

## 대략 범위

- In: recommendation run API, 상위 3곡 카드, 원키/추천키 점수, reason code 설명, 곡 선택 후 기존 SVC 입력 연결
- Out: 개인화 학습, 플레이리스트 공유, 자동 음원 확보, 결제/사용량 과금 UI

---

## 승격 메모

- 추천 이유는 구조화된 code와 수치에서 생성하며 과도한 정확성을 표현하지 않는다.
- 실제 100곡 목록이 준비되기 전 fixture 카탈로그로 UI를 검증한다.
- I004 scoring 완료 후 마지막으로 승격한다.
