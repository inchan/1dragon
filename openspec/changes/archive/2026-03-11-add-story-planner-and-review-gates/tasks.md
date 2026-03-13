## 1. Story Planner Artifact 정의

- [x] 1.1 `story brief`, `concept candidate`, `shot card`, `review artifact`의 구조를 타입/스키마로 정의한다.
- [x] 1.2 현재 입력(`image analysis`, `style`, `copy`, `creative context`)에서 story brief를 만드는 planner 계층을 추가한다.
- [x] 1.3 동일 입력 반복 생성 시 최근 concept family와 중복 여부를 판단하는 diversity policy를 설계한다.

## 2. 자기비판 + 사실검증 게이트 추가

- [x] 2.1 각 단계별 리뷰 형식을 `Fact / Inference / Risk / Decision / NextStep`로 고정한다.
- [x] 2.2 story brief 단계에서 "실제 훅/증명/payoff/CTA가 있는가"를 검증하는 self-critique + fact-check를 구현한다.
- [x] 2.3 shot planning 단계에서 "장면 의도가 서로 구분되는가"를 검증하는 gate를 구현한다.
- [x] 2.4 prompt compilation 단계에서 shot card와 provider prompt의 매핑 누락/모순을 검증하는 gate를 구현한다.

## 3. 생성 파이프라인 전환

- [x] 3.1 `generate-video.usecase`가 고정 `INTRO / DETAIL / CTA`만 의존하지 않고 planner 산출물을 입력으로 받도록 변경한다.
- [x] 3.2 `prompt-builder`가 story brief/shot card 기반 prompt compile을 수행하도록 변경한다.
- [x] 3.3 regeneration 경로가 style/seed 변경만이 아니라 새로운 approved concept family를 요청하도록 변경한다.

## 4. 검증 및 품질 루프

- [x] 4.1 동일 이미지 반복 생성 테스트에서 story plan의 hook/proof/payoff가 실제로 달라지는지 검증한다.
- [x] 4.2 리뷰 게이트가 "카메라 표현만 다른 동일 스토리"를 실패로 판단하는 테스트를 추가한다.
- [x] 4.3 prompt fact-check 실패 시 provider 호출 전 단계에서 중단되는지 검증한다.
- [x] 4.4 디버그 로그 또는 artifact에서 각 단계의 decision trace를 재구성할 수 있는지 확인한다.
