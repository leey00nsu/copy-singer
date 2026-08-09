# Designs

프로젝트에서 참고할 디자인 리소스를 모아두는 폴더입니다.

(예: Figma 링크, 참고 화면, 디자인 시스템 규칙, UI 가이드)

---

## 포함 대상

- 화면/플로우 참고 자료 (Figma, 이미지, 링크)
- 컴포넌트/패턴 가이드 (버튼, 폼, 네비게이션 등)
- 브랜드/타이포/컬러 토큰 등 UI 규칙

---

## 작성 규칙

- 외부 링크는 가능한 한 **원본 URL + 요약(또는 캡처)**를 함께 남깁니다.
- 파일명은 kebab-case 사용 (예: `auth-flow.md`, `design-system.md`)
- 이미지/첨부 파일이 필요하면 `assets/` 폴더를 생성하여 관리합니다.

---

## 참조 방법

Feature 문서에서 디자인을 참조할 때는 상대경로보다 **프로젝트 루트 기준 경로**를 권장합니다.

- 예: `docs/designs/auth-flow.md`

## 현재 문서

- [Copy Singer Design System](./design-system.md): 전 제품의 color, typography, spacing, component, 상태, responsive, 접근성과 변경 관리 규칙
- [Copy Singer Product UI Redesign](./product-ui-redesign.md): F018 디자인 보드 원본과 화면별 visual brief, 데이터 정직성 원칙
- [F018 Page Redesign Gap Analysis](./page-redesign-analysis.md): 현재 13개 route 캡처와 reference-conditioned V2 시안의 페이지별 차이·우선순위
- [Page Redesign Image Set](./generated/page-redesigns/README.md): 원본·현재·V1 폐기본·V2 채택본의 생성 방식과 파일 목록
