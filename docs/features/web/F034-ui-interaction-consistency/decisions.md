# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

> ADR(Architecture Decision Record)은 구현 중 내린 중요한 기술/구조 결정을 남기는 기록입니다.
> 나중에 "왜 이렇게 만들었는지"를 추적하고, 팀 합의를 재확인하기 위해 작성합니다.

> 형식: `DNNN: ui-interaction-consistency 결정 (2026-08-16)`
> 결정 ID는 Feature별로 독립된 번호를 사용하며 Feature ID와 관계없이 `D001`부터 시작합니다.

기록 원칙:

- 새 ADR 생성에는 `npx lee-spec-kit decision add <feature-ref> --title "..." --context "..." --decision "..." --rationale "..." --evidence "..."` 사용을 우선하세요.
- 모든 ADR은 **Decision(무엇을 선택했는가)** + **Trace(어떻게 고민했고 무엇을 확인했는가)** 를 함께 남깁니다.
- 작성 타이밍을 고정합니다.
  - 태스크 시작(`[TODO] -> [DOING]`): `Context/Constraints`와 `Trace(초기 가설)`를 1~3줄로 먼저 기록
  - 태스크 완료 직전(`[DOING] -> [DONE]`): `Options/Decision/Rationale`를 최종화하고 `Trace`를 보강
  - PR 머지 후: 실제 결과/영향을 `Trace(머지 후 확인)`에 1~2줄 추가
- 모든 ADR에는 최소 1개 이상의 **Evidence 링크**(커밋/PR/테스트 로그 중 하나 이상)를 남깁니다.
- 디자인 시스템 변경이나 예외를 기록할 때는 영향 받는 규칙과 범위, 예외 이유, 제거 조건, 실행 가능한 정본의 동기화 영향을 함께 남깁니다.

---

## D001: 녹음 파일의 실제 계약과 사용자 presentation을 분리 (2026-08-16)

- **Context**: 마이크 녹음도 내부 업로드를 위해 `File` 객체와 확장자가 필요하지만 준비 카드에 자동 생성 파일명이 노출되어 사용자가 관리해야 할 정보처럼 보인다. 직접 업로드한 파일명은 선택 확인에 유용하다.
- **Constraints**: prepare/upload pipeline의 `File`, MIME, extension과 idempotency 계약은 유지하고 녹음·업로드 양쪽의 크기·길이·waveform 정보도 보존해야 한다.
- **Options**: 모든 파일명 유지, 모든 파일명 숨김, 입력 출처를 추적해 자동 녹음만 숨기는 방식을 비교한다.
- **Decision**: 입력 출처를 presentation state로 명시하고 자동 녹음만 파일명을 숨긴다. 직접 업로드는 원래 이름을 유지한다. 두 idle input action은 같은 full-width rail을 사용하되 primary/secondary variant 차이를 유지한다.
- **Rationale**: 분석 계약을 건드리지 않으면서 사용자가 만든 선택 정보와 내부 구현 세부를 구분할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: `VocalProfileWorkbench`가 녹음·업로드를 모두 `prepareSelectedAudio(file)`로 합치고 `VoiceScanInput`이 항상 `audioFile.name`을 표시하는 현재 흐름을 확인했다.
  - **DONE 전 확정 시점**: `audioSource`를 녹음·업로드 준비 성공 시점에 설정하고 reset에서 해제했다. 자동 녹음 준비 카드는 내부 이름 없이 크기·길이를 표시하고 업로드 카드는 기존 파일명을 유지한다. recorder button과 upload label은 같은 responsive horizontal rail과 width를 사용한다.
  - **머지 후 확인**: Pending
- **Evidence**:
  - **Commit**: `12f2fe7` (`feat(F034): 녹음 입력 정보와 버튼 폭 정리`)
  - **PR**: -
  - **Test/Log**: Voice Scan Storybook 12/12 PASS; `pnpm exec tsc --noEmit` PASS
- **Consequences**: 화면 state가 하나 추가되지만 서버·파일 업로드·분석 데이터에는 변경이 없다.

## D002: 추천 행의 기존 stretched button을 영상 trigger로 확장 (2026-08-16)

- **Context**: 추천 목록은 작은 YouTube facade만 영상을 펼치고, 제목의 `ResourceRowButton`이 만든 stretched click area는 곡 선택만 수행한다.
- **Constraints**: 행에는 YouTube facade와 AI 믹싱이라는 독립 button이 있어 interactive `tr`, 중첩 button 또는 무차별 row click handler를 만들 수 없다. iframe은 사용자 실행 전 생성하지 않고 최대 하나만 유지해야 한다.
- **Options**: row `onClick` 추가, facade 크기만 확대, 기존 stretched button에 selection + toggle을 결합하는 방식을 비교한다.
- **Decision**: 기존 `ResourceRowButton`을 행의 주 action으로 유지하며 click/keyboard 실행 시 곡 선택과 영상 toggle을 함께 수행한다. 독립 control은 현재 z-index interaction layer를 유지한다.
- **Rationale**: 현재 접근 가능한 button과 focus model을 재사용하면서 행 대부분의 click target을 넓힐 수 있다.
- **Trace**:
  - **DOING 시작 시점**: `ResourceRowButton`의 pseudo-element가 행 전체를 덮고 facade와 mixing cell은 `z-20`으로 독립된 현재 구조를 확인했다.
  - **DONE 전 확정 시점**: 행의 stretched button이 selection 후 valid video ID가 있을 때만 단일 toggle helper를 실행하도록 확정했다. button은 `aria-expanded`/`aria-controls`를 제공하고 facade와 mixing control은 독립 layer를 유지한다. mouse·Enter·닫기·교체 회귀에서 iframe은 최대 하나였다.
  - **머지 후 확인**: Pending
- **Evidence**:
  - **Commit**: `69cc4eb` (`feat(F034): 추천 행 영상 미리보기 토글`)
  - **PR**: -
  - **Test/Log**: recommendation Storybook 10/10 PASS; `pnpm exec tsc --noEmit` PASS
- **Consequences**: 제목/행의 주 action 의미가 단순 선택에서 선택 + 영상 펼침으로 바뀌며 `aria-expanded`로 상태를 노출한다.

## D003: Header Bell과 전체 알림 이력의 조회 계약을 분리 (2026-08-16)

- **Context**: Bell은 읽지 않은 수 badge를 표시하지만 목록 query는 읽은 항목을 포함한 최신 5개를 반환해 badge와 목록의 의미가 다르다. 전체 알림 페이지는 과거 기록을 다시 확인하는 이력 surface다.
- **Constraints**: 개별/모두 읽음 mutation, 30초 polling, pagination과 기존 전체 이력 URL을 유지해야 하며 cache key 충돌이 없어야 한다.
- **Options**: client에서 최신 5개를 filter, Bell 전용 endpoint 추가, 공통 list query에 명시적 unread filter를 추가하는 방식을 비교한다.
- **Decision**: 공통 notification filter에 기본값 false인 `unreadOnly`를 추가하고 Bell만 true를 사용한다. 서버가 filter된 pagination/count를 계산하며 전체 페이지는 false 기본값을 유지한다.
- **Rationale**: 서버 pagination 이전에 정확히 필터링되고 하나의 API 계약을 재사용하며 TanStack Query key도 조회 의미를 포함할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: Bell이 `{ page: 1, pageSize: 5 }`만 요청하고 service가 `{ userId }` 전체를 pagination한 뒤 별도 unread count를 계산하는 현재 계약을 확인했다.
  - **DONE 전 확정 시점**: `unreadOnly`를 Zod filter, URL, query key와 Prisma where에 포함했다. true일 때 total/pageCount는 필터된 unread 집합 기준이고 unreadCount와 일치하며, 전체 페이지는 URL 값과 무관하게 false를 강제한다. read-all 후 invalidation으로 Bell empty state가 갱신됨을 확인했다.
  - **머지 후 확인**: Pending
- **Evidence**:
  - **Commit**: Pending
  - **PR**: -
  - **Test/Log**: `test:query` 32/32 PASS; notification Storybook 4/4 PASS; notification DB integration 1/1 PASS; `pnpm exec tsc --noEmit` PASS
- **Consequences**: query key와 URL에 unread filter가 추가되지만 기본값 false라 기존 전체 이력 호출은 호환된다.
