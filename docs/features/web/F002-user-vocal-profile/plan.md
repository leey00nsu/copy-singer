# Implementation Plan: user-vocal-profile

> 스펙이 승인된 후 작성합니다.
> canonical docs surface 밖의 unmanaged docs 산출물(예: `docs/plans/*`, `docs/superpowers/*`)이 있더라도, 아키텍처/파일/테스트 내용은 이 파일로 흡수하고 최종 SSOT는 여기로 유지합니다.

---

## 개요

- **기능 ID**: F002
- **대상 레포**: copy-singer-web
- **작성일**: 2026-08-05
- **상태**: Approved
  - 값: Draft | Review | Approved

---

## 기술 스택

| 구분 | 선택 | 이유 |
| ---- | ---- | ---- |
| Analysis runtime | Python 3.12 slim container | librosa/ffmpeg wheel 호환과 로컬 CPU 격리 |
| Analysis API | FastAPI 0.141.1 + Uvicorn 0.52.1 | multipart streaming, 구조화된 validation error, healthcheck 제공 |
| Audio decoding | ffmpeg system package | WAV/MP3/M4A/WebM을 mono PCM으로 일관되게 변환 |
| Pitch analysis | librosa 0.11.0 `pyin` | 성숙한 ISC 라이선스 CPU F0 분석기이며 fixture 생성·검증이 용이 |
| Numeric/audio | NumPy 2.3.5 + SoundFile 0.14.0 | librosa/numba 호환 범위 안에서 집계 통계와 WAV fixture 입출력 |
| Web API | App Router route handlers | 브라우저에 analyzer/DB 주소를 노출하지 않고 기존 same-origin 패턴 유지 |
| Persistence | Prisma 7.9.1 + PostgreSQL 16 | F001 schema의 Recording/VocalProfile을 재사용 |
| Recording | MediaRecorder | 브라우저 기본 기능으로 수동 정지와 30초 자동 종료를 제공하고 별도 오디오 라이브러리를 줄임 |
| Capture prompt | 자유곡 한 소절, 10–30초 권장 | 별도 발성 훈련 없이 평소 노래 발성을 빠르게 수집 |
| UI | React 19 + shadcn 기반 기존 컴포넌트 | 현재 시각 체계와 접근성 패턴 유지 |

---

## 아키텍처

### 요청 흐름

```text
Browser /profile
  ├─ familiar song verse prompt
  ├─ MediaRecorder (manual stop / 30s auto stop) or local file
  └─ POST multipart /api/vocal-profiles
                   │ raw body stream + X-Recording-ID
                   ▼
          Local FastAPI analyzer :8001
          ├─ chunked size limit
          ├─ ffmpeg → mono 22,050 Hz WAV
          ├─ quality gates + librosa.pyin
          ├─ store source in ./work/vocal-profiles/{recordingId}
          └─ return aggregate metrics only
                   │
                   ▼
          Next route + Prisma transaction
          ├─ Recording(USER_TEST, READY)
          └─ VocalProfile(USER, librosa-pyin@0.11.0)
                   │
                   ▼
          JSON profile result → Browser
```

### 서비스 경계

- `services/vocal-profile-api`는 오디오 저장·디코딩·CPU 분석만 담당하고 PostgreSQL 자격 증명을 받지 않는다.
- Next route가 UUID를 생성해 analyzer에 전달하고, analyzer가 반환한 aggregate 결과를 검증한 뒤 Prisma transaction으로 저장한다.
- 브라우저는 `VOCAL_PROFILE_API_URL`이나 `DATABASE_URL`을 알지 못하며 same-origin `/api/vocal-profiles`만 호출한다.
- analyzer 실패 시 VocalProfile은 만들지 않고 임시/원본 파일을 제거한다. 실패 Recording row는 MVP에서 남기지 않아 불필요한 개인정보 흔적을 최소화한다.
- DB 저장 실패 시 Next route가 analyzer delete endpoint를 호출해 고아 파일을 정리한다.
- 삭제는 analyzer 파일 삭제 후 Prisma transaction으로 VocalProfile과 Recording을 제거한다.

### 업로드 스트리밍과 제한

- Next route는 `request.formData()`를 호출하지 않고 기존 conversion proxy처럼 원본 multipart boundary와 body stream을 analyzer로 전달한다.
- Next가 생성한 recording UUID는 `X-Recording-ID` header로 전달한다.
- analyzer는 `UploadFile`을 1 MiB chunk로 저장하며 누적 25 MiB를 넘으면 즉시 중단·삭제한다.
- 파일 확장자를 신뢰하지 않고 ffmpeg decode 성공 여부와 MIME allowlist를 함께 검사한다.
- 처리된 source는 Git ignored bind mount `./work/vocal-profiles`에 저장하고 `expiresAt=createdAt+24h`를 DB에 기록한다.

### 자유 가창 녹음

- 안내음, preset, count-in 없이 마이크 권한이 승인되면 즉시 녹음을 시작한다.
- UI는 애국가·생일축하 노래 등 익숙한 한 소절, 반주 없는 10–30초, 편안한 키를 안내한다.
- 사용자가 직접 멈추거나 30초에 자동 종료하며 5초 미만 입력은 quality gate가 구체적으로 안내한다.
- 브라우저는 audio만 제출하고 segment timestamp를 보내지 않아 `segmented=false` 전체 통계를 계산한다.
- 곡 선택이 결과 범위에 영향을 주므로 UI는 전체 음역 대신 “이번 소절 음역”과 “관찰된 중심 구간”으로 표시한다.

### 분석 알고리즘

1. ffmpeg로 mono 22,050 Hz PCM WAV를 생성한다.
2. duration 8–60초, RMS ≥ -45 dBFS, clipping ratio ≤ 1%를 확인한다.
3. `librosa.pyin`을 C2–C7, frame length 2048, hop length 256으로 실행한다.
4. voiced ratio가 25% 미만이면 `LOW_VOICED_RATIO`로 거절한다.
5. 전체 voiced frame에서 p02/p10/p50/p90/p98을 계산한다.
6. tessitura는 p10–p90, stability는 유효 frame의 국소 cents 변화량 median absolute deviation을 0–1로 변환한다.
7. 원시 F0/voiced frame은 저장하지 않고 frame count와 설정만 descriptors JSON에 저장한다.

### API 계약

| Method | Path | 역할 |
| --- | --- | --- |
| GET | `/api/vocal-profiles/health` | analyzer와 DB 연결 상태 확인 |
| POST | `/api/vocal-profiles` | raw multipart 전달, 분석 결과 저장 |
| GET | `/api/vocal-profiles/{id}` | Recording을 포함한 저장 profile 조회 |
| DELETE | `/api/vocal-profiles/{id}` | 저장 파일, profile, recording 삭제 |

- analyzer 오류는 `{ reasonCode, detail, retryable }` 형태와 400/413/415/422 status를 유지한다.
- Next 응답은 BigInt를 number로 정규화하고 DB 내부 경로 대신 사용자에게 필요한 metadata만 반환한다.

---

## 파일 구조

```text
.
├── app/
│   ├── profile/page.tsx
│   └── api/vocal-profiles/
│       ├── route.ts
│       ├── health/route.ts
│       └── [id]/route.ts
├── components/
│   └── vocal-profile-workbench.tsx
├── lib/vocal-profile/
│   ├── contract.ts
│   ├── pitch.ts
│   └── server.ts
├── services/vocal-profile-api/
│   ├── app/
│   │   ├── main.py
│   │   ├── analysis.py
│   │   ├── config.py
│   │   └── contracts.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── tests/
│   ├── vocal-profile-contract.test.ts
│   └── rendered-html.test.mjs
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 테스트 전략

- **Python 단위 테스트**: 고정음, sine sweep, 무음, clipping array로 quality gate와 통계 경계를 검증한다.
- **Analyzer API 테스트**: 생성 WAV upload, size/MIME/segment validation, health 및 delete endpoint를 FastAPI TestClient로 검증한다.
- **DB/API 통합 테스트**: 실제 Docker analyzer와 PostgreSQL에 profile 생성→조회→삭제 요청을 수행하고 DB/file 제거를 확인한다.
- **Web 단위 테스트**: MIDI note label 변환과 자유곡 안내 SSR을 Node test로 검증한다.
- **UI 검증**: `/profile`에서 자유곡 안내, 녹음·파일 선택, 분석 결과, 품질 오류 및 삭제 상태를 로컬 브라우저로 확인한다.
- **회귀 검증**: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`, `npm run db:validate`를 통과한다.

### 리스크와 대응

- 한 소절이 사용자의 전체 음역을 포함하지 않을 수 있으므로 결과를 관찰 범위로 명시하고, 후속 추천에서는 여러 녹음 또는 곡별 신뢰도 보정 가능성을 둔다.
- vinext Worker runtime에서 PostgreSQL TCP adapter 호환 문제가 발견되면 DB route만 Node 로컬 companion으로 분리하되 API 계약은 유지한다.
- 첫 Docker build는 librosa/scipy wheel 다운로드로 시간이 걸릴 수 있으나 실행은 CPU만 사용하며 Modal 비용은 발생하지 않는다.

---

## 관련 문서

- Spec: [spec.md](./spec.md)
- Decisions: [decisions.md](./decisions.md)
- Idea: [I002-user-vocal-profile.md](../../../ideas/I002-user-vocal-profile.md)
- PRD: [copy-singer-prd.md](../../../prd/copy-singer-prd.md)
