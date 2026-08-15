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
  - Evidence: `9ff7505` (`feat(F033): 보컬 프로필 목록·곡 비교 UI 단순화`)

- [DONE][PRD-FR-008][PRD-FR-010][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-03 key-fit scoring v3로 신뢰도 가산 분리
  - Date: 2026-08-15
  - Acceptance:
    - candidate 적합도는 symmetric 주요 음역 overlap, 주요 음역 초과 부담, 관측 극단음 초과 부담만으로 0–100점을 구성한다.
    - profile confidence는 candidate score에 직접 가산되지 않고 low-confidence 안내에만 유지된다.
    - scoring version은 `key-fit-v3`로 분리된다.
    - `-6..+6` 정수 키 탐색, tie-break, 결정성과 100곡 CPU 목표를 유지한다.
  - Checklist:
    - [x] score weight를 overlap 58 / tessitura fit 26 / extreme fit 16으로 변경했다.
    - [x] confidence contribution을 candidate score breakdown에서 제거하고 top-level diagnostic confidence는 유지했다.
    - [x] `calculateProfileConfidence()`와 low-confidence reason을 유지했다.
    - [x] key-fit 20/20, recommendation 30/30, query/contract 32/32와 TypeScript를 통과했다.
  - Evidence: `6d205db` (`feat(F033): key-fit scoring v3로 신뢰도 가산 분리`)

- [DONE][PRD-FR-011][PRD-FR-012][PRD-FR-049][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-04 추천 점수·순위·정렬 기준 통일
  - Date: 2026-08-15
  - Acceptance:
    - 서버 ranking에 사용하는 `selectionScore`가 사용자-facing `추천 점수`의 단일 source-of-truth가 된다.
    - 목록 기본 순서와 `rank`가 추천 점수 내림차순과 일치한다.
    - 대표 추천 점수는 `%`가 아닌 `점` 단위로 표시한다.
    - 새 정렬 UI는 `추천 점수 높은 순 / 원키 적합도 높은 순 / 곡명 가나다순`만 제공한다.
    - legacy `sort=rank`, `sort=adjusted-score` URL은 canonical 추천 점수 정렬로 안전하게 호환된다.
  - Checklist:
    - [x] recommendation score presentation helper를 `selectionScore` 기준으로 변경했다.
    - [x] 목록·선택 panel·곡 상세의 대표 점수와 카피를 `추천 점수`/`점`으로 통일했다.
    - [x] sort schema/parser/serializer/projector를 canonical `recommendation-score` 기준으로 갱신하고 legacy alias를 유지했다.
    - [x] 추천 이유의 `편안한/실용 음역` 표현을 이번 녹음의 주요 음역 기반 표현으로 바꿨다.
    - [x] recommendation 30/30, query/contract 32/32, targeted Storybook 12/12, TypeScript를 통과했다.
  - Evidence: `41c14d3` (`feat(F033): 추천 점수·순위·정렬 기준 통일`)

- [DONE][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-05 제품 카피·전체 회귀·문서 Evidence 동기화
  - Date: 2026-08-15
  - Acceptance:
    - 사용자-facing 제품 전반에서 오래된 `실용 음역`, `중앙음`, 대표 `추천 적합도` 용어가 의도치 않게 남지 않는다.
    - analyzer/Prisma/snapshot/mixing/ticket/owner scope 계약은 변경되지 않는다.
    - lint/typecheck/build/전체 테스트와 Storybook이 통과한다.
    - 최종 구현 수치와 테스트 Evidence가 plan/decisions/tasks에 동기화된다.
  - Checklist:
    - [x] landing/creation funnel/fixture/story copy의 사용자-facing 용어를 audit하고 오래된 성공 화면 용어를 제거했다.
    - [x] analyzer/DB raw metric이 analyzer contract와 persistence에 그대로 남아 있음을 source audit로 확인했다.
    - [x] vocal presentation 12/12, key-fit 20/20, recommendation 30/30과 관련 Storybook을 검증했다.
    - [x] 최신 코드에서 `pnpm run lint`, `pnpm exec tsc --noEmit`, `pnpm test`를 통과했다. Storybook은 163/163 PASS다.
    - [x] decisions/tasks의 Evidence와 workflow-sync marker를 최신 코드 이후 시각으로 갱신했다.
  - Evidence: `df28a4b` (`feat(F033): 제품 카피·전체 회귀·문서 Evidence 동기화`)

- [DONE][PRD-FR-021][PRD-FR-048][PRD-FR-065] T-F033-analysis-insight-recommendation-clarity-06 사용자 피드백 기반 분석 상세 정보 정리
  - Date: 2026-08-16
  - Acceptance:
    - 분석 용어 각주에서 더 이상 사용자-facing에 쓰지 않는 `MIDI` 설명을 제거한다.
    - 보컬 프로필 요약에서 `주요 음역 폭은 약 N반음/옥타브` 같은 음역 폭 문장을 제거한다.
    - 제출한 보컬 설명에서 `로그인한 본인만 들을 수 있어요.` 문구를 제거한다.
    - 추천 곡 상세의 `내 음역`에도 `곡 보컬 음역`과 동일하게 `중심 음`을 표시한다.
    - 추천 곡 상세의 `키 조정 변화` 정보는 제거한다.
  - Checklist:
    - [x] presentation helper와 분석 결과/상세 copy에서 MIDI 각주, 음역 폭 문장, 제출 오디오 소유권 문구를 제거했다.
    - [x] recommendation run user profile에 `medianMidi`를 전달하고 내 음역 중심 음을 렌더링했다. 기존 legacy payload 호환을 위해 response parser에서는 additive optional field로 수용한다.
    - [x] 곡 상세의 `키 조정 변화` 카드를 제거하고 원키/추천 키 적합도 2열 layout으로 정리했다.
    - [x] vocal presentation 12/12, recommendation 30/30, query 32/32, targeted Storybook 9/9, TypeScript와 전체 회귀를 통과시켰다.
    - [x] spec/plan/decisions/tasks Evidence를 최종 구현과 동기화했다.
  - Evidence: implementation commit pending; full `pnpm test` Storybook 163/163 PASS

---

## 완료 조건

- [x] 모든 태스크가 `[DONE]`이며 Acceptance/Checklist가 완료됨
- [x] 테스트 실행 및 통과 기록 완료
- [ ] 최종 결과를 공유했고, 필요한 사용자 확인을 문서화된 workflow checkpoint 기준으로 기록함

### 테스트 실행 기록

| 명령어 | 마지막 실행(로컬, YYYY-MM-DD) | 결과 |
| --- | --- | --- |
| `pnpm run test:vocal-profile-presentation` | `2026-08-16` | `PASS — 12/12` |
| `pnpm run test:key-fit` | `2026-08-16` | `PASS — 20/20, key-fit-v3 + confidence 비가산 검증` |
| `pnpm run test:recommendation` | `2026-08-16` | `PASS — 30/30` |
| `pnpm run test:query` | `2026-08-16` | `PASS — 32/32, legacy recommendation payload 호환 포함` |
| targeted Storybook | `2026-08-16` | `PASS — song detail + vocal profile 관련 9/9, 1 story file skip` |
| `pnpm run lint` | `2026-08-16` | `PASS` |
| `pnpm exec tsc --noEmit` | `2026-08-16` | `PASS` |
| `pnpm test` | `2026-08-16` | `PASS — build + unit/integration + FSD + Storybook 163/163` |

<!-- lee-spec-kit:workflow-sync 2026-08-15T15:04:46.000Z -->
