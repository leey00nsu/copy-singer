# Modal Vocal Profile Analyzer

F010의 사용자 보컬 프로필용 CPU-only Modal Web Function입니다.

## 역할

- `services/vocal-profile-api/app`의 공유 분석 코어를 그대로 사용합니다.
- 최대 60초 사용자 source를 분석하고 `smart-reference-v1` reference를 생성합니다.
- 사용자 오디오는 request-scoped `TemporaryDirectory`에서만 처리합니다.
- Modal Volume/Dict, PostgreSQL, Leemage에 사용자 데이터를 저장하지 않습니다.
- profile + source + optional synthesis reference를 하나의 ephemeral response envelope로 반환합니다.
- HTTP endpoint는 Modal Proxy Token 인증을 요구합니다.

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

`modal serve`가 출력한 URL은 개발용 ephemeral endpoint입니다. Proxy Token을 만든 뒤 요청에 `Modal-Key`, `Modal-Secret`을 전달해야 합니다.

## 배포

실제 배포는 lee-spec-kit의 원격/비용 승인 경계 이후 실행합니다.

```bash
.venv/bin/modal deploy modal_app.py
```

현재 baseline resource는 다음과 같습니다.

- CPU: 2 physical cores
- Memory: 4096 MiB
- GPU: none
- Function timeout: 120 seconds
- `scaledown_window`: 60 seconds
- `max_containers`: 10
- `min_containers`: 0 (기본 scale-to-zero)

최종 resource와 sync/async transport는 10/30/60초 cold/warm benchmark 이후 확정합니다.

## API

### `GET /health`

- analyzer name/version
- `smart-reference-v1` capability
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

## 인증

Web Function은 `requires_proxy_auth=True`를 사용합니다. 호출자는 Modal Proxy Token의 ID/secret을 서버 전용 환경변수에 저장하고 다음 header로 전달합니다.

```text
Modal-Key: wk-...
Modal-Secret: ws-...
```

Browser에는 이 credential을 노출하지 않습니다.
