# 파일

- [알림과 중복 방지](notifications.md) - 작업 종료 확정과 티켓 지급 조정에서 알림이 만들어지는 지점, `dedupeKey` unique 제약이 중복을 지우는 방식, 그리고 세션 사용자 기준 읽기 경로와 화면 표시를 설명해요.
- [티켓 원장과 멱등성](ticket-ledger.md) - 티켓 차감·환불·가입 지급·관리자 조정이 TicketWallet과 TicketLedger에 함께 기록되는 방식과, idempotencyKey 규칙이 중복 반영을 막는 원리, 가입 지급 복구가 금액 충돌을 거부하는 조건을 설명해요.
