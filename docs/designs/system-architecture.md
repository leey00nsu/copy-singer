# 시스템 아키텍처

## 구성요소

| 컴포넌트 | 경로 | 역할 |
| --- | --- | --- |
| Web UI | `app/`, `components/` | 오디오 선택, 설정, 상태 폴링, 결과 재생 |
| Next.js API proxy | `app/api/` | 서버 전용 인증, 업로드 스트리밍, 응답 프록시 |
| Modal web function | `services/soulx-singer-svc/modal_app.py` | FastAPI 계약, 파일 저장, 비동기 GPU 작업 관리 |
| Modal GPU worker | `SoulXModel` | SoulX-Singer 모델 로드, 전처리, SVC 추론, 반주 재믹스 |
| Modal storage | Volume + Dict | 모델·작업 파일과 작업 메타데이터 보관 |

## 요청 흐름

1. 브라우저가 두 오디오와 advanced settings를 `POST /api/conversions`로 전송한다.
2. Next.js가 multipart boundary를 유지한 채 요청 body를 Modal로 스트리밍한다.
3. Modal web function이 입력 파일을 작업 Volume에 저장하고 GPU FunctionCall을 spawn한다.
4. 브라우저가 Next.js를 통해 상태를 폴링한다.
5. GPU worker가 정규화, 선택적 보컬 분리, F0 추출, SVC 추론과 선택적 반주 믹스를 수행한다.
6. 완료되면 브라우저가 결과 WAV를 Next.js 프록시를 통해 재생하거나 다운로드한다.

## API 계약

| Method | Next.js | Modal | 설명 |
| --- | --- | --- | --- |
| GET | `/api/health` | `/health` | 연결 상태 |
| POST | `/api/conversions` | `/v1/conversions` | 변환 생성 |
| GET | `/api/conversions/{id}` | `/v1/conversions/{id}` | 상태 조회 |
| GET | `/api/conversions/{id}/audio` | `/v1/conversions/{id}/audio` | 결과 WAV |
| DELETE | `/api/conversions/{id}` | `/v1/conversions/{id}` | 취소 및 삭제 |

## 운영 경계

- 웹 앱은 현재 로컬 실행을 기준으로 하며 Sites에 프로덕션 배포하지 않는다.
- Modal 백엔드는 배포된 API를 사용한다.
- API 키는 `.env.local`과 Modal Secret `soulx-api-secret`에 같은 값으로 설정한다.
- 작업 파일은 24시간 TTL 정책으로 정리한다.
