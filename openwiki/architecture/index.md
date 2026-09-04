# 파일

- [Feature-Sliced Design 경계](fsd-boundaries.md) - Steiger와 아키텍처 테스트가 강제하는 레이어 의존 방향, slice public API, browser-safe·model·server API의 구분을 설명한다. Next.js route adapter와 client/server·내부 segment 검사가 안전한 변경 절차를 제공한다.
- [시스템 지도와 런타임 경계](system-map.md) - Next.js adapter와 Feature-Sliced Design 계층, PostgreSQL·Leemage 저장 경계, Modal/SoulX 연동, durable worker의 요청·작업 흐름을 한눈에 설명한다. 주요 진입점과 상태·lease·실패 처리, 변경 시 지켜야 할 불변식을 함께 정리한다.
