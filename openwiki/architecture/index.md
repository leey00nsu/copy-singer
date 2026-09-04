# 파일

- [도메인 데이터 모델과 영속성](data-model.md) - Prisma schema를 기준으로 사용자, 녹음, 보컬 프로필, 곡 카탈로그, 추천, 티켓, 알림, 작업, 미디어 metadata의 관계와 상태를 설명한다. 오디오 bytes가 외부 저장소에 있고 PostgreSQL에는 참조와 분석 결과만 저장되는 경계를 함께 정리한다.
- [모듈 경계와 서버 역량](module-boundaries.md)
- [시스템 지도와 런타임 경계](system-map.md) - Next.js adapter에서 FSD 계층을 거쳐 PostgreSQL과 Leemage를 사용하는 요청 경로와, durable job을 Modal로 처리하는 worker 경로를 설명한다. 현재 코드의 경계·상태·실패 및 재시도 규칙을 PRD의 요구사항과 구분해 정리한다.
