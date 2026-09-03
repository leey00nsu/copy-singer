# Decisions Log

## D001: 프로젝트 전역 Knowledge 도입을 독립 Feature로 추적한다 (2026-09-04)

- **Context**: OpenWiki 실험을 가장 최근 완료 Feature인 F039에 연결하면서 프로젝트 전역 설정과 생성 receipt가 VoiceOrb 수정 이력에 잘못 귀속됐다.
- **Constraints**: 두 오귀속 커밋은 원격에 push되지 않았고 생성된 Knowledge는 derived evidence이므로 재생성할 수 있다. 기존 F001~F039를 일괄 수정하지 않고 새 변경부터 Schema 2 계약을 적용해야 한다.
- **Options**: F039 커밋 제목만 변경, F039에 Schema 2를 소급 적용, 별도 F040으로 이력과 Knowledge provenance를 다시 구성하는 방식을 비교했다.
- **Decision**: 미푸시 F039 오귀속 커밋을 제거하고 `F040-repository-knowledge-bootstrap`이 설정, onboarding 문서와 최초 검증된 Knowledge를 소유한다.
- **Rationale**: 제목만 바꾸면 Feature 문서와 receipt의 F039 provenance가 남는다. 새 Feature는 변경 의도·task·검증·Knowledge commit을 같은 범위로 정렬하며 완료된 F039 이력을 보존한다.
- **Trace**:
  - **DOING 시작 시점**: `33ecc55`, `8cbdc3c`가 `origin/main`에 없음을 확인하고 main을 `eb164d7`로 복원했다. stale 생성물은 저장소 밖 `/tmp/copy-singer-openwiki-stale-20260904-084845`에 보관했다.
  - **DONE 전 확정 시점**: OpenWiki 설정과 onboarding 문서 변경은 F040 단일 태스크에 연결했다. F040 receipt와 Knowledge audit 결과는 Knowledge gate 완료 후 기록한다.
  - **머지 후 확인**: local integration 뒤 기록한다.
- **Evidence**:
  - **Commit**: `chore(F040): OpenWiki 설정과 온보딩 진입점 정리` checkpoint에서 확정한다.
  - **PR**: - (local workflow)
  - **Test/Log**: `git status` 기준 `main == origin/main` 복원 확인; F040 workflow 검증은 완료 시 기록한다.
- **Consequences**: OpenWiki 도입 이력은 F040에만 남고, F039는 VoiceOrb iOS WebGL 합성 수정 범위로 유지된다.

---

## D002: OpenWiki를 파생 onboarding evidence로 제한한다 (2026-09-04)

- **Context**: 자동 생성된 코드 탐색 문서는 신규 개발자에게 유용하지만 요구사항·정책·실행 사실의 정본으로 사용하면 stale 설명이나 생성 오류가 프로젝트 결정을 덮을 수 있다.
- **Constraints**: 신규 개발자는 빠른 탐색 지도가 필요하고, Feature 개발자는 변경이 영향을 주는 curated docs를 계속 판정해야 한다.
- **Options**: OpenWiki를 통합 문서 SSOT로 사용, 파일 트리만 자동 생성, 기존 SSOT를 유지하면서 OpenWiki를 파생 evidence로 사용한다.
- **Decision**: PRD, 활성 Feature SDD, curated docs와 tracked runtime facts의 권한을 유지하고 OpenWiki는 온보딩·코드 탐색 evidence로만 사용한다.
- **Rationale**: 생성 문서의 탐색 효율을 얻으면서도 제품 의도와 실행 가능한 사실의 소유권을 흐리지 않는다. 잘못된 Knowledge는 손으로 고치지 않고 source 또는 curated docs를 수정한 뒤 재생성한다.
- **Trace**:
  - **DOING 시작 시점**: README와 docs 가이드에 권한 및 검증 원칙을 추가하고 generated agent block은 lee-spec-kit에 맡긴다.
  - **DONE 전 확정 시점**: `README.md`와 `docs/README.md`가 OpenWiki를 파생 evidence로 제한하고 source 재검증 및 `knowledge sync` 전용 갱신 원칙을 안내하도록 맞췄다. 생성된 index·receipt·audit의 일치는 Knowledge gate에서 확인한다.
  - **머지 후 확인**: local integration 뒤 기록한다.
- **Evidence**:
  - **Commit**: `chore(F040): OpenWiki 설정과 온보딩 진입점 정리` checkpoint에서 확정한다.
  - **PR**: - (local workflow)
  - **Test/Log**: `knowledge audit` 및 onboarding 문서 정적 검토 결과를 완료 시 기록한다.
- **Consequences**: Feature마다 Curated Documentation Impact는 계속 필요하며 OpenWiki 동기화가 사람 관리 문서의 갱신 책임을 대체하지 않는다.
