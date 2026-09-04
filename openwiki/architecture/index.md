# 파일

- [도메인 데이터 모델과 영속성 불변식](data-model.md) - Prisma schema를 기준으로 사용자, 녹음, 보컬 프로필, 곡 카탈로그, 추천, 티켓, 알림, 작업, 미디어 metadata의 관계와 상태를 설명한다. 오디오 bytes가 외부 저장소에 있고 PostgreSQL에는 참조와 분석 결과만 저장되는 경계를 함께 정리한다.
- [Feature-Sliced 모듈과 공개 API 경계](module-boundaries.md) - src의 App·Pages·Widgets·Features·Entities·Shared 계층이 어떤 방향으로 의존하는지와 browser-safe·server-only 공개 API를 설명한다. 새 기능, API Route, worker adapter를 올바른 소유 경계에 배치하고 경계 테스트로 검증하는 방법을 제공한다.
- [시스템 지도와 런타임 경계](system-map.md) - Next.js adapter에서 FSD 계층을 거쳐 PostgreSQL과 Leemage를 사용하는 요청 경로와, durable job을 Modal로 처리하는 worker 경로를 설명한다. 현재 코드의 경계·상태·실패 및 재시도 규칙을 PRD의 요구사항과 구분해 정리한다.
