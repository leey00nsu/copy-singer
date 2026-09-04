# 파일

- [인증과 사용자 데이터 소유권](access-control.md) - Better Auth·Google OAuth·개발 인증 우회가 세션을 만들고 갱신하는 흐름과, 페이지·API·server feature가 인증·인가·소유권 검사를 나누는 방식을 설명한다. 프로필, reference, 추천·믹싱, 티켓, 관리자 기능의 보호 규칙과 실패 동작을 함께 정리한다.
- [곡 카탈로그와 추천 스냅샷](catalog-and-recommendations.md) - 곡 identity, YouTube source revision, 분석 결과, target asset, 공개 entry와 profile별 추천 결과가 서로 다른 수명주기를 갖는 이유를 설명한다. source 교체와 target 업로드가 PostgreSQL의 current 포인터, catalog revision, 기존 믹싱 근거에 미치는 영향도 다룬다.
- [보컬 분석 지표와 추천 적합도](vocal-analysis-and-recommendations.md) - 녹음 입력이 analyzer 계약과 품질 gate를 통과해 vocal profile이 되는 과정을 설명한다. 관측 음역·주요 음역·사람용 3-band와 중앙 음역 synthesis reference를 구분하고, key fit·추천 정렬·표시 상태까지 연결한다.
