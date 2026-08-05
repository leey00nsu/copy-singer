# Idea: data-foundation

---

## 개요

- **Idea ID**: I001
- **Idea Name**: data-foundation
- **Created**: 2026-08-05
- **Status**: Active
  - 값: Active | Featureized | Dropped
- **Feature**: -
- **PRD Refs**: PRD-DATA-001, PRD-DATA-002, PRD-DATA-003, PRD-DATA-004, PRD-DATA-005, PRD-NFR-001, PRD-NFR-004
- **Component**: data

---

## 배경

PostgreSQL Docker Compose와 Prisma schema/migration/seed 기반을 구축한다.

후속 프로필·곡·추천 기능이 모두 버전이 있는 관계형 데이터를 필요로 하므로 첫 번째 선행 기능이다.

---

## 대략 범위

- In: `docker-compose.yml`, PostgreSQL healthcheck, Prisma 설치와 초기 schema, migration/seed skeleton, `.env.example`, DB 개발 명령
- Out: 사용자 인증, 실제 100곡 seed, 오디오 binary 저장, 운영 DB 배포

---

## 승격 메모

- PostgreSQL 16+, Prisma migration SSOT, 오디오는 경로만 저장한다.
- 로컬 포트·DB명·개발 credential을 확정해야 한다.
- 다음 단계: 가장 먼저 `data` component Feature로 승격한다.
