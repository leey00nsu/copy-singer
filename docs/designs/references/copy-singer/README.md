# Copysinger Visual References

이 디렉터리는 Copysinger 제품 UI의 **유일한 visual source of truth**다.

## 우선순위

1. 이 디렉터리의 최종 사용자 승인 reference
2. `docs/designs/design-system.md`
3. `docs/designs/product-ui-redesign.md`
4. 현재 구현 화면은 기능·데이터·상태 계약 확인용으로만 사용

`docs/designs/assets/product-ui-redesign/`, `docs/designs/generated/page-redesigns/`, 과거 current capture와 generated concept는 구현 기준으로 사용하지 않는다.

## 최종 reference set

| 파일 | 크기 | SHA-256 | 역할 |
| --- | --- | --- | --- |
| `01-landing-voice-scan.png` | 1672×941 | `47679da7744f88bf3c94f083c217215c20006903e928b66bff0da192a9c72dd5` | Landing + Voice Scan |
| `02-library.png` | 1672×941 | `fe24a09fea977caed2c27edce3a9cea6b4597268b123ad48b973803dc8d7c8d1` | Library Vocal Profile + AI Mix |
| `03-analysis-account.png` | 1672×941 | `80c2ddeeeee0d201ceacd88d77658dc13ffb642c5347dfb2797076d5967768ba` | Analysis Detail + Account |
| `04-admin.png` | 1672×941 | `838a3ccce0dd5875b9123ae5802430d8b8c982acefeff26020d1b868e5915598` | Admin |
| `05-mixing-progress.png` | 612×1030 | `c6c3e8e1a70aafa49026aef727f604c394afa1009674c0b08df4a9d98d5d0ae3` | `/library/mixes/[id]` 진행 중 상태 |

2026-08-10 대화에서 승인된 최종 4보드와 Mixing Progress 이미지만 이 세트에 포함한다. 새로운 reference를 추가하거나 교체할 때는 이 README와 `product-ui-redesign.md`를 같은 변경에서 갱신한다.

> 현재 DevSpace 파일 API는 binary attachment 복사/삭제를 지원하지 않는다. 따라서 대화 첨부 이미지의 binary copy는 이 checkout에 아직 vendoring되지 않았으며, legacy PNG도 물리적으로 남아 있을 수 있다. **그 파일들은 절대 visual source로 사용하지 않는다.**
