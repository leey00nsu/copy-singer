# Idea: song-catalog-profiles

---

## 개요

- **Idea ID**: I003
- **Idea Name**: song-catalog-profiles
- **Created**: 2026-08-05
- **Status**: Featureized
  - 값: Active | Featureized | Dropped
- **Feature**: F003-song-catalog-profiles
- **PRD Refs**: PRD-FR-005, PRD-FR-006, PRD-FR-007, PRD-DATA-004, PRD-DATA-005, PRD-DATA-006, PRD-NFR-004, PRD-NFR-006
- **Component**: data

---

## 배경

사용자가 제공할 100곡 목록 import와 곡 보컬 프로필 batch 분석 구조를 구현한다.

사용자 프로필과 동일한 기준으로 비교 가능한 곡 데이터가 있어야 추천과 키 계산이 가능하다.

---

## 대략 범위

- In: 실제 100곡 metadata import, idempotent upsert, 분석 상태, 로컬 개발 전용 yt-dlp 일시 처리, vocal separation, 같은 analyzer 버전의 곡 프로필 batch 생성, 원본·stem 무조건 삭제
- Out: 음원 영구 보관·배포, 공개 서비스용 YouTube downloader, DRM/인증 우회, 자동 가사/MIDI 정렬

---

## 승격 메모

- 실제 목록은 `tj_2607_top100.md`의 순위·제목·가수·YouTube URL을 사용한다.
- DB에는 링크와 집계 분석값만 남기며 다운로드 원본과 분리 stem은 작업 종료 시 삭제한다.
- I001과 I002의 profile schema/analyzer가 안정된 후 승격한다.
