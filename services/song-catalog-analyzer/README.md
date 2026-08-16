# Modal song catalog analyzer

관리자가 업로드한 catalog target audio를 Modal CPU 함수에서 Demucs·librosa-pYIN으로 분석하고 chroma로 원키를 추정하는 비동기 서비스다. 곡 믹싱/합성의 GPU 함수 및 보컬 프로필 Modal app과 별도 autoscaling 경계를 사용하며, `services/vocal-analysis-core/vocal_analysis_core`의 분석 코어를 공유한다. API는 동일한 `soulx-api-secret`의 `X-API-Key` 계약을 재사용한다.

흐름은 다음과 같다.

1. 앱 worker가 READY `CatalogTargetAsset` bytes와 DB `SongAnalysisJob.id`를 `POST /v1/jobs`에 보낸다.
2. endpoint는 request ID에 이미 연결된 호출이 있으면 같은 ID를 반환하고, 없으면 8 vCPU·16 GiB CPU 분석 함수를 spawn해 `externalJobId`를 `202`로 반환한다.
3. 앱 worker는 `GET /v1/jobs/{externalJobId}`를 poll하고 음역·추정 원키·원키 신뢰도를 `SongAnalysis` revision에 저장한다.
4. CPU 분석 함수의 upload, WAV, stem은 작업별 임시 디렉터리와 함께 삭제된다.

로컬 계약 테스트:

```bash
uv run --with-requirements services/song-catalog-analyzer/requirements-local.txt \
  python -m unittest services/song-catalog-analyzer/test_modal_app.py
```

원격 배포(비용·원격 변경 승인 후에만 실행):

```bash
pnpm run modal:song-catalog:deploy
```

배포 출력의 ASGI URL을 `SONG_ANALYSIS_MODAL_URL`에 설정한다. 서버 API key는 `SONG_ANALYSIS_MODAL_API_KEY`가 있으면 우선 사용하고, 없으면 `MODAL_API_KEY`를 사용한다. 음원 원본이나 stem을 API 응답으로 제공하지 않는다.
