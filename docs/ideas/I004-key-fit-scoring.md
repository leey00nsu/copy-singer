# Idea: key-fit-scoring

---

## 개요

- **Idea ID**: I004
- **Idea Name**: key-fit-scoring
- **Created**: 2026-08-05
- **Status**: Active
  - 값: Active | Featureized | Dropped
- **Feature**: -
- **PRD Refs**: PRD-US-003, PRD-US-004, PRD-FR-008, PRD-FR-009, PRD-FR-010, PRD-NFR-004, PRD-NFR-007
- **Component**: data

---

## 배경

사용자와 곡 프로필을 비교해 원키 적합도와 추천 semitone 이동을 계산한다.

Copy Singer의 핵심 차별 기능이며 추천 이유가 검증 가능한 수치에서 나오도록 만드는 기반이다.

---

## 대략 범위

- In: 음역 overlap, 극단음 penalty, semitone 후보 탐색, tie-break, score breakdown, versioned pure function, fixture 회귀 테스트
- Out: 장르 취향, 인기 순위, 감정/음색 매칭, ML ranking, 절대적 가창력 평가

---

## 승격 메모

- scoring은 deterministic pure function으로 만들고 DB에는 입력 profile ID와 version을 저장한다.
- 추천 키 허용 범위(예: -6~+6)와 score weight는 fixture 검토로 확정한다.
- I002와 I003의 동일 버전 profile이 준비된 뒤 승격한다.
