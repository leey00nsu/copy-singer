# 파일

- [계정·티켓·알림 흐름](account-and-tickets.md)
- [관리자 카탈로그 운영 워크플로](catalog-management.md)
- [추천에서 AI 믹싱 결과까지](recommendation-to-mixing.md) - 추천 항목을 현재 카탈로그와 보컬 프로필로 다시 검증한 뒤, 티켓 차감과 중복 방지를 거쳐 SoulX 믹싱 작업을 제출하고 결과 음원을 저장·재생하는 흐름을 설명한다. 실패 시 외부 접수 전 환불과 재시도 경계를 함께 다룬다.
- [보컬 프로필 분석 워크플로](vocal-profile-analysis.md) - /profile에서 업로드한 음성이 media asset과 내구성 있는 분석 작업으로 저장되고, 별도 worker가 Modal 동기 분석을 호출해 보컬 프로필과 reference를 저장하는 전체 흐름을 설명한다. lease, 재시도, 최종 실패 시 알림과 티켓 환불의 현재 동작도 다룬다.
