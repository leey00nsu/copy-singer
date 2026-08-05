# Idea: song-catalog-profiles

---

## 개요

- **Idea ID**: I003
- **Idea Name**: song-catalog-profiles
- **Created**: 2026-08-05
- **Status**: Active
  - 값: Active | Featureized | Dropped
- **Feature**: -
- **PRD Refs**: PRD-FR-005, PRD-FR-006, PRD-FR-007, PRD-DATA-004, PRD-DATA-005, PRD-NFR-004
- **Component**: data

---

## 배경

사용자가 제공할 100곡 목록 import와 곡 보컬 프로필 batch 분석 구조를 구현한다.

사용자 프로필과 동일한 기준으로 비교 가능한 곡 데이터가 있어야 추천과 키 계산이 가능하다.

---

## 대략 범위

- In: 곡 metadata import 계약, idempotent seed/upsert, 분석 상태, vocal separation 연계, 같은 analyzer 버전의 곡 프로필 batch 생성
- Out: 100곡 실제 목록과 음원 수집, 저작권 음원 배포, 자동 가사/MIDI 정렬

---

## 승격 메모

- 목록 없이도 fixture 2~3곡으로 pipeline을 검증할 수 있어야 한다.
- 실제 목록이 오면 필수 컬럼, 원키 표기와 음원 참조 방식을 확정한다.
- I001과 I002의 profile schema/analyzer가 안정된 후 승격한다.
