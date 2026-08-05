# SoulX-Singer SVC on Modal

SoulX-Singer-SVC를 Modal의 serverless GPU에서 실행하고 Next.js 서버에서 호출하기 위한 비동기 API입니다.

## 구조

1. CPU 기반 FastAPI Web Function이 두 오디오를 Modal Volume에 저장합니다.
2. GPU 함수가 비동기로 실행되며 FunctionCall ID가 작업 ID와 연결됩니다.
3. 클라이언트는 상태를 폴링하고 완료 후 WAV를 다운로드합니다.
4. 모델은 별도 Volume에 한 번만 내려받고 GPU 컨테이너 시작 시 메모리에 로드합니다.

API 형식은 기존 클라이언트 인터페이스와 동일합니다.

- `POST /v1/conversions`
- `GET /v1/conversions/{id}`
- `GET /v1/conversions/{id}/audio`
- `DELETE /v1/conversions/{id}`

## 1. Modal CLI 준비

Python 3.10 이상 로컬 환경에서 실행합니다.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-local.txt
modal setup
```

## 2. API Secret 생성

```bash
openssl rand -hex 32
modal secret create soulx-api-secret SOULX_API_KEY=위에서_생성한_값
```

Next.js에도 같은 값을 `MODAL_API_KEY`라는 서버 전용 환경 변수로 설정합니다.

## 3. 모델 다운로드

약 4.7GB의 SVC, RMVPE, 보컬 분리 가중치를 CPU 함수로 Volume에 한 번만 다운로드합니다.

```bash
modal run modal_app.py::setup
```

## 4. 개발 및 배포

```bash
# 임시 개발 URL과 live reload
modal serve modal_app.py

# 고정 URL 배포
modal deploy modal_app.py
```

배포 출력에 표시되는 `https://...modal.run` URL이 `MODAL_API_URL`입니다.

기본 GPU는 L4, GPU 컨테이너 수는 1개, idle 유지 시간은 60초입니다. 배포할 때 변경할 수 있습니다.

```bash
SOULX_GPU=T4 SOULX_SCALEDOWN_WINDOW=30 modal deploy modal_app.py
```

L4에서 먼저 짧은 샘플로 검증하고, T4 16GB에서도 안정적으로 동작할 때 T4로 낮추는 것을 권장합니다. `max_containers=1`이므로 여러 요청은 Modal 내부에서 순차 대기합니다.

### 무료 크레딧과 GPU 비용

2026년 8월 기준 Modal Starter는 매월 $30 무료 compute를 제공합니다. 표시 단가는 L4가 초당 $0.000222(약 $0.80/시간), T4가 초당 $0.000164(약 $0.59/시간)이며 CPU와 메모리 비용은 별도입니다. 실제 처리량은 모델 로딩과 추론 시간에 따라 달라집니다. 비용을 우선하면 `SOULX_SCALEDOWN_WINDOW`를 30~60초로 유지하고, 연속 테스트 중에만 늘리세요.

[Modal 가격표](https://modal.com/pricing)

## 5. API 테스트

```bash
curl "$MODAL_API_URL/health"

curl -X POST "$MODAL_API_URL/v1/conversions" \
  -H "X-API-Key: $MODAL_API_KEY" \
  -F "prompt_audio=@voice-reference.wav" \
  -F "target_audio=@song.wav" \
  -F "target_vocal_separation=true" \
  -F "auto_mix_accompaniment=true" \
  -F "steps=32" \
  -F "cfg=1.0"
```

응답의 `id`를 이용해 상태를 폴링합니다.

```bash
curl -H "X-API-Key: $MODAL_API_KEY" \
  "$MODAL_API_URL/v1/conversions/$JOB_ID"

curl -L -H "X-API-Key: $MODAL_API_KEY" \
  "$MODAL_API_URL/v1/conversions/$JOB_ID/audio" \
  --output result.wav
```

## 입력 기준

- `prompt_audio`: 목표 가수의 깨끗한 노래 음성. 최대 30초 사용.
- `target_audio`: 변환할 보컬 또는 반주 포함 노래. 최대 300초 사용, 업로드 최대 256MB.
- `prompt_audio` 업로드 크기는 최대 128MB입니다.
- `prompt_vocal_separation`: prompt에 반주가 있을 때만 `true`.
- `target_vocal_separation`: target에 반주가 있으면 `true`.
- `auto_pitch_shift`: 두 음역 차이를 자동 보정.
- `auto_mix_accompaniment`: 분리한 target 반주를 결과와 다시 믹스.
- `steps`: 기본 32. 높을수록 품질과 실행 시간이 증가할 수 있습니다.
- `cfg`: 기본 1.0. 원본 권장 범위는 1~3입니다.

## Next.js

`examples/nextjs-*.ts` 세 파일을 App Router의 대응 경로에 복사합니다.

```dotenv
MODAL_API_URL=https://your-workspace--soulx-singer-svc-web.modal.run
MODAL_API_KEY=the-same-value-in-soulx-api-secret
```

브라우저는 Next.js API Route만 호출해야 합니다. Modal URL을 브라우저에서 직접 호출하면 API 키가 노출됩니다.

업로드와 결과 파일은 매일 실행되는 정리 함수가 24시간 후 삭제합니다. 사용자가 직접 `DELETE /v1/conversions/{id}`를 호출해 즉시 지울 수도 있습니다.

## 프로토타입 제한

- Modal FunctionCall 결과와 Dict 항목은 장기 보관소가 아닙니다.
- 공개 서비스 전에는 사용자 인증, 사용량 제한, 파일 만료 작업, 동의 확인 및 악용 신고 절차를 추가해야 합니다.
- SoulX-Singer 코드가 Apache-2.0이어도 음원 저작권과 목소리 당사자의 동의는 별도로 필요합니다.
