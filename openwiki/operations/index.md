# 파일

- [설정·로컬 실행·배포 운영](configuration-and-deployment.md) - Node.js, pnpm, Docker PostgreSQL과 외부 분석·믹싱 서비스를 준비하고 Copysinger의 웹·worker를 로컬 또는 production에서 실행하는 절차를 설명한다. 환경 변수, 비용·동시성·lease·poll 정책, migration·seed·검증 명령을 함께 정리한다.
- [Durable job 처리와 장애 복구](job-processing.md) - 세 background worker의 entrypoint, 원자적 claim, lease·heartbeat, 외부 요청과 polling, retry/backoff, terminal failure와 media cleanup을 비교한다. 프로세스 재시작 뒤 어떤 작업이 다시 처리되는지와 운영 설정·검증 테스트를 설명한다.
