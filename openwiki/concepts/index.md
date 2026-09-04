# 파일

- [도메인 모델과 영속 상태](domain-data-model.md) - Recording·VocalProfile에서 Song 카탈로그 revision, MediaAsset, 티켓 원장, 알림, 분석·믹싱 작업까지의 영속 관계와 현재 runtime 불변식을 설명한다. 카탈로그 교체 시 추천이 무효화되는 조건과 사용자 소유권, idempotency, 실패 환불의 경계를 빠르게 확인할 수 있다.
- [인증·데이터 소유권·티켓과 알림](identity-ownership-and-entitlements.md) - Google OAuth 세션과 관리자 판별이 페이지·API 경계를 어떻게 지키는지 설명합니다. 사용자 소유 데이터, 가입 보상, 티켓 원장, 작업 실패 환불, 알림 중복 제거의 현재 불변식을 분석·믹싱 흐름과 연결합니다.
