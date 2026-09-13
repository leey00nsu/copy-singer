# 브라우저 E2E

실제 Chromium → Next production server → 인증/제품 API → PostgreSQL → worker → 로컬 외부 서비스 fixture를 검증한다. 앱 API는 Playwright route로 응답을 대체하지 않는다. 브라우저 외부 origin 요청은 차단하며, 앱/worker의 외부 fetch도 localhost로 제한한다.

## 실행

macOS/Linux에서 Node 22 이상, 프로젝트 pnpm 버전, 실행 중인 Docker, ffmpeg, Chromium이 필요하다.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm run test:e2e
# 같은 테스트를 지정한 이전 revision에서 먼저 실행하고 현재 코드에서도 실행
pnpm run test:e2e:compare b333d64
```

runner가 임시 PostgreSQL 컨테이너·별도 DB·로컬 provider·별도 웹 포트를 만든다. 기존 DATABASE_URL과 provider 환경값을 테스트 값으로 덮어쓰고 개발 인증 bypass를 끈다. baseline은 git archive로 추출한 source snapshot에 동일한 seed 도구만 추가하며 앱 코드를 수정하지 않는다. baseline은 자신의 lockfile과 schema를 사용한다. 테스트 실패 시 baseline 비교를 중단하고 원인을 먼저 확인한다.

## 고정하는 사용자 계약

- 비로그인 라이브러리 접근은 로그인 화면으로 이동하고 보호 API는 401을 반환한다.
- 테스트용 서명 세션을 가진 사용자가 오디오 파일을 선택하고 확인창을 통해 분석한다. 실제 queue/worker 완료 후 프로필 화면으로 이동하고 분석 티켓은 1장 차감된다.
- 프로필 이름 변경과 새로고침 후 유지, 다른 사용자 조회/수정/삭제 거부를 확인한다.
- 추천 화면에서 믹싱을 접수하고 실제 worker/FFmpeg/파일 저장을 거쳐 완료 결과를 재생한다. Range 응답, 티켓 1장 차감, 기록 유지와 삭제 후 재조회 거부를 확인한다.
- 실제 로그아웃 후 보호 화면/API 접근이 차단된다.
- 분석 실패 후 티켓이 한 번 환불되고 새로운 업로드는 정상 성공한다.

외부 분석 결과와 오디오는 합성 fixture다. 같은 fixture 및 같은 assertion으로 baseline/candidate를 실행한다. UUID·시간·signed URL·처리 속도의 바이트 단위 일치를 요구하지 않는다. 두 실행의 모든 assertion이 통과했다는 것은 이 계약의 회귀가 관찰되지 않았다는 뜻이며, 전체 서비스의 100% 동등성을 증명하지 않는다.

로그인은 테스트 전 DB session과 서명 cookie를 넣는 방식이다. 실제 Google 동의 화면/콜백·신규 가입은 이 E2E의 검증 대상이 아니다. 인증 bypass 없이 session 검증과 로그아웃을 실행한다. 실제 Modal GPU·Leemage 장애, 여러 브라우저/기기, 네트워크 품질, 실제 부하는 검증하지 않는다. worker crash/race/timeout/idempotency는 기존 통합 테스트가 보완한다. 과부하 429/503 등 승인된 의도적 변경은 이전 코드와 같아야 하는 계약으로 고정하지 않는다.

## 결과와 CI

`artifacts/e2e/`에 baseline/candidate JSON report, 실행 로그, 실패 screenshot/trace와 비교 요약을 남긴다. 로컬 생성 fixture 세션만 포함하며 해당 디렉터리는 Git에서 제외한다. 실패 trace는 다음과 같이 확인한다.

```bash
pnpm exec playwright show-trace artifacts/e2e/candidate/test-results/TEST_DIRECTORY/trace.zip
```

GitHub Actions의 Browser E2E workflow가 PR마다 현재 코드의 suite를 실행한다. 최초 변경 전후 비교 이후에는 현재 suite를 지속 실행한다. 브랜치 보호의 required check 지정은 저장소 운영 설정에서 별도로 관리한다. 불안정한 테스트를 자동 retry로 숨기지 않으며 실패하면 로그/trace로 테스트 결함, 기존 앱 결함, 신규 회귀를 구분한다.
