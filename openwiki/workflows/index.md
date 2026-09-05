# 파일

- [티켓 접수부터 AI 믹싱 완료·복구까지](mixing-and-recovery.md) - 사용자가 AI 믹싱을 요청하면 요청 검증과 티켓 차감 뒤 PostgreSQL lease 워커가 Modal 변환 작업을 제출하고 결과를 저장해요. 이 페이지는 상태 직렬화, lease 복구, 재시도·환불·취소·알림 규칙을 한 흐름으로 설명해요.
- [곡 카탈로그 분석과 보컬 기반 추천](recommendations-and-catalog.md)
- [보컬 업로드에서 분석 결과와 프로필 저장까지](vocal-analysis.md) - 사용자의 오디오 업로드가 소유자 범위의 PostgreSQL 작업 큐와 Leemage 미디어 저장소를 거쳐 Modal 분석기와 VocalProfile 저장으로 이어지는 현재 흐름을 설명해요. 재시도, 소유권, 미디어 정리, 티켓 환불과 알림이 갈리는 지점도 확인할 수 있어요.
