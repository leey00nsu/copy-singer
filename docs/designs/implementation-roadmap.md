# 구현 로드맵

## 0. 완료된 기반

- Next.js/shadcn SVC 테스트 UI
- Modal SoulX-Singer 비동기 변환 API
- 오디오 업로드, 상태 폴링, 결과 WAV 재생·다운로드

## 1. 데이터 기반

- PostgreSQL Docker Compose
- Prisma 설치, schema, migration, seed skeleton
- DB health와 개발 명령 정리

## 2. 사용자 보컬 프로필

- 브라우저 녹음/업로드 UX
- CPU 분석 서비스와 librosa pYIN 분석
- 품질 검증 및 `VocalProfile` 저장·조회

## 3. 노래 카탈로그

- 사용자 제공 100곡 목록 import 계약
- 곡 메타데이터와 분석 상태
- 곡 보컬 분리/프로필 batch pipeline

## 4. 키 적합도 엔진

- 음역 overlap과 극단음 penalty
- semitone 후보 탐색
- scoring version과 fixture 기반 회귀 테스트

## 5. 상위 3곡 추천

- ranking과 tie-break 규칙
- reason code → 사용자 설명 변환
- 추천 결과 화면

## 6. 합성 데모 연결

- 추천 곡에서 기존 SVC flow로 이동
- 사용자 profile recording을 reference 후보로 연결
- 사용 권한 및 비용 안내 유지

각 단계는 Idea를 Feature로 승격하고, `workflow-stage` 승인 경계를 통과한 뒤 구현한다.
