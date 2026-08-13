# Modal Vocal Profile Analyzer

F010의 사용자 보컬 프로필용 CPU-only Modal Web Function입니다.

## 역할

- `services/vocal-profile-api/app`의 공유 분석 코어를 그대로 사용합니다.
- 최대 60초 사용자 source의 프로필 통계는 그대로 분석하고, 무음·저품질을 제외한 중음 phrase만 이어 붙인 최대 30초(더 짧아도 정상) `smart-reference-mid-v1` synthesis reference를 생성합니다.
- 사용자 오디오는 request-scoped `TemporaryDirectory`에서만 처리합니다.
- Modal Volume/Dict, PostgreSQL, Leemage에 사용자 데이터를 저장하지 않습니다.
- profile + source + optional synthesis reference를 하나의 ephemeral response envelope로 반환합니다.
- `/v1/song-target`은 allowlist 곡 target을 yt-dlp + FFmpeg WAV로 request-scoped 생성하는 개발·진단용 capability로 유지합니다. production mixing은 사전 등록된 Leemage `CatalogTargetAsset`을 사용합니다.
- HTTP endpoint는 기존 SoulX Modal API와 동일한 `soulx-api-secret`의 `X-API-Key` 인증을 요구합니다.

## 로컬 CLI 환경

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-local.txt
```

Modal 계정 인증은 기존 workspace profile을 사용합니다.

```bash
.venv/bin/modal token info
```

## 개발 serve

```bash
.venv/bin/modal serve modal_app.py
```

`modal serve`가 출력한 URL은 개발용 ephemeral endpoint입니다. `soulx-api-secret`이 제공하는 API key를 `X-API-Key` header로 전달해야 합니다.

## 배포

실제 배포는 lee-spec-kit의 원격/비용 승인 경계 이후 실행합니다.

```bash
pnpm run modal:vocal-profile:deploy
```

배포 CLI도 `requirements-local.txt`의 `modal==1.5.3`을 사용하므로 전역 Modal CLI 버전에 의존하지 않습니다.

현재 baseline resource는 다음과 같습니다.

- CPU: 2 physical cores
- Memory: 4096 MiB
- GPU: none
- Function timeout: 120 seconds
- `scaledown_window`: 60 seconds
- `max_containers`: 10
- `min_containers`: 0 (scale-to-zero)
- container concurrency: request 1개 (`@modal.concurrent(max_inputs=1)`)

10/30/60초 benchmark 결과 worker→Modal transport는 sync HTTP로 확정했습니다. 사용자-facing 요청은 Next.js/PostgreSQL durable queue에서 비동기로 처리하며 이 Modal endpoint 자체는 sync compute primitive로 유지합니다.

## API

### `GET /health`

- analyzer name/version
- `smart-reference-mid-v1`, `song-target-v1` capability
- transport version
- CPU-only resource contract

### `POST /v1/analyze`

현재 local analyzer와 동일한 multipart 입력을 사용합니다.

- header: `X-Recording-ID`
- file: `audio`
- optional form: guide segment/preset fields, `trim_to_max_duration`

성공 응답은 `modal-analysis-envelope-v1` JSON입니다.

```text
profile
artifacts.source
artifacts.synthesisReference?
cleanupConfirmed
```

artifact bytes는 base64와 SHA-256을 함께 전달합니다. 이 encoding은 구현 단순성을 위한 1차 transport이며 실제 benchmark에서 serialization/memory overhead가 의미 있으면 binary multipart 방식으로 교체할 수 있습니다.

### `POST /v1/song-target`

YouTube URL을 WAV로 변환해 개발·진단할 때 사용합니다. 요청 URL의 video ID가 `expectedVideoId`와 일치하는지만 검증하며 별도 catalog allowlist는 사용하지 않습니다.

```json
{
  "sourceUrl": "https://www.youtube.com/watch?v=...",
  "expectedVideoId": "..........."
}
```

- image에 고정된 `yt-dlp==2026.7.4`와 FFmpeg로 WAV를 생성합니다.
- response는 `audio/wav` streaming이며 stream 종료 후 임시 directory를 삭제합니다.
- production `VOCAL_PROFILE_ANALYZER_BACKEND=modal`에서는 mixing worker도 이 endpoint를 사용하므로 local `VOCAL_PROFILE_API_URL`이 필요하지 않습니다.

## 인증

Web Function에는 기존 `soulx-singer-svc`와 동일한 Modal Secret `soulx-api-secret`을 주입합니다. Secret의 `SOULX_API_KEY` 값을 FastAPI에서 constant-time 비교하고, 호출자는 서버 전용 key를 다음 header로 전달합니다.

```text
X-API-Key: <server-only key>
```

Next.js는 `VOCAL_PROFILE_MODAL_API_KEY`가 있으면 이를 사용하고, 없으면 기존 `MODAL_API_KEY`를 재사용합니다. Browser에는 이 credential을 노출하지 않습니다.
