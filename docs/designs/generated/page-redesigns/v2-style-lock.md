# Page Redesign V2 Style Lock

V1 ImageGen 시안은 원본 보드보다 노란 canvas를 사용했고 페이지별 shell·타입·아이콘이 달라 최종 방향에서 제외한다. V2는 아래 규칙과 원본 보드를 모든 페이지에 공통 적용한다.

## Visual source of truth

- Public entry: `docs/designs/assets/product-ui-redesign/landing-entry.png`
- Discovery: `docs/designs/assets/product-ui-redesign/discovery-flow.png`
- Mixing/result: `docs/designs/assets/product-ui-redesign/creation-flow.png`
- Product shell/list/account: `docs/designs/assets/product-ui-redesign/library-account-states.png`

## Locked foundation

- Page canvas: neutral `#FFFFFF`; beige, cream, warm-yellow tint 금지
- Quiet surface: neutral `#FAFAFA` 또는 `#F7F7F7`
- Border: neutral `#E8E8E8`, 1px
- Primary text: `#111111`; secondary text: `#737373`
- Primary action: black background, white text
- Audio/data accent: pale violet and blue only in waveform/chart
- Success: restrained green only in status and score
- Shadow: overlay 이외에는 사용하지 않음
- Radius: controls 6–8px, bounded surface 8–10px; pill·중첩 card 금지

## Locked product shell

- Desktop sidebar: 216px
- Brand: identical waveform mark and `Copy Singer` wordmark on every product page
- Navigation: `Voice Scan`, `Library`, `Account`
- Active navigation: `#F5F5F5` rectangular background, black text; black-filled item 금지
- Content gutter: 40–48px; content max width approximately 1120px
- Page eyebrow, title, helper and top action use the same vertical rhythm on every route

## Locked typography and density

- Korean/system sans throughout; serif wordmark 금지
- Page title: 36–40px/600; section title: 20–24px/600
- Body: 14–16px; label/table: 12–14px
- Product table row: 52–60px; 1280×800 first viewport에 6–9 rows 목표
- Buttons: 36–40px high except Landing CTA and primary recording control

## Generation protocol

1. 각 페이지는 관련 원본 보드를 `referenced_image_paths`로 직접 전달한다.
2. Landing V2와 Library V2를 public/product master reference로 잠근다.
3. 이후 페이지는 관련 원본 보드와 해당 master reference를 함께 전달한다.
4. 작은 텍스트와 fixture 값은 구현 계약이 정본이며, 생성 이미지가 이를 대체하지 않는다.
5. 지원하지 않는 pricing, subscription, project, playlist, favorite, album art, genre, difficulty, lyrics, Before/After를 생성하지 않는다.
