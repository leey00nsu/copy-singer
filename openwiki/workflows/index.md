# 파일

- [믹싱 작업 접수와 외부 실패 복구 이해하기](mixing-and-recovery.md) - 믹싱 요청이 티켓 원장과 `MixingJob`에 어떻게 원자적으로 접수되는지, lease 워커가 Leemage asset과 SoulX-Singer 작업을 어떻게 처리하는지 설명해요. 제출 불확실성, lease 손실, 재시도·환불·reconciliation 경계를 확인할 수 있어요.
- [카탈로그 분석에서 곡·키 추천까지](recommendations-and-catalog.md) - 관리자 카탈로그의 source·target asset과 Modal 곡 분석 revision이 어떻게 공개 카탈로그와 보컬 프로필 기반 추천으로 이어지는지 설명해요. 추천 화면의 상태 축약과 저장된 DB 상태를 구분하고, 추천 결과가 믹싱 입력으로 넘어가는 검증 경계를 확인할 수 있어요.
- [녹음이 보컬 프로필 결과가 되는 흐름 이해하기](vocal-analysis.md) - 브라우저의 오디오 업로드가 소유자 범위의 MediaAsset과 분석 작업이 되고, lease 워커와 동기 Modal analyzer를 거쳐 VocalProfile로 저장되는 현재 흐름을 설명해요. 재시도·환불·미디어 정리와 프로필 삭제 경쟁에서 지켜지는 경계도 확인할 수 있어요.
