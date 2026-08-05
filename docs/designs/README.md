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

- [시스템 아키텍처](system-architecture.md): Web, Next.js proxy, Modal API와 GPU worker의 책임 및 요청 흐름
- [보컬 프로필 오픈소스 선정](vocal-profile-open-source.md): MVP 분석기와 대안 비교
- [데이터 모델 초안](data-model.md): PostgreSQL/Prisma 엔터티와 보류 사항
- [구현 로드맵](implementation-roadmap.md): 단계별 구현 순서와 완료 기준
