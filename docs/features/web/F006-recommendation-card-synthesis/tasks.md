# Tasks: recommendation-card-synthesis

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- **태스크 공유 / 확인**:
  - `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 `tasks.md`에서 상태를 함께 갱신합니다.
  - `[DOING] → [DONE]`: 완료 전 결과/검증을 공유하고 같은 수정에서 `Acceptance`와 `Checklist`를 함께 갱신합니다.
  - 각 완료 태스크는 다음 태스크 시작 전 docs/project commit checkpoint를 통과합니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/recommendation-card-synthesis`
- **대기 중 변경 요청**: -
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -

---

## 태스크 목록

- [DONE][PRD-FR-017][PRD-DATA-007][PRD-NFR-008] T-F006-01 합성 상태와 idempotency 저장 계약 구현
  - Date: 2026-08-06
  - Acceptance:
    - RecommendationItem이 합성 상태, Modal job ID, 오류, 시각, 만료와 retry history를 저장하고 공개 응답으로 직렬화한다.
    - 동시 start 요청 중 하나만 `PREPARING` 소유권을 얻고 상태는 허용된 방향으로만 전이한다.
  - Checklist:
    - [x] Prisma enum/fields/migration과 client 생성
    - [x] synthesis contract/state transition helper 구현
    - [x] serializer 및 단위·DB 통합 테스트 추가
    - [x] Prisma validate, TypeScript와 관련 테스트 통과

- [DONE][PRD-FR-016][PRD-FR-018][PRD-FR-019][PRD-DATA-007] T-F006-02 임시 media와 Modal orchestration API 구현
  - Date: 2026-08-06
  - Acceptance:
    - USER recording과 allowlist catalog target만 서버 간에 준비하며 target 임시 파일은 모든 종료 경로에서 삭제한다.
    - item start/status/audio/retry/delete가 기존 Modal API를 사용하고 고정 preset의 `auto_pitch_shift=false`, `pitch_shift=0`을 보장한다.
    - reference preflight 실패 시 target 다운로드와 Modal job을 시작하지 않는다.
  - Checklist:
    - [x] analyzer recording source 및 temporary target endpoint와 cleanup 테스트
    - [x] Next server synthesis service와 fixed multipart preset 구현
    - [x] item start/status/audio route 및 run cleanup 구현
    - [x] idempotency·partial failure·expiry·cleanup 통합 테스트 통과

- [DONE][PRD-US-007][PRD-FR-017][PRD-FR-020] T-F006-03 추천 카드 자동 합성 UI와 개발 Workbench 분리
  - Date: 2026-08-06
  - Acceptance:
    - 추천 결과 진입 후 정확히 3개 카드가 자동 시작되고 카드별 “믹싱 중이에요”, 세부 상태, 실패 재시도, 성공 audio/download를 표시한다.
    - 점수·추천 이유·추천 노래방 키는 유지하고 일반 흐름의 Workbench CTA는 제거한다.
    - 기존 자유 입력 Workbench는 `/dev/svc`에 개발용 안내와 함께 유지된다.
  - Checklist:
    - [x] bounded polling과 item별 자동 start/retry state 구현
    - [x] 카드 loading/failed/succeeded player UI 구현
    - [x] `/dev/svc` 경로와 일반 진입 경로 정리
    - [x] UI/SSR 테스트, lint, TypeScript와 production build 통과

- [TODO][PRD-US-007][PRD-FR-016][PRD-NFR-002][PRD-NFR-003] T-F006-04 사용자 예시 보컬 실제 Modal 파이프라인 검증
  - Date: 2026-08-06
  - Acceptance:
    - `/Volumes/sn850x/ai/노래/vocal1.wav`로 로컬 profile/recommendation을 생성하고 추천 item이 현재 배포된 Modal에서 terminal 상태에 도달한다.
    - 결과 WAV가 재생 가능한 비어 있지 않은 audio 응답이며 원본·중간 임시 파일 cleanup과 DB metadata를 확인한다.
    - 신규 Next/Modal 배포 없이 실제 호출 결과, 소요 시간과 남은 제한을 문서화한다.
  - Checklist:
    - [ ] local PostgreSQL/analyzer preflight와 테스트 fixture 생성
    - [ ] 실제 recommendation-card synthesis 최소 1건 성공 확인
    - [ ] 세 카드 lifecycle은 실제 또는 mock 통합 검증으로 확인
    - [ ] 결과 audio·preset·cleanup·DB 상태 evidence 기록 및 테스트 데이터 정리

---

## 완료 조건

- [ ] 모든 태스크가 `[DONE]`이며, 각 태스크의 Acceptance 검증 및 Checklist 체크 완료
- [ ] 테스트 실행 및 통과
- [ ] 최종 결과를 공유했고 workflow checkpoint 결과를 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `npx prisma validate` | `2026-08-06` | `PASS — schema valid, migration applied to local PostgreSQL` |
| `npm run lint` | `2026-08-06` | `PASS — UI 포함 전체 lint` |
| `npx tsc --noEmit` | `2026-08-06` | `PASS` |
| `npm test` | `2026-08-06` | `PASS — build, SSR 3, catalog 7, key-fit 18, recommendation 15` |
| `python -m pytest services/vocal-profile-api/tests` | `2026-08-06` | `PASS — 18 tests` |
| `npm run test:recommendation:db` | `2026-08-06` | `PASS — 3 integration tests` |
| `vocal1.wav -> current Modal smoke test` | `-` | `-` |

<!-- lee-spec-kit:workflow-sync 2026-08-05T19:05:10.501Z -->
