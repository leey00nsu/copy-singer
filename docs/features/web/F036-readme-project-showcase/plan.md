# Implementation Plan: readme-project-showcase

> 스펙 승인 후 작성된 구현 계획입니다.

---

## 개요

- **기능 ID**: F036
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-16
- **상태**: Approved

---

## 기술 선택

| 구분 | 선택 | 이유 |
| --- | --- | --- |
| README 표현 | GitHub Markdown + 제한적인 정렬용 HTML | Leemage README와 같은 중앙 hero·이미지 구조를 GitHub에서 안정적으로 표현 |
| 이미지 저장 | `public/readme-captures/*.png` | 외부 URL과 만료 위험 없이 repository-relative 경로로 렌더링 |
| 환경 설정 문서 | `.env.example` inline comment | README와 설명을 중복하지 않고 실행 가능한 예시 바로 옆에 의미를 유지 |
| 검증 | Markdown link/path audit + env/source audit + `git diff --check` | 문서 전용 변경에서 실제 링크·asset·변수 계약을 직접 검증 |

---

## 구현 구조

README는 Leemage의 시각적 정보 구조를 참고하되 Copysinger의 실제 제품·운영 계약으로 다시 작성한다.

1. 브랜드 mark, 제품명, 한 줄 소개, 사실 기반 badge와 anchor navigation
2. 제공된 홈 화면과 보컬 분석 결과 화면
3. 목차와 Quick Start
4. 음성 분석·추천·AI 믹싱·라이브러리·관리자 운영의 주요 기능
5. 기술 스택과 시스템 구성
6. 로컬 실행, 배포, 프로젝트 구조, 테스트와 문제 해결

README에는 환경변수 이름별 설명을 두지 않는다. `.env.example`은 현재 runtime에서 사용하는 변수를 영역별로 묶고 각 항목의 용도, 선택 여부, 기본값과 key fallback을 주석으로 설명한다.

---

## 파일 구조

```text
README.md
.env.example
public/
└── readme-captures/
    ├── copysinger-home.png
    └── vocal-profile-result.png
docs/features/web/F036-readme-project-showcase/
├── spec.md
├── plan.md
├── tasks.md
└── decisions.md
```

---

## 구현 순서

1. 제공 PNG를 ASCII 영문 파일명으로 `public/readme-captures`에 복사하고 크기·형식을 확인한다.
2. README 상단과 본문을 제품 쇼케이스 중심으로 재구성한다.
3. `.env.example`의 변수별 설명을 보강하고 code env 사용처와 대조한다.
4. 내부 anchor, 상대 링크, asset 경로, script, legacy 용어와 Markdown 형식을 정적 검증한다.
5. Feature 문서와 workflow sync marker를 최종 결과에 맞춘다.

---

## 테스트 전략

- **문서 구조**: README heading/anchor와 상대 asset 경로를 스크립트로 검사한다.
- **이미지**: PNG 형식, 1 MiB 이하, 지정된 두 파일 존재를 확인한다.
- **환경변수**: `.env.example` key와 `src`, `scripts`, `prisma`의 runtime env 참조를 비교하고 legacy key가 없는지 확인한다.
- **명령 정확성**: README에 기록된 `pnpm` script가 `package.json`에 존재하는지 확인한다.
- **기본 품질**: `git diff --check`, Markdown source inspection, `pnpm run db:validate`를 실행한다.
- **비회귀 판단**: 애플리케이션 코드와 dependency가 바뀌지 않으므로 전체 production build와 UI 회귀는 생략한다.

---

## 위험과 완화

- GitHub anchor는 한글 제목과 기호에 따라 달라질 수 있으므로 단순한 제목을 사용하고 href를 정적으로 대조한다.
- 운영 설명을 압축하면서 중요한 절차가 사라질 수 있으므로 migration, worker, Modal, Leemage, catalog snapshot 경계는 유지한다.
- 환경변수 설명이 코드와 다시 어긋날 수 있으므로 fallback과 기본값은 `server-env.ts` 및 adapter 구현을 기준으로 작성한다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
- Reference: `https://github.com/leey00nsu/leemage`
