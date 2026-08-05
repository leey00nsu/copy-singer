# data Feature 목록

이 폴더는 `data` 컴포넌트의 Feature 문서를 보관합니다.

- 새 Feature 생성: `npx lee-spec-kit feature <name> --component data`
- 워크플로우 문서 읽기: `npx lee-spec-kit docs get agents --json`

## 컴포넌트 범위

- `prisma/schema.prisma`: PostgreSQL 데이터 모델 SSOT
- `prisma/migrations/`: 버전 관리되는 schema 변경
- `prisma/seed.*`: 사용자 제공 곡 카탈로그 import
- `docker-compose.yml`: 로컬 PostgreSQL 실행 정의

DB 바이너리 데이터와 Secret은 Git에 포함하지 않습니다.
