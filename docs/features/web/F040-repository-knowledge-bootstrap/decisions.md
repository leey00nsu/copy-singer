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
  - **Commit**: `feat(F040): OpenWiki 설정과 온보딩 진입점 정리` (`f11361d`) checkpoint에서 확정했다.
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
  - **Commit**: `feat(F040): OpenWiki 설정과 온보딩 진입점 정리` (`f11361d`) checkpoint에서 확정했다.
  - **PR**: - (local workflow)
  - **Test/Log**: `knowledge audit` 및 onboarding 문서 정적 검토 결과를 완료 시 기록한다.
- **Consequences**: Feature마다 Curated Documentation Impact는 계속 필요하며 OpenWiki 동기화가 사람 관리 문서의 갱신 책임을 대체하지 않는다.

---

## D003: Feature review round 1의 생성 오류를 source guidance에서 교정한다 (2026-09-04)

- **Context**: 최초 F040 Knowledge는 audit과 receipt 검증을 통과했지만 독립 Feature review에서 코드 근거와 어긋나는 설명 두 건이 발견됐다.
- **Decision**: generated OpenWiki를 직접 편집하지 않는다. worker lease eligibility와 recommendation 진입 경로를 사람이 관리하는 onboarding guidance에 명확히 기록한 뒤 `knowledge sync`로 전체 파생 Knowledge와 receipt를 다시 생성한다.
- **Review findings**:
  - **P1**: `openwiki/architecture/system-map.md`가 worker가 "만료되지 않은 작업"을 claim한다고 설명해, 실제 `PENDING` 또는 lease가 없거나 만료된 processing job만 claim하는 동시성 조건을 반대로 안내했다.
  - **P2**: `openwiki/quickstart.md`가 존재하지 않는 `/recommendations` 경로를 안내했다. 실제 route는 `/recommendations/[id]`이며 제품 흐름은 프로필에서 해당 경로로 진입한다.
  - **P3**: D001·D002의 checkpoint subject를 `chore(F040)`으로 잘못 기록했으나 실제 커밋 `f11361d`는 `feat(F040)`이다.
- **Review evidence**:
  - **Reviewer**: `/root/f040_feature_review_r1` (`feature_reviewer`, inherited model, reasoning effort `high`)
  - **Round**: 1 / max remediation rounds 1
  - **Target**: `eb164d718d66b2ce3e177fc03727ae60ec0add3d..7124a1f0231522362bbac03b3bc099d63eb1fd0b`
  - **Tree**: `50ad54d3d6c789a50bb6e03cba65a99edaf2f876`
  - **Decision**: `changes_requested`
  - **Positive evidence**: 131개 claim evidence 참조가 tracked file과 유효 line range를 가리켰고, receipt는 F040/web, source `f11361d`, base `eb164d7`, OpenWiki `0.5.0`, OKF `0.2`와 검증된 fingerprint·output hash를 기록했다.
- **Remediation outcome**:
  - curated source `README.md`에 worker claim 대상이 `PENDING` 또는 lease 없음/만료 상태이고 유효 lease는 제외된다는 불변식을 추가했다.
  - 실제 추천 화면이 `/recommendations/[id]`이며 `/recommendations` 단독 화면은 없다는 진입 경로를 추가했다.
  - `knowledge sync`가 `system-map.md`와 `quickstart.md`를 재생성했고 두 설명이 source와 일치함을 정적 대조했다.
  - 최신 receipt는 source `944780e7a376fcae602e2ea401c523b14e5b0630`, fingerprint `sha256:fe4c8ce3f84406383b86788d6d69a1119065f0ec7ae323a2b48e376abbcedf0b`, output `sha256:95b6177e1824addfa88f2dd4d37cabb5cc664ce36030eda217892c0e587e8d8a`를 기록하며 `OPENWIKI_VERIFIED`를 통과했다.
- **Residual risks**:
  - 설정된 최대 remediation round가 1이므로 수정 후 target `98a1f88360375134fa44ee66f956a83446a56ff4` / tree `b5232ec9c6aaa0ab8872d40ef6352bc2ee9153c3`는 별도 독립 재리뷰를 받지 않았다.
  - 세 finding은 모두 직접 검증해 해결했지만, 자동 생성 문서의 의미 정확성은 향후 sync에서도 claim audit만으로 완전히 보장되지 않으므로 중요한 concurrency·route 설명은 tracked source와 계속 대조해야 한다.
- **Consequences**: audit 통과는 생성물 무결성과 provenance를 보장하지만 설명의 의미 정확성을 완전히 보장하지 않는다. 중요한 concurrency·route 사실은 curated guidance와 독립 리뷰로 보완한다.

---

## D004: 최초 도입 Feature에서 현재 curated 문서 기준선을 함께 복구한다 (2026-09-04)

- **Context**: 구현 승인 전 결과 분석에서 `system-architecture.md`의 `components/`·`lib/` 경로, web component README의 legacy 탐색 지도, constitution의 lee-spec-kit `0.8.8` 표기가 확인됐다. lee-spec-kit Schema 2 지침도 기존 프로젝트는 Feature별 영향 판정을 신뢰하기 전에 한 번의 수동 baseline reconciliation을 요구한다.
- **Options**: F040을 그대로 승인하고 후속 Feature로 모두 이관, 과거 F001~F039를 소급 수정, F040에 확인된 현재 기준선 복구만 추가하는 방식을 비교했다.
- **Decision**: 사용자의 구현 변경 요청에 따라 F040에 curated baseline 태스크를 추가한다. 현재 사실과 직접 충돌하는 architecture·onboarding·agent policy를 갱신하고 WHY 탐색 경로를 연결하되, 과거 Feature 메타데이터와 제품 의도·사용자 정책은 자동 변경하지 않는다.
- **Rationale**: OpenWiki를 파생 evidence로 제한하면서 curated docs를 SSOT라고 선언하려면 도입 시점의 알려진 모순을 그대로 둘 수 없다. 반면 PRD와 custom policy는 코드보다 상위 의도를 담으므로 별도 판단 없이 코드에 맞춰 재작성해서도 안 된다.
- **Evidence**:
  - `docs/prd/system-architecture.md`: 현재 존재하지 않는 `components/`, `lib/auth/`, `lib/mixing/`, `lib/vocal-profile/analysis-*` 경로가 남아 있다.
  - `docs/features/web/README.md`: component 범위를 `components/` 중심으로 안내해 현재 FSD 구조와 다르다.
  - `docs/agents/constitution.md`: lee-spec-kit을 `0.8.8`로 고정하지만 현재 CLI는 `0.9.11`이다.
- **Consequences**: F040의 spec·plan·tasks와 Feature review target을 다시 열고, curated 문서 변경 후 OpenWiki를 재동기화한다. 기존 F001~F039의 이력은 보존한다.
