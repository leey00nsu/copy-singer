# 파일

- [관리자 콘솔과 커스텀 믹싱](admin-console.md) - 관리자 화면의 네 목록(회원·체험, 믹싱 작업, 음원 관리, 커스텀 믹싱)과 관리자 API를 고칠 때 여는 파일, 목록별 URL 상태, 서버 권한 검사, 변경 범위 테스트를 정리해요.
- [환경 변수와 런타임 한도](configuration.md) - 서버·워커·미디어·Modal·인증·비회원 체험 동작을 바꾸는 환경 변수의 이름, 기본값, 허용 범위와 적용 지점을 정리한 참조 문서예요.
- [Job 큐와 lease 복구 계약](job-processing.md) - PostgreSQL 작업 행을 세 워커가 어떻게 점유하고, lease와 deadline을 어떻게 검증하며, 재시도·종료 상태 확정·외부 작업 정리와 유휴 반복의 정리 단계를 어떤 규칙으로 처리하는지 정리한 참조 문서예요.
- [Knowledge 생성과 CI 자동화](knowledge-automation.md) - 로컬 lee-spec-kit knowledge sync 경로와 CI 생성 경로의 차이, Coolify가 스케줄하는 디스패처의 due 판정, 그리고 텔레메트리 수집과 완료 판정을 거쳐 초안 또는 준비된 리뷰 PR로 끝나는 워크플로 게이트를 정리한 how-to예요.
- [로컬 실행과 배포](local-runtime.md) - 저장소를 처음 받은 개발자가 의존성을 설치하고 로컬 PostgreSQL과 웹·세 워커를 띄운 다음 Modal 분석 서비스를 배포하고 production으로 실행하는 명령 순서를 정리한 절차 문서예요. migration 적용 범위와 설정·성능 확인 명령도 함께 다뤄요.
- [미디어 저장과 정리 의도](media-storage.md) - 오디오 업로드·비공개 재생·삭제 예약을 할 때 부르는 진입점과, bytes는 Leemage에 관계·상태는 PostgreSQL에 두고 MediaOperation으로 DB 삭제와 외부 파일 삭제를 맞추는 규칙을 정리해요.
- [복구 스크립트 운영 절차](recovery-runbook.md) - 접수가 확인되지 않은 외부 제출, 미정리 미디어 의도, 가입 지급 누락을 어떤 명령과 인자로 확정하는지와, 각 단계가 실제로 바꾸는 값이 무엇인지 정리한 운영 절차예요.
