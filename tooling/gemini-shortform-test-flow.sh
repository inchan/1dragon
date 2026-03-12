#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
ENV_FILE="$ROOT_DIR/.env.test"
PRODUCT_IMAGE=""
PERSONA_BRIEF="A real adult woman wearing the exact garment in a premium boutique studio, full body, confident pose."
COMPOSITE_PROMPT=""
VIDEO_PROMPT=""
HOOK="첫 장면부터 시선 정지"
MESSAGE="핏과 실루엣이 바로 보이는 원피스"
CTA="지금 코디 확인"
AUDIENCE="여성 패션 숏폼 시청자"
CTA_MODE="external-overlay"
REVIEW_BACKEND="api"
RUN_NAME=""
SKIP_REVIEW=0

usage() {
	cat <<'EOF'
Usage:
  tooling/gemini-shortform-test-flow.sh --image <product-image> [options]

Options:
  --image <path>                Local product image path (required)
  --persona-brief <text>        Persona / styling brief for composite generation
  --composite-prompt <text>     Full composite prompt override
  --video-prompt <text>         Full video prompt override
  --hook <text>                 Expected hook for review
  --message <text>              Expected message for review
  --cta <text>                  Expected CTA for review
  --audience <text>             Expected audience for review
  --cta-mode <mode>             in-video | external-overlay. Default: external-overlay
  --review-backend <mode>       api | cli | cli-then-api. Default: api
  --run-name <label>            Optional run label
  --skip-review                 Generate composite and video without Gemini review
EOF
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
		--hook)
			HOOK="$2"
			shift 2
			;;
		--message)
			MESSAGE="$2"
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

if [[ -f "$ENV_FILE" ]]; then
	set -a
	source "$ENV_FILE"
	set +a
fi

if [[ "$CTA_MODE" != "in-video" && "$CTA_MODE" != "external-overlay" ]]; then
	echo "Unsupported --cta-mode: $CTA_MODE" >&2
	exit 1
fi

if [[ -z "$COMPOSITE_PROMPT" ]]; then
	COMPOSITE_PROMPT="Edit this source fashion product image into a photorealistic wearer-first composite. Preserve the garment identity exactly: same pattern, color palette, silhouette, neckline, sleeves, and construction details. One real adult woman must wear the exact garment. No mannequin, no floating garment, no product-only frame, no duplicate clothing. Keep the composition vertical and suitable for short-form ad generation. ${PERSONA_BRIEF}"
fi

if [[ -z "$VIDEO_PROMPT" ]]; then
	VIDEO_PROMPT="Create an 8-second vertical ecommerce fashion ad from this exact composite image. Keep the same wearer and the same garment identity in every frame. The opening frame must already contain the wearer. Never cut back to product-only or mannequin-only imagery. Ad structure: 0-2 seconds hook with confident entrance, 2-6 seconds proof with natural walking, turning, and fit demonstration, 6-8 seconds payoff hero pose with clean safe space for an external CTA overlay. Premium realistic fashion commercial, believable face and hands, smooth body motion, polished lighting, no text, no letters, no subtitles, no logos, no random signage."
		if [[ "$CTA_MODE" == "in-video" ]]; then
			VIDEO_PROMPT="Create an 8-second vertical ecommerce fashion ad from this exact composite image. Keep the same wearer and the same garment identity in every frame. The opening frame must already contain the wearer. Never cut back to product-only or mannequin-only imagery. Ad structure: 0-2 seconds hook with confident entrance, 2-6 seconds proof with natural walking, turning, and fit demonstration, 6-8 seconds payoff hero pose with the CTA '${CTA}' clearly visible at the end. Premium realistic fashion commercial, believable face and hands, smooth body motion, polished lighting, no random letters, no gibberish text, no logos, no random signage."
		fi
fi

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
	--hook "$HOOK"
	--message "$MESSAGE"
	--cta "$CTA"
	--audience "$AUDIENCE"
	--cta-mode "$CTA_MODE"
)

pnpm media:review:gemini -- "${REVIEW_ARGS[@]}" | tee "$REVIEW_LOG"

SUMMARY_JSON="$(awk -F'=' '/^summary_json=/{print $2}' "$REVIEW_LOG" | tail -n 1)"
if [[ -n "$SUMMARY_JSON" ]]; then
	echo "review_summary=$SUMMARY_JSON"
fi
