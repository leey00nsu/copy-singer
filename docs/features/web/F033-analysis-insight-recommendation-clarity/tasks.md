# Tasks: analysis-insight-recommendation-clarity

## 태스크 규칙

- **상태**: `[TODO]` → `[DOING]` → `[DONE]`
- `[TODO] → [DOING]`: 시작 전 태스크 제목을 공유하고 상태를 갱신합니다.
- `[DOING] → [DONE]`: Acceptance와 Checklist를 실제 검증 후 함께 완료합니다.
- 한 번에 하나의 태스크만 진행합니다.
- 문서화된 review checkpoint와 원격/파괴적 작업 외에는 별도 승인 단계를 추가하지 않습니다.

---

## 로컬 추적 정보

- **문서 상태**: Approved
- **레포**: copy-singer-web
- **브랜치**: `feat/analysis-insight-recommendation-clarity`
- **대기 중 변경 요청**: -
- **스펙 승인**: 2026-08-15 사용자 응답 `자동 진행`을 workflow 승인 옵션 `A`로 기록
- **구현 승인**: -
- **로컬 머지 승인**: -
- **PR 전 리뷰**: Pending
- **PR 전 리뷰 Evidence**: -
- **PR 전 리뷰 Decision**: -
- **PR 리뷰**: -
- **PR 리뷰 Evidence**: -
- **PR 리뷰 Decision**: -

---

## 태스크 목록

- [DONE][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-01 보컬 분석 용어·음이름·요약 정리
  - Date: 2026-08-15
  - Acceptance:
    - 사용자-facing `실용 음역/중앙음/유성 비율`이 각각 `주요 음역/중심 음/유효 음성 구간`으로 일관되게 바뀐다.
    - 카드·요약·tooltip은 `레4(D4)` 같은 한국어 계이름+국제 음이름을 사용하고 raw MIDI decimal을 노출하지 않는다.
    - 성공 분석의 핵심 정보에서 pitch stability, clipping, RMS, sample rate를 제거하되 내부 analyzer/DB 계약은 유지한다.
    - 요약 문장은 주요 음역과 중심 음, 음역 폭만 설명하고 성별·성종·장르를 추정하지 않는다.
  - Checklist:
    - [x] 사용자-facing 음이름 helper와 테스트를 추가했다.
    - [x] `presentVocalProfile()`의 label/summary/traits를 관찰 기반 의미로 수정했다.
    - [x] summary/results/range chart/histogram/pitch trace copy와 tooltip을 새 용어로 동기화했다.
    - [x] `유효 음성 구간`과 녹음 길이만 남긴 간결한 녹음 정보 surface와 분석 용어 각주를 구현했다.
    - [x] presentation/UI/contract targeted tests와 Storybook 7/7, TypeScript를 통과했다.
  - Evidence: `7d40e98` (`feat(F033): 보컬 분석 용어·음이름·요약 정리`)

- [DONE][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-02 보컬 프로필 목록·곡 비교 UI 단순화
  - Date: 2026-08-15
  - Acceptance:
    - 보컬 프로필 Library에서 안정도 컬럼이 제거되고 pending/failed row도 동일한 5열 구조를 사용한다.
    - 프로필 목록의 음역은 새 `주요 음역` 표기 정책을 따른다.
    - 곡 상세에서 내 주요 음역과 곡 주요 음역을 같은 음이름 규칙으로 비교할 수 있다.
    - 관리자 catalog 운영용 분석 정보는 변경하지 않는다.
  - Checklist:
    - [x] Library grid/header/row/job placeholder에서 안정도 컬럼을 제거했다.
    - [x] 목록의 모바일/sr-only label과 Storybook/test를 5열 구조에 맞췄다.
    - [x] 곡 상세에 사용자/곡 주요 음역 비교 정보를 추가했다.
    - [x] Library/song-detail UI tests 9/9, Storybook 8/8, TypeScript를 통과했다.

- [TODO][PRD-FR-008][PRD-FR-010][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-03 key-fit scoring v3로 신뢰도 가산 분리
  - Date: 2026-08-15
  - Acceptance:
    - candidate 적합도는 symmetric 주요 음역 overlap, 주요 음역 초과 부담, 관측 극단음 초과 부담만으로 0–100점을 구성한다.
    - profile confidence는 candidate score에 직접 가산되지 않고 low-confidence 안내에만 유지된다.
    - scoring version은 `key-fit-v3`로 분리된다.
    - `-6..+6` 정수 키 탐색, tie-break, 결정성과 100곡 CPU 목표를 유지한다.
  - Checklist:
    - [ ] score weight를 overlap 58 / tessitura fit 26 / extreme fit 16으로 변경한다.
    - [ ] confidence contribution을 score breakdown에서 제거하거나 호환 가능한 비가산 형태로 정리한다.
    - [ ] `calculateProfileConfidence()`와 low-confidence reason은 유지한다.
    - [ ] key-fit fixture/edge case/성능 테스트를 v3 의미에 맞게 갱신한다.

- [TODO][PRD-FR-011][PRD-FR-012][PRD-FR-049][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-04 추천 점수·순위·정렬 기준 통일
  - Date: 2026-08-15
  - Acceptance:
    - 서버 ranking에 사용하는 `selectionScore`가 사용자-facing `추천 점수`의 단일 source-of-truth가 된다.
    - 목록 기본 순서와 `rank`가 추천 점수 내림차순과 일치한다.
    - 대표 추천 점수는 `%`가 아닌 `점` 단위로 표시한다.
    - 새 정렬 UI는 `추천 점수 높은 순 / 원키 적합도 높은 순 / 곡명 가나다순`만 제공한다.
    - legacy `sort=rank`, `sort=adjusted-score` URL은 canonical 추천 점수 정렬로 안전하게 호환된다.
  - Checklist:
    - [ ] recommendation score presentation helper를 `selectionScore` 기준으로 변경한다.
    - [ ] 목록·선택 panel·곡 상세의 대표 점수와 카피를 `추천 점수`로 통일한다.
    - [ ] sort schema/parser/serializer/projector를 canonical recommendation-score 기준으로 갱신한다.
    - [ ] 추천 이유의 `편안한/실용 음역` 표현을 관찰 기반 용어로 바꾼다.
    - [ ] ranking/presentation/UI/legacy URL 테스트를 갱신하고 통과한다.

- [TODO][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-05 제품 카피·전체 회귀·문서 Evidence 동기화
  - Date: 2026-08-15
  - Acceptance:
    - 사용자-facing 제품 전반에서 오래된 `실용 음역`, `중앙음`, 대표 `추천 적합도` 용어가 의도치 않게 남지 않는다.
    - analyzer/Prisma/snapshot/mixing/ticket/owner scope 계약은 변경되지 않는다.
    - lint/typecheck/build/전체 테스트와 Storybook이 통과한다.
    - 최종 구현 수치와 테스트 Evidence가 plan/decisions/tasks에 동기화된다.
  - Checklist:
    - [ ] landing/creation funnel/fixture/story copy의 사용자-facing 용어를 audit한다.
    - [ ] analyzer/DB raw metric 삭제가 없는지 diff/contract로 확인한다.
    - [ ] targeted vocal/recommendation 테스트를 실행한다.
    - [ ] `pnpm run lint`, `pnpm exec tsc --noEmit`, `pnpm test`를 통과한다.
    - [ ] decisions/tasks의 Evidence와 workflow-sync marker를 최신 코드 이후 시각으로 갱신한다.

---

## 완료 조건

- [ ] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [ ] 테스트 실행 및 통과 기록 완료
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:vocal-profile-presentation` | `-` | `-` |
| `pnpm run test:key-fit` | `-` | `-` |
| `pnpm run test:recommendation` | `-` | `-` |
| targeted Storybook | `-` | `-` |
| `pnpm run lint` | `-` | `-` |
| `pnpm exec tsc --noEmit` | `-` | `-` |
| `pnpm test` | `-` | `-` |

<!-- lee-spec-kit:workflow-sync 2026-08-15T11:06:23.000Z -->
