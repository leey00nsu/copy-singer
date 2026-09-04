# 파일

- [추천에서 AI 믹싱 결과까지](recommendation-and-mixing.md) - 저장된 사용자 보컬 프로필을 published catalog와 대조해 추천 snapshot을 만들고, 최신성·레퍼런스·티켓을 검증한 뒤 SoulX-Singer 변환 결과를 저장하고 재생하는 흐름을 설명한다. 화면용 상태와 mixing API가 반환하는 DB 상태의 차이, 실패·재시도·환불 경계도 함께 다룬다.
- [보컬 녹음에서 프로필까지](vocal-analysis.md) - 브라우저에서 녹음하거나 오디오 파일을 업로드하면 media asset과 분석 job으로 접수되고, Modal의 분석 결과가 VocalProfile과 Recording으로 저장되는 흐름을 설명한다. 큐의 중복 방지, lease 기반 재시도, 알림, 원본 정리와 ticket 환불의 경계도 함께 다룬다.
