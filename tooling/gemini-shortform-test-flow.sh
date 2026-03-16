#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
ENV_FILE="$ROOT_DIR/.env.test"
PRODUCT_IMAGE=""
PERSONA_BRIEF="An anonymous non-celebrity real adult woman wearing the exact garment in a premium boutique studio, full body, confident pose."
COMPOSITE_PROMPT=""
VIDEO_PROMPT=""
BRAND_TONE=""
CREATIVE_CONTEXT=""
BANNED_CLAIMS=""
MESSAGE_SPINE_ID="QUESTION_PROOF_CHOICE"
HOOK="첫 장면부터 시선 정지"
MESSAGE="핏과 실루엣이 바로 보이는 원피스"
PROOF_DETAIL=""
VIEWER_TAKEAWAY=""
CTA="지금 코디 확인"
AUDIENCE="여성 패션 숏폼 시청자"
EDITORIAL_THESIS=""
TALENT_BRIEF="Adult Korean editorial talent, measured gaze, restrained styling, real skin texture, garment-first posture."
CTA_MODE="external-overlay"
REVIEW_BACKEND="api"
RUN_NAME=""
SKIP_REVIEW=0
REFERENCE_DIRECTIVE=""
STORYLINE_ONLY=0
STORYLINE_MODEL="gemini-3-flash-preview"
STORYLINE_TARGET_DURATION_SECONDS=16
STORYLINE_CANDIDATE_COUNT=3
SKIP_STORYLINE_PLAN=0
MESSAGE_SPINE_SET=0
HOOK_SET=0
MESSAGE_SET=0
PROOF_DETAIL_SET=0
VIEWER_TAKEAWAY_SET=0
EDITORIAL_THESIS_SET=0
TALENT_BRIEF_SET=0
REFERENCE_DIRECTIVE_SET=0
SCENARIO_WRAPPER=""
PLACE_FRAME=""
ACTION_FRAME=""
MOMENT_FRAME=""
PROOF_GOAL=""
SCENARIO_SITUATION=""
VISIBLE_ACTION=""
HOOK_DIRECTION=""
PROOF_DIRECTION=""
PAYOFF_DIRECTION=""
STORYLINE_PROMPT=""
STORYLINE_RESPONSE=""
STORYLINE_JSON=""
STORYLINE_MD=""

usage() {
	cat <<'EOF'
Usage:
  tooling/gemini-shortform-test-flow.sh --image <product-image> [options]

Options:
  --image <path>                Local product image path (required)
  --storyline-only              Analyze the photo and write storyline artifacts only
  --storyline-model <value>     Multimodal model for storyline-only mode. Default: gemini-3-flash-preview
  --storyline-duration <n>      Storyline target duration in seconds. Default: 16
  --storyline-candidate-count <n>
                                Storyline candidate count. Default: 3
  --skip-storyline-plan         Disable automatic storyline planning in the full flow
  --brand-tone <text>           Optional brand tone for storyline-only planning
  --creative-context <text>     Optional creative context for storyline-only planning
  --banned-claims <csv>         Optional banned claims for storyline-only planning
  --persona-brief <text>        Persona / styling brief for composite generation
  --composite-prompt <text>     Full composite prompt override
  --video-prompt <text>         Full video prompt override
  --message-spine <id>          QUESTION_PROOF_CHOICE | DETAIL_SILHOUETTE_DECISION
  --hook <text>                 Expected hook for review
  --message <text>              Expected message for review
  --proof-detail <text>         Expected single proof beat for review
  --viewer-takeaway <text>      Expected viewer takeaway for review
  --cta <text>                  Expected CTA for review
  --audience <text>             Expected audience for review
  --editorial-thesis <text>     Editorial frame thesis for prompts/review
  --talent-brief <text>         Talent direction brief for prompts/review
  --cta-mode <mode>             in-video | external-overlay. Default: external-overlay
  --review-backend <mode>       api | cli | cli-then-api. Default: api
  --run-name <label>            Optional run label
  --reference-directive <text>  Abstract structure cues appended to prompts
  --skip-review                 Generate composite and video without Gemini review
EOF
}

write_artifact_index() {
	local output_path="$1"
	local run_dir="$2"
	local composite_brief="$3"
	local video_brief="$4"
	local operator_brief="$5"
	local composite_image="$6"
	local video_output="$7"
	local review_brief="$8"
	local review_summary="$9"
	local calibration_summary_json="${10}"
	local calibration_summary_md="${11}"
	local storyline_prompt="${12}"
	local storyline_response="${13}"
	local storyline_json="${14}"
	local storyline_md="${15}"

	python3 - "$output_path" "$run_dir" "$composite_brief" "$video_brief" "$operator_brief" "$composite_image" "$video_output" "$review_brief" "$review_summary" "$calibration_summary_json" "$calibration_summary_md" "$storyline_prompt" "$storyline_response" "$storyline_json" "$storyline_md" <<'PY'
from pathlib import Path
import json
import sys

output_path = Path(sys.argv[1])
payload = {
    "runDir": sys.argv[2],
    "artifacts": {
        "compositeBrief": sys.argv[3],
        "videoBrief": sys.argv[4],
        "operatorBrief": sys.argv[5],
        "compositeImage": sys.argv[6],
        "videoOutput": sys.argv[7],
        "reviewBrief": sys.argv[8] or None,
        "reviewSummary": sys.argv[9] or None,
        "calibrationSummaryJson": sys.argv[10] or None,
        "calibrationSummaryMarkdown": sys.argv[11] or None,
        "storylinePrompt": sys.argv[12] or None,
        "storylineResponse": sys.argv[13] or None,
        "storylineJson": sys.argv[14] or None,
        "storylineMarkdown": sys.argv[15] or None,
    },
}
output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY
}

write_storyline_artifact_index() {
	local output_path="$1"
	local run_dir="$2"
	local prompt_path="$3"
	local response_path="$4"
	local storyline_json="$5"
	local storyline_md="$6"
	local source_image="$7"

	python3 - "$output_path" "$run_dir" "$prompt_path" "$response_path" "$storyline_json" "$storyline_md" "$source_image" <<'PY'
from pathlib import Path
import json
import sys

output_path = Path(sys.argv[1])
payload = {
    "runDir": sys.argv[2],
    "artifacts": {
        "storylinePrompt": sys.argv[3],
        "storylineResponse": sys.argv[4],
        "storylineJson": sys.argv[5],
        "storylineMarkdown": sys.argv[6],
        "sourceImage": sys.argv[7],
    },
}
output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY
}

build_storyline_creative_context() {
	if [[ -n "$CREATIVE_CONTEXT" ]]; then
		printf '%s' "$CREATIVE_CONTEXT"
		return
	fi

	printf '%s' "audience=${AUDIENCE} | editorialThesis=${EDITORIAL_THESIS} | talentDirection=${TALENT_BRIEF}"
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--)
			shift 1
			;;
		--image)
			PRODUCT_IMAGE="$2"
			shift 2
			;;
		--storyline-only)
			STORYLINE_ONLY=1
			shift 1
			;;
		--storyline-model)
			STORYLINE_MODEL="$2"
			shift 2
			;;
		--storyline-duration)
			STORYLINE_TARGET_DURATION_SECONDS="$2"
			shift 2
			;;
		--storyline-candidate-count)
			STORYLINE_CANDIDATE_COUNT="$2"
			shift 2
			;;
		--skip-storyline-plan)
			SKIP_STORYLINE_PLAN=1
			shift 1
			;;
		--brand-tone)
			BRAND_TONE="$2"
			shift 2
			;;
		--creative-context)
			CREATIVE_CONTEXT="$2"
			shift 2
			;;
		--banned-claims)
			BANNED_CLAIMS="$2"
			shift 2
			;;
		--persona-brief)
			PERSONA_BRIEF="$2"
			shift 2
			;;
		--composite-prompt)
			COMPOSITE_PROMPT="$2"
			shift 2
			;;
		--video-prompt)
			VIDEO_PROMPT="$2"
			shift 2
			;;
		--message-spine)
			MESSAGE_SPINE_ID="$2"
			MESSAGE_SPINE_SET=1
			shift 2
			;;
		--hook)
			HOOK="$2"
			HOOK_SET=1
			shift 2
			;;
		--message)
			MESSAGE="$2"
			MESSAGE_SET=1
			shift 2
			;;
		--proof-detail)
			PROOF_DETAIL="$2"
			PROOF_DETAIL_SET=1
			shift 2
			;;
		--viewer-takeaway)
			VIEWER_TAKEAWAY="$2"
			VIEWER_TAKEAWAY_SET=1
			shift 2
			;;
		--cta)
			CTA="$2"
			shift 2
			;;
		--audience)
			AUDIENCE="$2"
			shift 2
			;;
		--editorial-thesis)
			EDITORIAL_THESIS="$2"
			EDITORIAL_THESIS_SET=1
			shift 2
			;;
		--talent-brief)
			TALENT_BRIEF="$2"
			TALENT_BRIEF_SET=1
			shift 2
			;;
		--cta-mode)
			CTA_MODE="$2"
			shift 2
			;;
		--review-backend)
			REVIEW_BACKEND="$2"
			shift 2
			;;
		--run-name)
			RUN_NAME="$2"
			shift 2
			;;
		--reference-directive)
			REFERENCE_DIRECTIVE="$2"
			REFERENCE_DIRECTIVE_SET=1
			shift 2
			;;
		--skip-review)
			SKIP_REVIEW=1
			shift 1
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "Unknown argument: $1" >&2
			usage >&2
			exit 1
			;;
	esac
done

if [[ -z "$PRODUCT_IMAGE" ]]; then
	echo "--image is required" >&2
	usage >&2
	exit 1
fi

PRODUCT_IMAGE="$(python3 - "$PRODUCT_IMAGE" <<'PY'
from pathlib import Path
import sys

print(Path(sys.argv[1]).expanduser().resolve())
PY
)"

if [[ ! -f "$PRODUCT_IMAGE" ]]; then
	echo "Image not found: $PRODUCT_IMAGE" >&2
	exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
	set -a
	source "$ENV_FILE"
	set +a
fi

RUN_ID="$(date +%Y%m%d-%H%M%S)"
RUN_SLUG="$(printf '%s' "${RUN_NAME:-shortform-flow}" | tr '[:space:]/' '--' | tr -cd '[:alnum:]_-')"
if [[ -z "$RUN_SLUG" ]]; then
	RUN_SLUG="shortform-flow"
fi
RUN_OUT_DIR="$ROOT_DIR/artifacts/shortform-test-flow/${RUN_ID}-${RUN_SLUG}"
ARTIFACT_INDEX_PATH="$RUN_OUT_DIR/artifact-index.json"
mkdir -p "$RUN_OUT_DIR"

if [[ "$STORYLINE_ONLY" -eq 1 ]]; then
	STORYLINE_DIR="$RUN_OUT_DIR/storyline"
	STORYLINE_LOG="$STORYLINE_DIR/storyline-plan.log"
	mkdir -p "$STORYLINE_DIR"

	STORYLINE_CREATIVE_CONTEXT="$(build_storyline_creative_context)"

	STORYLINE_ARGS=(
		scripts/plan-photo-storyline.ts
		--image "$PRODUCT_IMAGE"
		--product-category FASHION
		--cta "$CTA"
		--model "$STORYLINE_MODEL"
		--target-duration-seconds "$STORYLINE_TARGET_DURATION_SECONDS"
		--candidate-count "$STORYLINE_CANDIDATE_COUNT"
		--creative-context "$STORYLINE_CREATIVE_CONTEXT"
		--out-dir "$STORYLINE_DIR"
	)

	if [[ -n "$RUN_NAME" ]]; then
		STORYLINE_ARGS+=(--run-name "$RUN_NAME")
	fi
	if [[ -n "$BRAND_TONE" ]]; then
		STORYLINE_ARGS+=(--brand-tone "$BRAND_TONE")
	fi
	if [[ -n "$BANNED_CLAIMS" ]]; then
		STORYLINE_ARGS+=(--banned-claims "$BANNED_CLAIMS")
	fi

	echo "== storyline planning =="
	pnpm --filter @1dragon/api exec tsx "${STORYLINE_ARGS[@]}" | tee "$STORYLINE_LOG"

	STORYLINE_PROMPT="$(awk -F'=' '/^storyline_prompt=/{print $2}' "$STORYLINE_LOG" | tail -n 1)"
	STORYLINE_RESPONSE="$(awk -F'=' '/^storyline_response=/{print $2}' "$STORYLINE_LOG" | tail -n 1)"
	STORYLINE_JSON="$(awk -F'=' '/^storyline_json=/{print $2}' "$STORYLINE_LOG" | tail -n 1)"
	STORYLINE_MD="$(awk -F'=' '/^storyline_md=/{print $2}' "$STORYLINE_LOG" | tail -n 1)"

	write_storyline_artifact_index \
		"$ARTIFACT_INDEX_PATH" \
		"$RUN_OUT_DIR" \
		"$STORYLINE_PROMPT" \
		"$STORYLINE_RESPONSE" \
		"$STORYLINE_JSON" \
		"$STORYLINE_MD" \
		"$PRODUCT_IMAGE"

	echo "shortform_run_dir=$RUN_OUT_DIR"
	echo "artifact_index=$ARTIFACT_INDEX_PATH"
	exit 0
fi

if [[ "$CTA_MODE" != "in-video" && "$CTA_MODE" != "external-overlay" ]]; then
	echo "Unsupported --cta-mode: $CTA_MODE" >&2
	exit 1
fi

if [[ "$SKIP_STORYLINE_PLAN" -eq 0 ]]; then
	STORYLINE_DIR="$RUN_OUT_DIR/storyline"
	STORYLINE_LOG="$STORYLINE_DIR/storyline-plan.log"
	mkdir -p "$STORYLINE_DIR"

	STORYLINE_CREATIVE_CONTEXT="$(build_storyline_creative_context)"

	STORYLINE_ARGS=(
		scripts/plan-photo-storyline.ts
		--image "$PRODUCT_IMAGE"
		--product-category FASHION
		--cta "$CTA"
		--model "$STORYLINE_MODEL"
		--target-duration-seconds "$STORYLINE_TARGET_DURATION_SECONDS"
		--candidate-count "$STORYLINE_CANDIDATE_COUNT"
		--creative-context "$STORYLINE_CREATIVE_CONTEXT"
		--out-dir "$STORYLINE_DIR"
	)

	if [[ -n "$RUN_NAME" ]]; then
		STORYLINE_ARGS+=(--run-name "$RUN_NAME")
	fi
	if [[ -n "$BRAND_TONE" ]]; then
		STORYLINE_ARGS+=(--brand-tone "$BRAND_TONE")
	fi
	if [[ -n "$BANNED_CLAIMS" ]]; then
		STORYLINE_ARGS+=(--banned-claims "$BANNED_CLAIMS")
	fi

	echo "== storyline planning =="
	pnpm --filter @1dragon/api exec tsx "${STORYLINE_ARGS[@]}" | tee "$STORYLINE_LOG"

	STORYLINE_PROMPT="$(awk -F'=' '/^storyline_prompt=/{print $2}' "$STORYLINE_LOG" | tail -n 1)"
	STORYLINE_RESPONSE="$(awk -F'=' '/^storyline_response=/{print $2}' "$STORYLINE_LOG" | tail -n 1)"
	STORYLINE_JSON="$(awk -F'=' '/^storyline_json=/{print $2}' "$STORYLINE_LOG" | tail -n 1)"
	STORYLINE_MD="$(awk -F'=' '/^storyline_md=/{print $2}' "$STORYLINE_LOG" | tail -n 1)"

	if [[ -n "$STORYLINE_JSON" && -f "$STORYLINE_JSON" ]]; then
		eval "$(
			python3 - "$STORYLINE_JSON" <<'PY'
from pathlib import Path
import json
import shlex
import sys

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
derived = payload.get("derivedShortform") or {}
fields = {
    "DERIVED_MESSAGE_SPINE_ID": derived.get("messageSpineId", ""),
    "DERIVED_HOOK": derived.get("hook", ""),
    "DERIVED_MESSAGE": derived.get("message", ""),
    "DERIVED_PROOF_DETAIL": derived.get("proofDetail", ""),
    "DERIVED_VIEWER_TAKEAWAY": derived.get("viewerTakeaway", ""),
    "DERIVED_EDITORIAL_THESIS": derived.get("editorialThesis", ""),
    "DERIVED_TALENT_BRIEF": derived.get("talentBrief", ""),
    "DERIVED_REFERENCE_DIRECTIVE": derived.get("referenceDirective", ""),
    "DERIVED_SCENARIO_SITUATION": derived.get("scenarioSituation", ""),
    "DERIVED_VISIBLE_ACTION": derived.get("visibleAction", ""),
    "DERIVED_HOOK_DIRECTION": derived.get("hookDirection", ""),
    "DERIVED_PROOF_DIRECTION": derived.get("proofDirection", ""),
    "DERIVED_PAYOFF_DIRECTION": derived.get("payoffDirection", ""),
    "DERIVED_SCENARIO_WRAPPER": derived.get("scenarioWrapper", ""),
    "DERIVED_PLACE_FRAME": derived.get("placeFrame", ""),
    "DERIVED_ACTION_FRAME": derived.get("actionFrame", ""),
    "DERIVED_MOMENT_FRAME": derived.get("momentFrame", ""),
    "DERIVED_PROOF_GOAL": derived.get("proofGoal", ""),
}
for key, value in fields.items():
    print(f"{key}={shlex.quote(str(value))}")
PY
		)"

		if [[ "$MESSAGE_SPINE_SET" -eq 0 && -n "${DERIVED_MESSAGE_SPINE_ID:-}" ]]; then
			MESSAGE_SPINE_ID="$DERIVED_MESSAGE_SPINE_ID"
		fi
		if [[ "$HOOK_SET" -eq 0 && -n "${DERIVED_HOOK:-}" ]]; then
			HOOK="$DERIVED_HOOK"
		fi
		if [[ "$MESSAGE_SET" -eq 0 && -n "${DERIVED_MESSAGE:-}" ]]; then
			MESSAGE="$DERIVED_MESSAGE"
		fi
		if [[ "$PROOF_DETAIL_SET" -eq 0 && -n "${DERIVED_PROOF_DETAIL:-}" ]]; then
			PROOF_DETAIL="$DERIVED_PROOF_DETAIL"
		fi
		if [[ "$VIEWER_TAKEAWAY_SET" -eq 0 && -n "${DERIVED_VIEWER_TAKEAWAY:-}" ]]; then
			VIEWER_TAKEAWAY="$DERIVED_VIEWER_TAKEAWAY"
		fi
		if [[ "$EDITORIAL_THESIS_SET" -eq 0 && -n "${DERIVED_EDITORIAL_THESIS:-}" ]]; then
			EDITORIAL_THESIS="$DERIVED_EDITORIAL_THESIS"
		fi
		if [[ "$TALENT_BRIEF_SET" -eq 0 && -n "${DERIVED_TALENT_BRIEF:-}" ]]; then
			TALENT_BRIEF="$DERIVED_TALENT_BRIEF"
		fi
		if [[ -n "${DERIVED_REFERENCE_DIRECTIVE:-}" ]]; then
			if [[ -n "$REFERENCE_DIRECTIVE" ]]; then
				REFERENCE_DIRECTIVE="${REFERENCE_DIRECTIVE}"$'\n\n'"Auto-derived scenario cues:"$'\n'"${DERIVED_REFERENCE_DIRECTIVE}"
			else
				REFERENCE_DIRECTIVE="$DERIVED_REFERENCE_DIRECTIVE"
			fi
		fi

			SCENARIO_WRAPPER="${DERIVED_SCENARIO_WRAPPER:-}"
			PLACE_FRAME="${DERIVED_PLACE_FRAME:-}"
			ACTION_FRAME="${DERIVED_ACTION_FRAME:-}"
			MOMENT_FRAME="${DERIVED_MOMENT_FRAME:-}"
			PROOF_GOAL="${DERIVED_PROOF_GOAL:-}"
			SCENARIO_SITUATION="${DERIVED_SCENARIO_SITUATION:-}"
			VISIBLE_ACTION="${DERIVED_VISIBLE_ACTION:-}"
			HOOK_DIRECTION="${DERIVED_HOOK_DIRECTION:-}"
			PROOF_DIRECTION="${DERIVED_PROOF_DIRECTION:-}"
			PAYOFF_DIRECTION="${DERIVED_PAYOFF_DIRECTION:-}"
		fi
fi

case "$MESSAGE_SPINE_ID" in
	QUESTION_PROOF_CHOICE)
		: "${PROOF_DETAIL:=한 번의 움직임으로 핏과 실루엣이 실제 착용에서 어떻게 읽히는지 보여준다.}"
		: "${VIEWER_TAKEAWAY:=$MESSAGE}"
		: "${EDITORIAL_THESIS:=질문으로 멈추고 한 장면의 증거로 답하는 절제된 서울 패션 에디토리얼 프레임.}"
		;;
	DETAIL_SILHOUETTE_DECISION)
		: "${PROOF_DETAIL:=시그니처 디테일에서 시작해 전신 실루엣으로 자연스럽게 확장한다.}"
		: "${VIEWER_TAKEAWAY:=$MESSAGE}"
		: "${EDITORIAL_THESIS:=디테일 클로즈업이 전신 실루엣 리드로 이어지는 정제된 패션 에디토리얼 프레임.}"
		;;
	*)
		echo "Unsupported --message-spine: $MESSAGE_SPINE_ID" >&2
		exit 1
		;;
esac

: "${SCENARIO_SITUATION:=inside a believable real-world fashion moment}"
: "${VISIBLE_ACTION:=She performs one natural garment-aware action, then lets the silhouette settle into a clean final read.}"
: "${HOOK_DIRECTION:=Open with the wearer already inside the action so the moment feels immediate.}"
: "${PROOF_DIRECTION:=Use one visible action to prove the garment claim instead of a generic pose loop.}"
: "${PAYOFF_DIRECTION:=End in a clean full-body silhouette with restrained movement and safe overlay space.}"

if [[ -z "$COMPOSITE_PROMPT" ]]; then
	COMPOSITE_PROMPT="$(cat <<EOF
Edit this source fashion product image into a photorealistic wearer-first composite.
Preserve the garment identity exactly: same pattern, color palette, silhouette, neckline, sleeves, and construction details.
One real adult woman must wear the exact garment.
The wearer must be anonymous and must not resemble any celebrity, public figure, or recognizable influencer.
Message spine: ${MESSAGE_SPINE_ID}
Message intent:
- hook: ${HOOK}
- message: ${MESSAGE}
- proof detail: ${PROOF_DETAIL}
- viewer takeaway: ${VIEWER_TAKEAWAY}
Scenario brief:
- scenario wrapper: ${SCENARIO_WRAPPER:-UNSPECIFIED}
- place frame: ${PLACE_FRAME:-UNSPECIFIED}
- action frame: ${ACTION_FRAME:-UNSPECIFIED}
- moment frame: ${MOMENT_FRAME:-UNSPECIFIED}
- proof goal: ${PROOF_GOAL:-UNSPECIFIED}
- situation: ${SCENARIO_SITUATION}
- visible action: ${VISIBLE_ACTION}
Editorial brief:
- thesis: ${EDITORIAL_THESIS}
Talent brief:
- ${TALENT_BRIEF}
- ${PERSONA_BRIEF}
Avoid:
- mannequin or product-only frame
- duplicate clothing
- generic catalog smile
- doll-like skin smoothing
- influencer-template posing
- static mannequin-like sway
- irrelevant luxury props
- styling that overwhelms the garment
- named-brand imitation
- celebrity likeness or public-figure resemblance
EOF
)"
	if [[ -n "$REFERENCE_DIRECTIVE" ]]; then
		COMPOSITE_PROMPT="${COMPOSITE_PROMPT}"$'\n'"Reference-conditioned structure cues:"$'\n'"${REFERENCE_DIRECTIVE}"$'\n'"Use these cues as abstract structure only. Do not copy captions, layouts, creator identity, or branded assets."
	fi
	if [[ "$CTA_MODE" == "external-overlay" ]]; then
		COMPOSITE_PROMPT="${COMPOSITE_PROMPT}"$'\n'"Text policy:"$'\n'"- Leave clean negative space only for later post-production overlay."$'\n'"- Do not render any visible text, subtitles, captions, CTA buttons, price tags, lower-thirds, black text bars, logos, labels, or signage anywhere in-frame."
	else
		COMPOSITE_PROMPT="${COMPOSITE_PROMPT}"$'\n'"Text policy:"$'\n'"- Do not render random letters, gibberish text, irrelevant signage, or extra captions before the intended CTA close."
	fi
	COMPOSITE_PROMPT="${COMPOSITE_PROMPT}"$'\n'"Keep the composition vertical and suitable for short-form ad generation."
fi

if [[ -z "$VIDEO_PROMPT" ]]; then
	CTA_CLOSE="leave clean safe space for an external CTA overlay"
	TEXT_POLICY_LINE_1="- Leave clean negative space only for a later external overlay."
	TEXT_POLICY_LINE_2="- Do not render any burned-in text, subtitles, captions, CTA buttons, price tags, lower-thirds, black text bars, logos, labels, or signage anywhere in the video."
	if [[ "$CTA_MODE" == "in-video" ]]; then
		CTA_CLOSE="end with the CTA '${CTA}' clearly visible in-frame"
		TEXT_POLICY_LINE_1="- Only the intended CTA may appear in the payoff frame."
		TEXT_POLICY_LINE_2="- Do not generate random letters, gibberish text, extra subtitles, duplicate CTAs, logos, labels, or unrelated signage."
	fi
	VIDEO_PROMPT="$(cat <<EOF
Create an 8-second vertical ecommerce fashion ad from this exact composite image.
Keep the same wearer and the same garment identity in every frame.
The opening frame must already contain the wearer. Never cut back to product-only or mannequin-only imagery.
The wearer must remain an anonymous non-celebrity adult and must not resemble any celebrity, public figure, or recognizable influencer.
The beat structure must fit 8 seconds exactly.
Frame 0 must look like the source composite brought to life, not a redesigned reinterpretation.
Frame 1 must be a direct temporal continuation of frame 0 with the same face, hair, garment placement, and scene layout.
Do not change the person, restyle the outfit, or jump to a different background interpretation between the opening frames.
Message spine: ${MESSAGE_SPINE_ID}
Expected brief:
- hook: ${HOOK}
- message: ${MESSAGE}
- proof detail: ${PROOF_DETAIL}
- viewer takeaway: ${VIEWER_TAKEAWAY}
- editorial thesis: ${EDITORIAL_THESIS}
- talent direction: ${TALENT_BRIEF}
Scenario brief:
- scenario wrapper: ${SCENARIO_WRAPPER:-UNSPECIFIED}
- place frame: ${PLACE_FRAME:-UNSPECIFIED}
- action frame: ${ACTION_FRAME:-UNSPECIFIED}
- moment frame: ${MOMENT_FRAME:-UNSPECIFIED}
- proof goal: ${PROOF_GOAL:-UNSPECIFIED}
- situation: ${SCENARIO_SITUATION}
- visible action: ${VISIBLE_ACTION}
Shot plan:
1. Hook frame: ${HOOK_DIRECTION}
2. Proof frame: ${PROOF_DIRECTION}
3. Payoff frame: ${PAYOFF_DIRECTION} Also ${CTA_CLOSE}.
Editorial rules:
- disciplined color palette with the garment as the hero
- framing that preserves silhouette readability and overlay-safe space
- blocking that does not hide the garment line
- measured gaze and restrained styling
- premium realistic fashion-commercial lighting and believable face/hands
- Static mannequin-like sway is invalid.
- The action must feel like a believable human moment in the chosen scenario, not a catalog loop.
- Preserve early-frame continuity: motion should come from the body and camera, not from re-casting or re-styling the wearer.
Text policy:
${TEXT_POLICY_LINE_1}
${TEXT_POLICY_LINE_2}
EOF
)"
	if [[ -n "$REFERENCE_DIRECTIVE" ]]; then
		VIDEO_PROMPT="${VIDEO_PROMPT}"$'\n'"Reference-conditioned structure cues:"$'\n'"${REFERENCE_DIRECTIVE}"$'\n'"Use these cues as abstract structure only. Do not copy captions, layouts, creator identity, or branded assets."
	fi
fi

REVIEW_OUT_DIR="$RUN_OUT_DIR/review-loop"
COMPOSITE_BRIEF_PATH="$RUN_OUT_DIR/composite-brief.txt"
VIDEO_BRIEF_PATH="$RUN_OUT_DIR/video-brief.txt"
OPERATOR_BRIEF_PATH="$RUN_OUT_DIR/operator-brief.json"
REVIEW_BRIEF_PATH="$REVIEW_OUT_DIR/review-brief.json"
mkdir -p "$RUN_OUT_DIR" "$REVIEW_OUT_DIR"

printf '%s\n' "$COMPOSITE_PROMPT" > "$COMPOSITE_BRIEF_PATH"
printf '%s\n' "$VIDEO_PROMPT" > "$VIDEO_BRIEF_PATH"

python3 - "$OPERATOR_BRIEF_PATH" "$PRODUCT_IMAGE" "$MESSAGE_SPINE_ID" "$HOOK" "$MESSAGE" "$PROOF_DETAIL" "$VIEWER_TAKEAWAY" "$CTA" "$AUDIENCE" "$EDITORIAL_THESIS" "$TALENT_BRIEF" "$PERSONA_BRIEF" "$CTA_MODE" "$REVIEW_BACKEND" "$REFERENCE_DIRECTIVE" "$SCENARIO_WRAPPER" "$PLACE_FRAME" "$ACTION_FRAME" "$MOMENT_FRAME" "$PROOF_GOAL" "$SCENARIO_SITUATION" "$VISIBLE_ACTION" "$HOOK_DIRECTION" "$PROOF_DIRECTION" "$PAYOFF_DIRECTION" "$COMPOSITE_BRIEF_PATH" "$VIDEO_BRIEF_PATH" "$REVIEW_OUT_DIR" <<'PY'
from pathlib import Path
import json
import sys

output_path = Path(sys.argv[1])
payload = {
    "productImage": sys.argv[2],
    "messageSpineId": sys.argv[3],
    "hook": sys.argv[4],
    "message": sys.argv[5],
    "proofDetail": sys.argv[6],
    "viewerTakeaway": sys.argv[7],
    "cta": sys.argv[8],
    "audience": sys.argv[9],
    "editorialThesis": sys.argv[10],
    "talentBrief": sys.argv[11],
    "personaBrief": sys.argv[12],
    "ctaMode": sys.argv[13],
    "reviewBackend": sys.argv[14],
    "referenceDirective": sys.argv[15],
    "scenarioWrapper": sys.argv[16] or None,
    "placeFrame": sys.argv[17] or None,
    "actionFrame": sys.argv[18] or None,
    "momentFrame": sys.argv[19] or None,
    "proofGoal": sys.argv[20] or None,
    "scenarioSituation": sys.argv[21] or None,
    "visibleAction": sys.argv[22] or None,
    "hookDirection": sys.argv[23] or None,
    "proofDirection": sys.argv[24] or None,
    "payoffDirection": sys.argv[25] or None,
    "artifactPaths": {
        "compositeBrief": sys.argv[26],
        "videoBrief": sys.argv[27],
        "reviewOutDir": sys.argv[28],
    },
}
output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY

TMP_DIR="$(mktemp -d)"
cleanup() {
	rm -rf "$TMP_DIR"
}
trap cleanup EXIT

COMPOSITE_LOG="$TMP_DIR/composite.log"
VIDEO_LOG="$TMP_DIR/video.log"
REVIEW_LOG="$TMP_DIR/review.log"

COMPOSITE_RUN_NAME="${RUN_NAME:-shortform-flow}-composite"
VIDEO_RUN_NAME="${RUN_NAME:-shortform-flow}-video"

echo "== composite generation =="
pnpm --filter @1dragon/api smoke:gemini:composite -- \
	--image "$PRODUCT_IMAGE" \
	--run-name "$COMPOSITE_RUN_NAME" \
	--prompt "$COMPOSITE_PROMPT" | tee "$COMPOSITE_LOG"

COMPOSITE_PATH="$(awk -F': ' '/^composite: /{print $2}' "$COMPOSITE_LOG" | tail -n 1)"
if [[ -z "$COMPOSITE_PATH" || ! -f "$COMPOSITE_PATH" ]]; then
	echo "Failed to resolve composite image path from composite step" >&2
	exit 1
fi

echo ""
echo "== video generation =="
pnpm --filter @1dragon/api smoke:gemini:video -- \
	--image "$COMPOSITE_PATH" \
	--duration-seconds 8 \
	--aspect-ratio 9:16 \
	--run-name "$VIDEO_RUN_NAME" \
	--prompt "$VIDEO_PROMPT" | tee "$VIDEO_LOG"

VIDEO_PATH="$(awk -F': ' '/^video: /{print $2}' "$VIDEO_LOG" | sed 's/ ([^)]*)$//' | tail -n 1)"
if [[ -z "$VIDEO_PATH" || ! -f "$VIDEO_PATH" ]]; then
	echo "Failed to resolve video path from video step" >&2
	exit 1
fi

echo ""
echo "composite_image=$COMPOSITE_PATH"
echo "video_output=$VIDEO_PATH"

if [[ "$SKIP_REVIEW" -eq 1 ]]; then
	write_artifact_index \
		"$ARTIFACT_INDEX_PATH" \
		"$RUN_OUT_DIR" \
		"$COMPOSITE_BRIEF_PATH" \
		"$VIDEO_BRIEF_PATH" \
		"$OPERATOR_BRIEF_PATH" \
		"$COMPOSITE_PATH" \
		"$VIDEO_PATH" \
		"" \
		"" \
		"" \
		"" \
		"${STORYLINE_PROMPT:-}" \
		"${STORYLINE_RESPONSE:-}" \
		"${STORYLINE_JSON:-}" \
		"${STORYLINE_MD:-}"
	echo "shortform_run_dir=$RUN_OUT_DIR"
	echo "artifact_index=$ARTIFACT_INDEX_PATH"
	exit 0
fi

echo ""
echo "== ad review =="
REVIEW_ARGS=(
	--env-file "$ROOT_DIR/.env.test"
	--image "$PRODUCT_IMAGE"
	--videos "$VIDEO_PATH"
	--iterations 1
	--review-backend "$REVIEW_BACKEND"
	--out-dir "$REVIEW_OUT_DIR"
	--message-spine "$MESSAGE_SPINE_ID"
	--hook "$HOOK"
	--message "$MESSAGE"
	--proof-detail "$PROOF_DETAIL"
	--viewer-takeaway "$VIEWER_TAKEAWAY"
	--cta "$CTA"
	--audience "$AUDIENCE"
	--editorial-thesis "$EDITORIAL_THESIS"
	--talent-brief "$TALENT_BRIEF"
	--cta-mode "$CTA_MODE"
)

pnpm media:review:gemini -- "${REVIEW_ARGS[@]}" | tee "$REVIEW_LOG"

SUMMARY_JSON="$(awk -F'=' '/^summary_json=/{print $2}' "$REVIEW_LOG" | tail -n 1)"
if [[ -n "$SUMMARY_JSON" ]]; then
	echo "review_summary=$SUMMARY_JSON"
fi

CALIBRATION_JSON="$(awk -F'=' '/^calibration_summary_json=/{print $2}' "$REVIEW_LOG" | tail -n 1)"
if [[ -n "$CALIBRATION_JSON" ]]; then
	echo "calibration_summary=$CALIBRATION_JSON"
fi

CALIBRATION_MD="$(awk -F'=' '/^calibration_summary_md=/{print $2}' "$REVIEW_LOG" | tail -n 1)"
if [[ -n "$CALIBRATION_MD" ]]; then
	echo "calibration_summary_md=$CALIBRATION_MD"
fi

write_artifact_index \
	"$ARTIFACT_INDEX_PATH" \
	"$RUN_OUT_DIR" \
	"$COMPOSITE_BRIEF_PATH" \
	"$VIDEO_BRIEF_PATH" \
	"$OPERATOR_BRIEF_PATH" \
	"$COMPOSITE_PATH" \
	"$VIDEO_PATH" \
	"$REVIEW_BRIEF_PATH" \
	"${SUMMARY_JSON:-}" \
	"${CALIBRATION_JSON:-}" \
	"${CALIBRATION_MD:-}" \
	"${STORYLINE_PROMPT:-}" \
	"${STORYLINE_RESPONSE:-}" \
	"${STORYLINE_JSON:-}" \
	"${STORYLINE_MD:-}"

echo "shortform_run_dir=$RUN_OUT_DIR"
echo "artifact_index=$ARTIFACT_INDEX_PATH"
if [[ -f "$REVIEW_BRIEF_PATH" ]]; then
	echo "review_brief=$REVIEW_BRIEF_PATH"
fi
