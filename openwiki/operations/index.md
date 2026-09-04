# 파일

- [Configuration, local operation, and deployment](configuration-and-deployment.md) - Node/pnpm 애플리케이션을 PostgreSQL, durable worker, Modal 분석·믹싱 서비스와 함께 로컬 및 단일 인스턴스에서 실행하는 절차를 설명한다. 환경 변수, migration·seed, 검증 스크립트와 배포 전후 순서를 한곳에서 확인할 수 있다.
- [내구성 worker, lease, retry 및 recovery](job-processing.md) - PostgreSQL 기반 mixing, song-analysis, vocal-profile-analysis 큐의 claim·lease·heartbeat·재시도·복구 동작을 설명합니다. 외부 작업 polling, 환불·알림·미디어 정리, 프로세스 supervision의 운영 규칙과 실패 경로를 한곳에서 확인할 수 있습니다.
