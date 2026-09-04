# 파일

- [곡 카탈로그 수집·분석·게시 운영](catalog-ingestion-and-publishing.md) - 관리자가 YouTube 출처와 target asset을 등록·교체하고 PostgreSQL 큐와 Modal 분석기가 분석 결과를 저장하는 흐름을 설명한다. source revision, analysis revision, asset, catalog revision을 분리해 검증한 뒤 게시하는 안전 기준과 실패 복구 방법을 다룬다.
- [미디어 저장·프록시·정리 수명주기](media-lifecycle.md) - 사용자 reference, synthesis reference, mixing result와 카탈로그 target asset이 Leemage의 외부 파일과 PostgreSQL 포인터로 연결되는 흐름을 설명한다. private audio의 인증 경계와 삭제 실패를 MediaCleanupJob이 복구하는 경로, 참조 중인 카탈로그 asset을 보존하는 규칙을 함께 다룬다.
- [실행·설정·배포와 운영 복구](runtime-configuration.md) - 로컬 PostgreSQL, Next.js와 세 background worker를 실행하고 Prisma 데이터베이스를 준비하는 절차를 정리한다. Modal 분석기 배포, production start, 환경변수 검증, concurrency·lease 조정과 실패 작업 복구 기준을 함께 설명한다.
