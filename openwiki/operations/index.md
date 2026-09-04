# 파일

- [설정·로컬 실행·배포 운영](configuration-and-deployment.md) - Node.js, pnpm, Docker PostgreSQL과 Modal·Leemage·OAuth·FFmpeg를 설정하고 Copysinger의 웹과 background worker를 로컬 및 production에서 실행하는 순서를 설명한다. migration, seed, 환경 변수 검증, 배포 후 점검 명령을 함께 제공한다.
- [Durable worker와 작업 lifecycle](job-processing.md) - 보컬 프로필 분석·곡 분석·믹싱 queue가 요청을 durable job row로 저장하고, 원자적으로 claim한 뒤 lease와 외부 작업을 통해 terminal 결과로 수렴하는 과정을 설명한다. 재시작 복구, retry/backoff, ticket 환불·알림, 화면 상태와 DB/API 상태의 차이를 운영 관점에서 정리한다.
