# Implementation Plan: recommendation-card-synthesis

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F006
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-06
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| 상태 저장 | Prisma 7 + PostgreSQL `RecommendationItem` synthesis fields | 추천 item을 idempotency 경계로 사용하고 새로고침 뒤에도 외부 job 상태를 복구 |
| 오디오 준비 | 기존 FastAPI analyzer + `yt-dlp` 임시 작업 디렉터리 | 사용자 reference 원본을 서버 간에 읽고 allowlist target을 요청 동안만 내려받은 뒤 정리 |
| 합성 실행 | 기존 Modal SoulX-Singer multipart API | 새 Modal 배포 없이 이미 배포된 create/status/audio/delete 계약 재사용 |
| orchestration | Next.js Route Handler + 서버 전용 service | Modal key, analyzer storage path와 원곡 URL 검증을 브라우저 밖에 유지 |
| UI | React client state + bounded polling + shadcn 카드 | 3개 item의 독립 상태와 부분 성공·실패·재시도를 카드 안에서 표현 |
| 검증 | Node test runner, Python pytest, Prisma, production build, 실제 Modal smoke test | 상태 machine·cleanup·UI와 실제 고정 preset 결과를 계층별 검증 |

---

## 아키텍처

```text
/recommendations/{runId}
  -> GET /api/recommendations/{runId}
  -> 각 NOT_STARTED item에 POST .../items/{itemId}/synthesis
     -> DB conditional update: NOT_STARTED|FAILED -> PREPARING
     -> USER profile -> Recording 관계와 만료/READY 상태 preflight
     -> analyzer GET recording source (server-to-server)
     -> analyzer POST temporary song target with stored catalog URL/video ID
        -> allowlist 검증 -> yt-dlp -> response 종료 cleanup
     -> fixed multipart preset으로 existing Modal POST /v1/conversions
     -> external job ID 저장, QUEUED
  -> GET /api/recommendations/{runId} bounded polling
     -> non-terminal item의 Modal status를 조정
     -> card: preparing/queued/processing/succeeded/failed
  -> GET .../items/{itemId}/audio
     -> 관계 검증 -> existing Modal audio proxy
```

RecommendationRun 생성 transaction과 외부 GPU 호출은 분리한다. 추천 생성은 먼저 DB에 정확히 3개 item을 확정하고, 결과 화면의 item별 start API가 conditional update로 소유권을 획득한 경우에만 target 준비와 Modal 제출을 수행한다. 같은 화면의 재실행·새로고침·동시 요청은 기존 상태/job ID를 반환한다.

오디오 원본은 PostgreSQL이나 프로젝트에 저장하지 않는다. 사용자 reference는 F002 analyzer storage의 기존 TTL 파일을 server-to-server로 읽고, target은 analyzer가 F003 catalog video ID를 다시 allowlist 검증한 뒤 임시 다운로드한다. target 응답 종료 후 임시 디렉터리를 제거하고 Next route는 결과 byte를 보존하지 않는다. 기존 Modal job volume에는 현재 API의 24시간 TTL 정책대로 입력·결과가 저장되며 성공·실패·삭제 경로에서 기존 delete endpoint로 정리한다.

자동 합성 preset은 서버 상수로 고정한다. `auto_pitch_shift=false`, `pitch_shift=0`이므로 추천 노래방 shift를 모델 입력에 사용하지 않고 target 원곡의 pitch contour를 따른다. `target_vocal_separation=true`, `auto_mix_accompaniment=true`로 결과에는 반주를 포함한다.

### 상태 machine

```text
NOT_STARTED -> PREPARING -> QUEUED -> PROCESSING -> SUCCEEDED
                    |          |           |
                    +----------+-----------+-> FAILED -> PREPARING (item retry)
SUCCEEDED -- expired/410 --> FAILED(expired, retryable)
```

- DB 변경은 상태가 뒤로 가지 않도록 허용 transition만 적용한다.
- `PREPARING` 획득은 conditional update로 한 요청만 성공시킨다.
- 실패 retry 전에 이전 job ID/error/timestamp를 JSON attempt history에 append한다.
- 한 카드 실패는 다른 카드의 polling과 재생을 막지 않는다.
- run 삭제는 non-terminal/terminal 외부 job을 best-effort가 아닌 확인 가능한 방식으로 삭제한 뒤 DB를 제거한다.

---

## 파일 구조

```text
prisma/
├── schema.prisma                                      # synthesis enum/metadata
└── migrations/*_recommendation_synthesis/migration.sql
services/vocal-profile-api/
├── app/main.py                                        # internal recording/temporary target endpoints
├── app/song_pipeline.py                               # allowlist download + guaranteed cleanup helper
└── tests/test_song_pipeline.py                        # URL 검증·cleanup·media response tests
lib/recommendation/
├── contract.ts                                        # item synthesis 공개 상태/오류 계약
├── synthesis.ts                                       # preflight, multipart, Modal reconciliation/cleanup
└── server.ts                                          # synthesis metadata serializer와 run delete 조정
app/api/recommendations/[id]/
├── route.ts                                           # 조회 시 상태 reconcile, run cleanup
└── items/[itemId]/synthesis/
    ├── route.ts                                       # idempotent start/retry
    └── audio/route.ts                                 # 성공 결과 audio proxy
app/
├── page.tsx                                           # Workbench 일반 진입 제거
└── dev/svc/page.tsx                                   # 기존 수동 Workbench 개발 경로
components/
└── recommendation-results.tsx                         # 자동 시작, polling, 카드 상태/player/retry
tests/
├── recommendation-synthesis.test.ts                   # preset, transition, idempotency 단위 테스트
├── recommendation-synthesis.integration.ts            # Prisma/API lifecycle 및 cleanup
└── recommendation-ui.test.tsx                         # 3개 카드 loading/result/failure 회귀
```

---

## 테스트 전략

- **단위 테스트**:
  - 고정 preset에 `auto_pitch_shift=false`, `pitch_shift=0`이 항상 적용됨
  - 상태 transition 전진성, stale preparing 복구, retry history, 외부 오류 정규화
  - 저장된 song metadata의 URL/video ID allowlist 검증과 임시 디렉터리 cleanup
- **통합 테스트**:
  - Prisma migration과 같은 item의 동시 start가 Modal create를 한 번만 호출하는 계약
  - reference 만료 시 target/Modal 미호출, target 준비 실패, Modal partial failure, 결과 만료와 retry
  - run 삭제 시 세 외부 job cleanup 후 cascade 삭제, cleanup 실패 시 DB 보존
- **UI/회귀 테스트**:
  - 정확히 3개 자동 시작, “믹싱 중이에요”, 보조 상태, 독립 retry, audio player/download
  - 점수·추천 이유·추천 노래방 키 유지, 일반 카드의 Workbench CTA 제거, `/dev/svc` 유지
  - `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run db:validate`, Python pytest, production build
- **실제 파이프라인 smoke test**:
  - 사용자가 지정한 `/Volumes/sn850x/ai/노래/vocal1.wav`로 profile/recommendation을 생성
  - 추천 target을 allowlist URL에서 임시 다운로드하고 고정 preset으로 현재 배포된 Modal API 호출
  - status를 terminal까지 polling하고 결과 WAV의 content type/비어 있지 않은 payload를 확인
  - 원본·중간 임시 파일 cleanup과 DB item job metadata를 확인하고 결과/소요 시간을 기록
  - Next.js 또는 Modal의 신규 배포는 수행하지 않으며 기존 배포 endpoint만 사용

---

## 운영·리스크

- 현재 Modal `max_containers=1`에서는 3개 job이 순차 처리될 수 있으므로 UI는 완료율이 아닌 item별 queue/processing 상태를 사실대로 보여준다.
- Next runtime이 multipart를 구성할 때 원곡 전체를 장기 저장하지 않는다. 응답 크기 상한과 timeout을 두고, 기존 manual route의 streaming 동작은 변경하지 않는다.
- analyzer의 recording media endpoint는 UUID와 DB 관계를 검증한 Next 서버만 호출하는 내부 계약으로 취급하며 공개 UI에 경로나 URL을 노출하지 않는다. 인증은 로컬 MVP 이후 배포 feature에서 추가한다.
- smoke test는 실제 Modal credit을 소비한다. 기능 확인에 필요한 최소 job부터 실행하고, 세 카드 lifecycle은 mock integration test로 먼저 검증한 후 실제 호출한다.
- 실제 Modal API가 새 계약을 필요로 하는 것으로 확인되면 코드를 임의 배포하지 않고 별도 승인 경계로 전환한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
