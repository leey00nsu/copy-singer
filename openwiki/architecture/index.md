# 파일

- [PostgreSQL 큐와 lease 기반 worker](durable-workers.md) - PostgreSQL job row를 원장으로 삼아 세 background worker가 동시성, lease 만료 복구, heartbeat, 재시도와 최종 정리를 수행하는 방식을 설명한다. 동기 단일 응답인 보컬 프로필 분석과 외부 job을 submit/poll하는 곡 분석·믹싱의 차이를 비교한다.
- [시스템 경계와 요청 표면](system-boundaries.md) - Next.js App Router가 FSD 공개 API를 통해 페이지와 Route Handler를 연결하는 방식, 브라우저 상태의 소유권, PostgreSQL 큐 worker와 외부 서비스의 의존 방향을 설명한다.
