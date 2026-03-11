## Context

현재 생성 파이프라인은 이미지 분석, 카피, 스타일 정보를 바로 provider 프롬프트로 컴파일한 뒤 고정된 `INTRO / DETAIL / CTA` 클립 구조로 영상을 만듭니다. 이 구조는 제품 정체성 보존에는 유리하지만, 같은 입력 이미지에 대해 같은 훅과 비슷한 카메라 움직임으로 수렴하기 쉬워 숏폼 광고가 가져야 할 "서사 차이"와 "콘셉트 다양성"을 만들지 못합니다.

또한 현재 워크플로에는 단계별 자기비판이나 사실검증 게이트가 없습니다. 그래서 planner-like 지시문이 들어가더라도 실제로는 장면 계획이 아니라 프롬프트 수식어에 그치기 쉽고, 시스템이 스스로 이를 반박하거나 검증하지 못합니다.

## Goals / Non-Goals

**Goals:**
- 생성 전에 story brief, concept family, shot cards를 만드는 별도 planning 계층을 추가한다.
- 각 단계가 다음 단계로 넘어가기 전에 `Self-critique -> Fact check -> Decision` 게이트를 통과하도록 한다.
- 동일 입력 반복 생성 시 카메라 미세차이 대신 훅, 증명 장면, payoff, CTA가 달라지는 서사 다양성을 보장한다.
- 리뷰와 사실검증 산출물을 추적 가능하게 남겨 디버깅과 품질 개선 루프에 활용한다.

**Non-Goals:**
- I2V provider 교체
- FFmpeg 파라미터/렌더링 튜닝 자체를 주된 해결책으로 삼기
- UI 리디자인
- 모든 품질 판단을 완전 자동화된 하나의 점수로 축소하기

## Decisions

### Decision 1: 생성 파이프라인 앞단에 Story Planner를 추가한다
- **선택:** `analysis + copy + style`에서 바로 prompt를 만들지 않고 `story brief -> concept candidates -> selected concept -> shot cards`를 생성한다.
- **이유:** 다양성은 seed보다 계획 계층에서 나온다. 같은 이미지라도 어떤 관점의 훅을 쓸지, 어떤 장면으로 증명할지, 어떤 감정 payoff를 줄지 먼저 달라져야 결과가 달라진다.
- **대안:** seed와 provider prompt만 더 랜덤하게 바꾼다.
  - 이유: 결과 차이가 카메라 떨림이나 motion strength 수준에 머무를 가능성이 높고, 사용자 관점의 "다른 이야기"를 만들지 못한다.

### Decision 2: 각 단계는 Review Gate를 통과해야만 다음 단계로 진행한다
- **선택:** 모든 주요 단계에서 `Self-critique`, `Fact check`, `Decision`, `Next step` 구조를 사용한다.
- **이유:** 현재 시스템은 지시문이 많아도 실제로는 실행 가능한 계획인지, 같은 이야기의 문구 변형인지 걸러내지 못한다. 자기비판과 사실검증을 강제해야 planner/reviewer가 의미를 가진다.
- **대안:** 최종 출력 후 한 번만 평가한다.
  - 이유: 이미 잘못된 계획으로 provider 비용을 소모한 뒤라 수정 비용이 커지고, 저품질 결과의 원인을 앞단에서 차단할 수 없다.

### Decision 3: Fact check는 느낌이 아니라 구조화된 증거를 검증한다
- **선택:** 각 단계별로 검증 가능한 산출물 형식을 둔다.
  - Story brief: target viewer, promise, hook, proof, payoff, CTA
  - Shot cards: scene intent, actor/action, background, camera, proof target
  - Prompt compile: 각 shot card가 prompt에 반영되었는지 매핑
  - Output review: keyframes/events가 shot intent와 일치하는지 비교
- **이유:** "더 흥미롭다" 같은 인상비평은 다음 단계 입력으로 쓰기 어렵다. 사실검증은 artifact 기준이어야 한다.
- **대안:** evaluator 점수 하나로 통합한다.
  - 이유: 왜 실패했는지 설명력이 낮고, 리뷰 결과를 다음 반복에 재사용하기 어렵다.

### Decision 4: 다양성 정책은 story family 단위로 관리한다
- **선택:** 동일 입력을 반복 생성할 때 최근 생성 기록과 story family를 비교해 같은 hook/proof/payoff 조합을 피한다.
- **이유:** 단순 seed 변경만으로는 내러티브 중복을 막기 어렵다. "도시 OOTD 핏체크", "디테일 증명", "비포/애프터", "반응형 챌린지"처럼 의미 단위로 분리해야 한다.
- **대안:** 동일 입력이면 언제나 한 가지 최적 전략만 유지한다.
  - 이유: 광고 실험과 크리에이티브 탐색 목적에 맞지 않고, 반복 생성 가치가 떨어진다.

### Decision 5: 기존 provider/pipeline은 유지하되 prompt 입력을 shot-card 기반으로 변경한다
- **선택:** 초기 단계에서는 Runway/Hailuo/Gemini/MiniMax와 compose/render 계층은 그대로 두고, 입력 prompt를 장면 카드 기반으로 재구성한다.
- **이유:** 문제의 핵심은 planning 부재이며, provider 교체 없이도 서사 계층을 먼저 개선할 수 있다.
- **대안:** 새 provider 또는 멀티에이전트 실행기로 바로 교체한다.
  - 이유: 변화량이 너무 커서 현재 문제의 원인이 planning인지 provider인지 분리하기 어렵다.

## Risks / Trade-offs

- [Risk] 단계가 늘어 생성 시간이 증가할 수 있다. → Mitigation: planner/reviewer 산출물을 경량 JSON 구조로 제한하고, provider 호출 전 단계에서만 게이트를 집중 적용한다.
- [Risk] 자기비판이 지나치게 보수적으로 작동해 다양성이 오히려 줄 수 있다. → Mitigation: 리뷰 실패 사유를 "브랜드 안정성", "서사 중복", "증명 부족" 등으로 분리하고, 모든 실패를 막지 않고 수정 경로를 제안하도록 한다.
- [Risk] structured artifact가 많아져 디버깅 로그가 과도하게 커질 수 있다. → Mitigation: 운영 로그는 요약본만 남기고, 상세 artifact는 디버그/실험 모드 또는 샘플링 기반으로 저장한다.
- [Risk] provider가 reference image 제약 때문에 여전히 비슷한 영상을 낼 수 있다. → Mitigation: 출력 평가에서 "story matched but motion collapsed"와 "story itself duplicated"를 분리해 기록한다.

## Migration Plan

1. story planner와 review gate artifact schema를 정의한다.
2. 기존 `generate-video.usecase` 앞단에 planner와 gate runner를 삽입한다.
3. 기존 fixed clip phase는 유지하되, 각 phase 입력을 shot card로 치환한다.
4. 반복 생성/재생성 시 최근 story family를 참고하는 다양성 정책을 추가한다.
5. 디버그 리포트와 테스트를 통해 "같은 이미지 반복 생성 시 서로 다른 story plan이 생성되는지"를 먼저 검증한다.
6. 이후 실제 provider 출력과 keyframe 검증을 연결한다.

## Open Questions

- story planner artifact를 DB에 저장할지, job metadata 또는 file artifact로 저장할지.
- self-critique / fact-check를 규칙 기반으로 시작할지, LLM reviewer를 바로 도입할지.
- diversity policy가 최근 N회 생성 기록을 어디서 읽어야 하는지.
- 사용자에게 story concept 후보를 노출할지, 백엔드 내부 실험 루프로만 둘지.
