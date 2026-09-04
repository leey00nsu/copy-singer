# 파일

- [인증·소유권·관리자 접근 제어](access-control.md) - Better Auth와 Google OAuth가 세션을 만들고, 페이지·API 경계가 인증 여부와 관리자 allowlist를 검사하는 방식을 설명한다. 개발 우회가 허용되는 환경과 사용자별 resource ownership 및 실패 응답도 함께 정리한다.
- [곡 카탈로그와 추천 대상 수명주기](catalog-and-recommendations.md) - 곡의 식별자, 출처 revision, 분석 revision, 추천·믹싱용 target asset, 카탈로그 공개 상태가 왜 분리되는지 설명한다. 관리자 변경이 추천 결과와 믹싱 작업의 snapshot을 어떻게 무효화하는지도 다룬다.
- [보컬 분석과 추천 도메인](vocal-analysis-and-recommendations.md) - 사용자 오디오를 보컬 프로필 descriptor와 수치로 변환하고, 공개 곡 분석값과 key-fit scoring을 거쳐 추천 순위·근거·화면 상태로 제공하는 현재 규칙을 설명한다. 브라우저 입력, 분석 job, profile persistence, scoring, presentation의 경계를 함께 다룬다.
