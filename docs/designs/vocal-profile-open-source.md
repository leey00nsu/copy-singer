# 보컬 프로필 오픈소스 선정 초안

## 결론

MVP는 `librosa`를 기본 분석기로 사용한다. 30초 내외 모노 가창을 CPU에서 정규화하고 `librosa.pyin`으로 F0와 voiced probability를 추출한 뒤, NumPy로 MIDI 분위수·테시투라·stability를 계산한다.

## 후보 비교

| 후보 | 사용 목적 | 장점 | 초기 판단 |
| --- | --- | --- | --- |
| librosa | pYIN F0, RMS, MFCC, spectral descriptors | 성숙한 Python 음악 분석 라이브러리, CPU 실행, ISC 라이선스 | MVP 기본 |
| torchcrepe | 신경망 기반 F0와 periodicity | MIT, PyTorch 기반, pitch tracker로 잘 분리됨 | pYIN 정확도가 부족할 때 비교 실험 |
| 기존 SoulX RMVPE | SVC 전처리 F0 | 현재 모델 이미지와 가중치를 재사용 가능 | 합성 경로 유지, 프로필 API에는 GPU 결합 때문에 보류 |
| SpeechBrain ECAPA | speaker/timbre embedding | Apache-2.0, speaker recognition recipe와 pretrained 모델 | 음색 기반 추천 가설 검증 후 선택 |

## MVP 분석 계약

1. ffmpeg로 입력을 mono PCM으로 표준화한다.
2. 무음·클리핑·최소 길이를 검사한다.
3. `librosa.pyin`으로 F0, voiced flag, voiced probability를 계산한다.
4. 유효 F0를 MIDI로 변환하고 p10/p50/p90, min/max, voiced ratio를 계산한다.
5. 안정도는 중앙음 주변 cents 분산 또는 프레임 간 cents 변화량으로 계산한다.
6. 결과에 `analyzer=librosa-pyin`과 명시적 버전을 저장한다.

## 검증 전략

- 합성 sine sweep, 고정음, 무음, clipping fixture로 경계 동작을 검증한다.
- 동일 fixture를 librosa와 torchcrepe로 비교해 octave error와 voiced 판단 차이를 기록한다.
- 실제 사용자 녹음은 수동 음역 확인값과 비교하되 의료적·절대적 평가로 사용하지 않는다.

## 라이선스 메모

- librosa: ISC
- torchcrepe: MIT
- SpeechBrain: Apache-2.0
- SoulX-Singer: Apache-2.0

모델 가중치는 코드 라이선스와 별도 조건이 있을 수 있으므로 실제 채택 시 해당 모델 카드까지 다시 검토한다.

## 공식 자료

- librosa: https://github.com/librosa/librosa
- librosa pYIN: https://librosa.org/doc/latest/generated/librosa.pyin.html
- torchcrepe: https://github.com/maxrmorrison/torchcrepe
- SpeechBrain: https://github.com/speechbrain/speechbrain
- SoulX-Singer: https://github.com/Soul-AILab/SoulX-Singer
