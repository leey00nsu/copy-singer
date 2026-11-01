# 파일

- [브라우저 상태와 API 오류 계약](client-data-flow.md) - TanStack Query 키에 붙는 체험·회원 구분, 화면별 폴링 정지 조건, `requestJson`·`ApiError`·`shouldRetryQuery`의 재시도 판정, 그리고 체험 정책 쿼리가 화면 분기를 여는 지점을 정리한 참조 문서예요.
- [데이터 모델과 수명 주기 상태](data-model.md) - Prisma 스키마에서 각 행의 소유 관계, 핵심 unique/index, 상태 enum과 비회원 체험 trial 제약을 정리한 참조 문서예요. 스키마를 읽거나 migration을 추가할 때 확인하세요.
- [HTTP API 표면과 요청 접수 규칙](http-api-surface.md) - app/api Route Handler adapter, `withApiAdmission`의 게이트 순서와 `allowGuest`·`allowPublic` 옵션, 그룹별 rate/burst, 업로드 본문 한도, 두 오류 봉투, `Idempotency-Key`·`Origin` 검사 위치를 정리한 참조 문서예요.
- [공용 UI와 Storybook 경계](shared-ui-and-storybook.md) - 공용 UI 컴포넌트와 story, MSW handler를 어디에 만들고 어떤 명령으로 검사하는지 안내해요. `src/shared/ui`와 slice `ui` segment의 배치 기준, story 파일 위치와 실행 환경, `save-trial`·`admin-tables` story의 fixture와 라우터 mock 방식, 개발 전용 경계 검사를 다뤄요.
- [시스템 지도와 경계](system-map.md) - 이 저장소의 런타임 경계와 FSD(Feature-Sliced Design) 계층 의존 방향을 설명하고, 새 API·화면·slice·워커·migration을 어느 디렉터리에 두어야 하는지 정리한 지도 문서예요. 비회원 체험 도메인(`src/entities/guest-analysis`)이 웹 요청과 워커 양쪽에서 소비되는 위치, 애플리케이션 런타임 밖의 최상위 `ops/` 디스패처 컨테이너와 `.github/workflows/` 자동화 위치도 함께 표시해요.
