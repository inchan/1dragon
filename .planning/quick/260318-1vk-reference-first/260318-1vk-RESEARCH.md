# Quick Research: Reference-First Pivot

**Researched:** 2026-03-18  
**Scope:** 목표 재정의 - 영상 제작 실행을 잠시 보류하고, `reference-first 광고 리서치 / 패턴 추출 시스템`으로 프로젝트 중심축을 재정비  
**Confidence:** HIGH

## Summary

현재 저장소의 durable narrative는 아직 `real-job shortform studio`와 `image -> video -> review` 루프에 묶여 있다. 반면 실제로 이미 가장 잘 정리된 자산은 영상 생성 자체보다, 레퍼런스를 수집/정규화/승인하고 planner가 구조만 빌려오게 만드는 쪽이다. 즉 이번 피벗은 새 아이디어를 여는 일이 아니라, 이미 만들어 둔 `reference library + schema + approval + retrieval` 축을 프로젝트의 1차 목표로 승격하는 일에 가깝다.

핵심은 `영상 생성`을 버리는 것이 아니라 `증거 lane`으로 내리고, `reference acquisition -> normalization -> approval -> retrieval -> pattern extraction`을 제품/연구의 주 경로로 다시 적는 것이다. 현재 문서 기준선만 바꾸면 기존 OpenSpec과 planning 자산의 상당 부분은 그대로 재사용 가능하다.

**Primary recommendation:** `README.md`, `WORKFLOW.md`, `.planning/ROADMAP.md`를 즉시 reference-first 기준으로 재작성하고, 누락된 `PROJECT.md`와 `STATE.md`를 추가해 "무엇을 보류했고 무엇을 계속 살릴지"를 durable하게 고정하라.

## 1. Durable Project Docs: What the New Goal Implies

### `README.md`

현재 README는 제품 정체성을 `shortform studio`로 정의하고, smoke/video/review 실행 경로를 전면에 둔다. 피벗 이후에는 아래 순서로 바뀌어야 한다.

- 1차 목표: `광고 레퍼런스와 내부 judged artifact에서 구조 패턴을 추출하는 시스템`
- 2차 목표: `planner가 권리/적합성 검증된 reference shelf를 조회하도록 만드는 것`
- 보류 명시: live video generation은 research evidence lane으로만 유지
- 성공 기준: 더 많은 영상 생성이 아니라 더 좋은 `approved reference entries`, `retrieval quality`, `pattern library coverage`

### `WORKFLOW.md`

현재 Soul/Purpose/Operating Goals가 모두 "trustworthy shortform story delivery"에 맞춰져 있다. reference-first로 전환하면 workflow는 아래처럼 바뀌어야 한다.

- Soul: 제품 이미지를 바로 영상으로 만들기보다, 어떤 광고 구조가 맞는지 먼저 판별한다
- Purpose: 생성보다 `diagnosis + reference fit + pattern extraction + approval`
- Completion gate: provider success가 아니라 `rights clear + normalized + approved + retrievable`
- Operating Goals:
  - one clear claim
  - reusable structure without copying expression
  - internal truth outranks external inspiration
  - planner bypass 없는 taxonomy-first retrieval

### `.planning/ROADMAP.md`

현재 ROADMAP은 1단계 calibration 이후 2-5단계가 studio productization으로 이어진다. 이 순서는 지금 brief와 충돌한다. 새 roadmap은 최소 아래 순서로 재편되어야 한다.

1. Goal reset and durable docs alignment
2. Reference intake and approval operations
3. Normalized schema and retrieval scoring
4. Internal judged lane consolidation
5. Planner-facing pattern extraction and conditioning
6. Only then, optional downstream generation re-entry

즉 `artifact visibility`, `operator productivity`, `controlled expansion`은 삭제가 아니라 하위 단계로 강등되어야 한다.

### Missing durable docs: `PROJECT.md` and `STATE.md`

지금 repo에는 새로운 미션을 잠그는 상위 `PROJECT.md`가 없고, 현재 무엇이 active/pause/deferred인지 적는 `STATE.md`도 없다. 이 상태에서는 ROADMAP만 바꿔도 실행자가 다시 영상 생성 쪽으로 되돌아가기 쉽다.

최소 내용:

- `PROJECT.md`
  - mission
  - target operator
  - in-scope / out-of-scope
  - success metrics
  - non-goals
- `STATE.md`
  - active focus: reference-first research system
  - paused: live shortform production expansion
  - preserve: reference schema, judged artifacts, deterministic verification work
  - next 3 decisions

## 2. Existing Repo Assets To Preserve

이 피벗은 blank-slate가 아니다. 아래 자산은 유지하는 편이 맞다.

- `.planning/reference-library/REFERENCE_COLLECTION_STRATEGY.md`
  - 이미 `source lanes`, `rights boundary`, `bootstrap priority`, `truth priority`가 정리돼 있다.
- `.planning/reference-library/reference-entry.schema.json`
  - reference-first 시스템의 핵심 데이터 계약이다.
- `.planning/reference-library/reference-entry.csv`
  - low-friction manual intake surface로 바로 쓸 수 있다.
- `openspec/changes/research-editorial-shortform-test-flow`
  - 특히 `1.5`, `1.8`, `4.4`, `4.5`, `4.6`의 방향은 그대로 reference-first와 일치한다.
  - 반대로 `4.1`, `4.3`, `4.8`은 영상 생성 재개 전까지 pause/defer 대상이다.
- `.planning/DISTINCTIVE_SHORTFORM_LOOP_SESSION.md`
  - stage model 자체는 여전히 유효하다. 다만 `provider execution`은 중심 단계가 아니라 downstream evidence lane으로 낮춰야 한다.
- `openspec/changes/add-test-based-editorial-verification`
  - deterministic verification 방향은 유지 가치가 높다.
  - 단, gold fixture의 주체를 `generated video quality`보다 `reference/pattern/retrieval artifacts` 쪽으로 재정의하는 것이 더 맞다.
- `.planning/ROADMAP_ITEM_TEMPLATE.md`
  - Symphony/GSD형 item loop를 이미 잘 담고 있다. 새 infra 없이 바로 사용할 수 있다.

## 3. GSD Compatibility Gaps Right Now

| Gap | Why it matters | Immediate fix |
| --- | --- | --- |
| ROADMAP is still studio-first | 현재 phase ordering이 사용자 brief와 다르다 | `.planning/ROADMAP.md`를 reference-first phase map으로 교체 |
| No `PROJECT.md` | 새 mission, non-goals, success metric의 single source가 없다 | root `PROJECT.md` 추가 |
| No `STATE.md` | active/pause/deferred 상태가 durable하지 않다 | root `STATE.md` 추가 |
| Active OpenSpec still implies live video completion | `research-editorial-shortform-test-flow`의 남은 3 task가 현재 방향과 어긋난다 | paused/deferred decision을 `STATE.md`에 기록하고 새 pivot change로 분리 |
| `.omx` state is empty | orchestration state 복원이 안 된다 | 새 infra 없이도 우선 `STATE.md`로 대체 기록 |
| `.planning/config.json` absent | validation/workflow toggle 기준이 없다 | optional; 당장 blocker는 아니지만 later hygiene item으로 추가 가능 |

가장 중요한 정합성 문제는 "문서상 active work"와 "실제 product direction"이 다르다는 점이다. 이 불일치를 먼저 닫아야 이후 planning이 흔들리지 않는다.

## 4. Symphony-Style Principles You Can Adopt Immediately

새 infra 없이도 바로 적용 가능한 원칙은 아래다.

- Evidence before status
  - reference item을 `captured`, `normalized`, `approved` 중 어디까지 왔는지 증거와 함께만 표시
- Orchestrator / executor split
  - 한 사람이 하더라도 "오늘 어떤 lane을 밀지 정하는 역할"과 "실제 intake/normalization을 하는 역할"을 분리
- One issue / one lane
  - roadmap rewrite, schema evolution, live verification, intake bootstrap을 한 change에 섞지 않기
- Durable decisions in repo
  - source priority, rights policy, video-pause policy를 채팅이 아니라 repo 문서에 남기기
- Same execution loop everywhere
  - `Explore -> Research -> Analyze -> Plan -> Implement -> Test -> Verify -> Review`를 reference intake 작업에도 그대로 적용
- Parallelize only independent lanes
  - official SNS collection, official prompt-doc extraction, internal judged artifact normalization은 병렬 가능
  - approval policy와 schema change는 단일 lane으로 유지

## Immediate Next Moves

1. `README.md`, `WORKFLOW.md`, `.planning/ROADMAP.md`를 reference-first 문장으로 다시 쓴다.
2. root `PROJECT.md`와 `STATE.md`를 추가해 mission, pause list, preserved assets를 고정한다.
3. `research-editorial-shortform-test-flow`의 남은 live-video 성격 task는 pause/defer 처리하고, reference-first pivot용 새 OpenSpec 또는 quick item을 연다.
4. 기존 `REFERENCE_COLLECTION_STRATEGY`와 schema를 기준으로 첫 approved shelf bootstrap을 시작한다.

## Sources

- `README.md`
- `WORKFLOW.md`
- `.planning/ROADMAP.md`
- `.planning/reference-library/REFERENCE_COLLECTION_STRATEGY.md`
- `.planning/reference-library/reference-entry.schema.json`
- `.planning/reference-library/reference-entry.csv`
- `.planning/PHASE_1_EDITORIAL_CALIBRATION.md`
- `.planning/DISTINCTIVE_SHORTFORM_LOOP_SESSION.md`
- `.planning/ROADMAP_ITEM_TEMPLATE.md`
- `openspec/changes/research-editorial-shortform-test-flow/proposal.md`
- `openspec/changes/research-editorial-shortform-test-flow/design.md`
- `openspec/changes/research-editorial-shortform-test-flow/tasks.md`
- `openspec/changes/add-test-based-editorial-verification/proposal.md`
- `openspec/changes/add-test-based-editorial-verification/tasks.md`
