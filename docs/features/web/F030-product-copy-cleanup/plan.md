# Implementation Plan: product-copy-cleanup

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F030
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-14
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| UI | Next.js 16.3 / React 19 | 기존 화면 구조를 유지하고 문자열만 정리한다. |
| Styling/Components | 기존 Tailwind 및 공통 UI | 대규모 시각 리디자인은 하지 않고, 카피 가독성을 위한 제한적인 반응형 글자 크기·줄바꿈만 조정한다. |
| 검증 | 기존 `tsx --test` 테스트, ESLint, TypeScript | 문자열 변경에 따른 스냅샷/정규식 검증과 타입 회귀를 확인한다. |

---

## 아키텍처

새 추상화나 카피 관리 레이어를 만들지 않는다. 현재 컴포넌트와 presentation model에 인라인 또는 상수로 존재하는 사용자-facing 문자열을 실제 기능 계약과 대조해 직접 정리한다.

감사는 다음 순서로 수행한다.

1. 공개 화면과 인증 제품 화면의 제목, 설명, 상태, 오류, empty state, toast, CTA, badge, placeholder를 수집한다.
2. 각 문구를 `유지`, `축약/삭제`, `구현 정합성 수정`, `톤 수정`으로 분류한다.
3. 문장형 안내는 자연스러운 `~요` 존댓말로 통일한다. 버튼·메뉴·탭·badge·짧은 라벨은 기능에 맞는 간결한 명사형/행동형을 유지한다.
4. 제목을 다시 설명하는 문장, 내부 구현 세부, 사용자가 확인할 수 없는 정밀함, 추상적인 홍보/상투 표현을 제거한다.
5. 실제 상태·기능·제약과 어긋나는 문구는 코드 계약을 기준으로 수정한다. 카피를 맞추기 위해 기능 자체를 바꾸지 않는다.
6. 접근성 레이블, 법적 고지, 입력 전 필수 제약처럼 기능적 의미가 있는 텍스트는 보존한다.
7. 한글 헤드라인이 작은 화면에서 글자 단위로 잘리면 `break-keep`과 모바일 글자 크기를 우선 조정한다.
8. 카탈로그 개수처럼 런타임 값은 정적 문구에 숫자를 박지 않고, 필요한 결과 UI에서는 실제 데이터 길이를 사용한다.
9. 브랜드 표시는 별도 텍스트를 다시 만들지 않고 기존 `ProductBrand`/`ProductMark`를 재사용해 실제 로고 자산과 브랜드 타이포그래피를 일치시킨다.
10. 랜딩의 단계명은 `목소리 분석`, `노래 · 키 추천`, `AI 믹싱`으로 고정하고, 상세 문장은 결과지향적 사용자 표현을 사용한다.

### 카피 판단 기준

- 사용자가 지금 알아야 하는 정보인가?
- 이미 제목, 상태 badge, UI 구조가 같은 내용을 말하고 있지 않은가?
- 문구가 현재 구현에서 실제로 보장되는가?
- 내부 구현 방식보다 사용자의 상태와 다음 행동을 설명하고 있는가?
- 문장형이면 기존 제품의 자연스러운 `~요` 톤인가?
- 다른 제품에도 그대로 붙일 수 있는 추상적·과장적 문구가 아닌가?

---

## 파일 구조

주요 감사 및 수정 대상은 아래 영역이다. 실제 감사 결과에 따라 문자열이 없는 파일은 변경하지 않는다.

```text
app/
├── (public)/                 # 랜딩, 로그인, 약관/개인정보 문구
└── (product)/                # 제품 페이지 제목, 상태/오류/empty 문구

src/
├── widgets/
│   ├── product-shell/        # header/mobile nav/footer 및 공용 ProductBrand/Mark
│   ├── library/              # 프로필/믹싱 목록 상태와 empty copy
│   └── creation-funnel/      # 분석·추천·믹싱 단계 설명
├── entities/
│   ├── vocal-profile/        # 결과 설명, 시각화/레퍼런스 안내
│   ├── mixing-job/           # 작업 단계/상태 설명
│   ├── recommendation/       # 추천/영상 안내
│   └── ticket/               # 티켓 원장 empty copy
├── features/
│   ├── authentication/       # 로그인/로그아웃 상태
│   ├── create-mixing/        # 믹싱 접수/실패 toast와 disabled 안내
│   ├── manage-notifications/ # 알림 상태 문구
│   └── manage-song-catalog/  # 명백한 구현 불일치가 있을 때만 관리자 카피 수정
└── shared/ui/                # 공통 상태·오디오 안내 중 제품에 노출되는 문구

tests/                        # 문자열을 직접 검증하는 테스트만 새 카피에 맞춰 갱신
```

Storybook fixture, 테스트 fixture, 서버 내부 error payload는 실제 제품 카피와 공유되는 경우에만 변경한다.

---

## 우선 감사 후보

초기 문자열 스캔에서 다음 유형이 우선 후보로 확인됐다.

- `product-shell`: 모바일 메뉴 설명과 footer의 추상적 슬로건처럼 UI 자체가 이미 전달하는 내용을 반복하는 문구
- `vocal-profile-results`: `최대 720포인트`, reference 생성 방식 등 사용자 행동과 무관한 구현 세부
- `reference-band-players`: `기본 10초 목표, 부족분 재분배 가능` 같은 분석 내부 규칙 노출
- `vocal-profile-library`, `mixing-library`: 상태 제목과 detail이 같은 사실을 반복하거나 `안전하게 저장`, `자동 재시도 대기`처럼 내부 처리를 과설명하는 문구
- 로그인/알림/관리 화면 일부의 `~습니다`/`~해주세요` 혼용 및 기술 용어 노출

이 목록은 수정 확정 목록이 아니라 감사 우선순위다. 실제 구현 계약과 화면 맥락을 확인한 뒤 변경 여부를 결정한다.

---

## 테스트 전략

- **정적 감사**: 변경 후 제품 TSX/TS 문자열을 다시 검색해 문장형 `~습니다`, `~합니다`, 내부 구현 세부 및 과도한 장문이 남았는지 확인한다. 법적 문서·접근성 설명·관리자 전문 문구는 맥락상 예외가 될 수 있다.
- **단위/통합 테스트**: 변경 문자열을 직접 검증하는 기존 테스트를 갱신하고 관련 묶음을 실행한다.
  - `pnpm run test:auth-navigation`
  - `pnpm run test:vocal-profile-presentation`
  - `pnpm run test:mixing:ui`
  - `pnpm run test:recommendation`
  - 관리자 문자열을 수정한 경우 `pnpm run test:admin`
- **정적 검증**:
  - `pnpm run lint`
  - `pnpm exec tsc --noEmit`
- **최종 통합 검증**: workflow의 post-merge checks에 따라 `pnpm test`, `pnpm run lint`, `pnpm exec tsc --noEmit`을 수행한다.

UI 구조를 바꾸지 않는 카피 중심 Feature이므로 별도 시각 리디자인이나 신규 E2E 플로우는 추가하지 않는다. 구현 승인 피드백으로 요청된 헤드라인 가독성 보완은 기존 Tailwind utility 범위의 반응형 글자 크기·줄바꿈 조정으로 제한한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
- PRD: `docs/prd/copy-singer-prd.md` (`PRD-FR-062`)
