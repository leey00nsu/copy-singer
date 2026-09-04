# 파일

- [계정·티켓·알림 workflow](account-and-tickets.md) - Google 로그인과 신규 사용자 onboarding부터 사용자별 티켓 원장, 분석·믹싱 작업, 환불, 알림과 계정 화면까지의 현재 변경 흐름을 설명한다. 소유권 경계와 원자성·멱등성 불변식을 구현과 통합 테스트 기준으로 정리한다.
- [관리자 카탈로그 관리 workflow](catalog-management.md) - 관리자가 곡 identity와 YouTube source를 등록·교체하고 target asset을 준비한 뒤 분석 결과를 검증해 공개하는 현재 runtime 절차를 설명한다. 외부 media 업로드, 실패 복구, target staging 및 catalog snapshot의 경계를 함께 다룬다.
- [추천 선택에서 AI 믹싱 결과까지](recommendation-to-mixing.md) - 보컬 프로필 분석이 끝난 뒤 추천 snapshot에서 곡 상세와 추천 키를 확인하고, 티켓 차감·durable queue·SoulX 변환·최종 음원 저장을 거쳐 결과를 재생·다운로드하는 사용자 workflow를 설명한다.
- [보컬 프로필 생성·분석·히스토리 workflow](vocal-profile-analysis.md) - 브라우저 녹음 또는 업로드한 음성을 60초 분석 계약, source/reference media, 내구성 있는 analysis job으로 연결하는 흐름을 설명한다. Modal analyzer adapter의 품질 gate, lease·재시도·환불, 프로필 히스토리와 비공개 재생까지 다룬다.
