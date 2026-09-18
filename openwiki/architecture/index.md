# 파일

- [브라우저 상태와 API 오류 계약](client-data-flow.md) - 화면이 서버 데이터를 가져오는 경로, TanStack Query 캐시 키와 폴링 정지 조건, 그리고 응답 실패를 재시도할지 판단하는 `ApiError`·`shouldRetryQuery`·QueryClient 기본값을 정리한 참조 문서예요.
- [데이터 모델과 수명 주기 상태](data-model.md) - Prisma 스키마에서 각 행의 소유 관계, 핵심 unique/index, 상태 enum과 전이를 정리한 참조 문서예요. 스키마를 읽거나 migration을 추가할 때 확인하세요.
- [HTTP API 표면과 요청 접수 규칙](http-api-surface.md) - app/api Route Handler adapter, admission(요청 제한) 그룹별 rate/burst, 업로드 본문 한도, 두 가지 오류 봉투를 정리한 참조 문서예요. 새 API를 추가하거나 429/413 응답을 해석할 때 확인하세요.
- [Shared ui and storybook](shared-ui-and-storybook.md) - 공용 UI 컴포넌트를 `src/shared/ui/`에 둘지 slice의 `ui` segment에 둘지 판단하는 기준, slice 밖에서 통과하는 public API, story 파일 배치와 Storybook 실행 환경, MSW(Mock Service Worker) fixture 재사용 방법, 그리고 Storybook 개발 전용 경계를 검사하는 조건과 명령을 정리한 참조 문서예요.
- [시스템 지도와 경계](system-map.md) - 이 저장소의 런타임 경계와 FSD(Feature-Sliced Design) 계층 의존 방향을 설명하고, 새 API·화면·slice·워커·migration을 어느 디렉터리에 두어야 하는지 정리한 지도 문서예요.
