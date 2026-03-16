#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.test"
VIDEO_DIR="$ROOT_DIR/apps/api/scripts/output"
MODEL="gemini-2.5-flash"
REVIEW_BACKEND="api"
ITERATIONS=5
IMAGE_PATH=""
VIDEOS_ARG=""
OUT_DIR=""
AD_HOOK=""
AD_MESSAGE=""
MESSAGE_SPINE_ID=""
PROOF_DETAIL=""
VIEWER_TAKEAWAY=""
AD_CTA=""
AD_AUDIENCE=""
EDITORIAL_THESIS=""
TALENT_BRIEF=""
CTA_MODE="in-video"
REQUIRE_HUMAN="true"
REQUIRE_OPENING_WEARER="true"
REQUIRE_ACTIVE_DEMO="true"
REQUIRE_STORY="true"
REQUIRE_MESSAGE="true"
REQUIRE_CTA="true"
CLI_AVAILABLE=0
REVIEW_API_KEY=""

usage() {
	cat <<'EOF'
Usage:
  tooling/gemini-video-review-loop.sh --image <source-image> [options]

Options:
  --env-file <path>              Env file to source. Default: .env.test
  --video-dir <dir>              Directory to scan for candidate videos
  --videos <comma-list>          Explicit candidate video paths or basenames
  --iterations <n>               Number of videos to review. Default: 5
  --model <name>                 Gemini reviewer model. Default: gemini-2.5-flash
  --review-backend <mode>        api | cli | cli-then-api. Default: api
  --out-dir <dir>                Output directory
  --message-spine <id>          QUESTION_PROOF_CHOICE | DETAIL_SILHOUETTE_DECISION
  --hook <text>                  Expected hook for the ad brief
  --message <text>               Expected message / benefit for the ad brief
  --proof-detail <text>          Expected single proof beat
  --viewer-takeaway <text>       Expected viewer takeaway
  --cta <text>                   Expected CTA for the ad brief
  --audience <text>              Expected audience for the ad brief
  --editorial-thesis <text>      Editorial thesis for the run
  --talent-brief <text>          Talent direction brief for the run
  --cta-mode <mode>              in-video | external-overlay. Default: in-video
  --allow-no-human               Do not require visible person / wearer
  --allow-product-only-opening   Do not require a visible wearer in the opening frame
  --allow-passive-demo           Do not require active demonstration
  --allow-no-story               Do not require story progression
  --allow-no-message             Do not require explicit message clarity
  --allow-no-cta                 Do not require CTA presence

Examples:
  tooling/gemini-video-review-loop.sh --image /tmp/fashion-001.png
  tooling/gemini-video-review-loop.sh --image /tmp/fashion-001.png --videos a.mp4,b.mp4,c.mp4
  tooling/gemini-video-review-loop.sh --image /tmp/fashion-001.png --review-backend cli-then-api --message-spine QUESTION_PROOF_CHOICE --hook "첫 장면부터 시선 정지" --message "체형 보정 핏" --proof-detail "한 번의 움직임으로 핏을 증명" --viewer-takeaway "핏이 또렷한 원피스" --cta "지금 코디 확인"
EOF
}

resolve_review_backends() {
	case "$REVIEW_BACKEND" in
		api)
			printf '%s\n' api
			;;
		cli)
			printf '%s\n' cli
			;;
		cli-then-api)
			printf '%s\n' cli api
			;;
		*)
			echo "Unsupported review backend: $REVIEW_BACKEND" >&2
			exit 1
			;;
	esac
}

run_api_review() {
	local payload_json="$1"
	local raw_response="$2"
	curl -sS \
		-X POST \
		-H "Content-Type: application/json" \
		--data-binary "@$payload_json" \
		"https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${REVIEW_API_KEY}" \
		> "$raw_response"
}

run_cli_review() {
	local prompt_file="$1"
	local raw_response="$2"
	local stderr_log="$3"
	gemini \
		-p "$(cat "$prompt_file")" \
		--model "$MODEL" \
		--output-format text \
		--approval-mode plan \
		> "$raw_response" \
		2> "$stderr_log"
}

collect_videos() {
	if [[ -n "$VIDEOS_ARG" ]]; then
		IFS=',' read -r -a INPUT_VIDEOS <<<"$VIDEOS_ARG"
		for item in "${INPUT_VIDEOS[@]}"; do
			local trimmed
			trimmed="$(echo "$item" | xargs)"
			if [[ -z "$trimmed" ]]; then
				continue
			fi
			if [[ "$trimmed" = /* ]]; then
				printf '%s\n' "$trimmed"
			else
				printf '%s\n' "$VIDEO_DIR/$trimmed"
			fi
		done
		return
	fi

	python3 - "$VIDEO_DIR" "$ITERATIONS" <<'PY'
from pathlib import Path
import sys

video_dir = Path(sys.argv[1])
limit = int(sys.argv[2])
videos = sorted(
    [p for p in video_dir.glob("*.mp4") if p.is_file()],
    key=lambda p: (p.stat().st_mtime, p.name),
    reverse=True,
)
for path in videos[:limit]:
    print(path)
PY
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--)
			shift 1
			;;
		--env-file)
			ENV_FILE="$2"
			shift 2
			;;
		--video-dir)
			VIDEO_DIR="$2"
			shift 2
			;;
		--videos)
			VIDEOS_ARG="$2"
			shift 2
			;;
		--iterations)
			ITERATIONS="$2"
			shift 2
			;;
		--model)
			MODEL="$2"
			shift 2
			;;
		--review-backend)
			REVIEW_BACKEND="$2"
			shift 2
			;;
		--image)
			IMAGE_PATH="$2"
			shift 2
			;;
		--out-dir)
			OUT_DIR="$2"
			shift 2
			;;
		--message-spine)
			MESSAGE_SPINE_ID="$2"
			shift 2
			;;
		--hook)
			AD_HOOK="$2"
			shift 2
			;;
		--message)
			AD_MESSAGE="$2"
			shift 2
			;;
		--proof-detail)
			PROOF_DETAIL="$2"
			shift 2
			;;
		--viewer-takeaway)
			VIEWER_TAKEAWAY="$2"
			shift 2
			;;
		--cta)
			AD_CTA="$2"
			shift 2
			;;
		--audience)
			AD_AUDIENCE="$2"
			shift 2
			;;
		--editorial-thesis)
			EDITORIAL_THESIS="$2"
			shift 2
			;;
		--talent-brief)
			TALENT_BRIEF="$2"
			shift 2
			;;
		--cta-mode)
			CTA_MODE="$2"
			shift 2
			;;
		--allow-no-human)
			REQUIRE_HUMAN="false"
			shift 1
			;;
		--allow-product-only-opening)
			REQUIRE_OPENING_WEARER="false"
			shift 1
			;;
		--allow-passive-demo)
			REQUIRE_ACTIVE_DEMO="false"
			shift 1
			;;
		--allow-no-story)
			REQUIRE_STORY="false"
			shift 1
			;;
		--allow-no-message)
			REQUIRE_MESSAGE="false"
			shift 1
			;;
		--allow-no-cta)
			REQUIRE_CTA="false"
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

if [[ -z "$IMAGE_PATH" ]]; then
	echo "--image is required" >&2
	usage >&2
	exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Env file not found: $ENV_FILE" >&2
	exit 1
fi

if [[ ! -f "$IMAGE_PATH" ]]; then
	echo "Source image not found: $IMAGE_PATH" >&2
	exit 1
fi

set -a
source "$ENV_FILE"
set +a

if command -v gemini >/dev/null 2>&1; then
	CLI_AVAILABLE=1
fi

REVIEW_API_KEY="${GEMINI_API_KEY:-${GEMINI_VEO_API_KEY:-}}"

if [[ "$REVIEW_BACKEND" == "cli" && "$CLI_AVAILABLE" -ne 1 ]]; then
	echo "Gemini CLI is not available for --review-backend cli" >&2
	exit 1
fi

if [[ "$REVIEW_BACKEND" == "cli-then-api" && "$CLI_AVAILABLE" -ne 1 ]]; then
	echo "Gemini CLI is not available; falling back to API reviewer only" >&2
	REVIEW_BACKEND="api"
fi

if [[ "$REVIEW_BACKEND" == "api" || "$REVIEW_BACKEND" == "cli-then-api" ]]; then
	if [[ -z "$REVIEW_API_KEY" ]]; then
		echo "GEMINI_API_KEY or GEMINI_VEO_API_KEY is required for API review backend" >&2
		exit 1
	fi
fi

if [[ "$CTA_MODE" == "external-overlay" ]]; then
	REQUIRE_CTA="false"
elif [[ "$CTA_MODE" != "in-video" ]]; then
	echo "Unsupported CTA mode: $CTA_MODE" >&2
	exit 1
fi

if [[ -n "$MESSAGE_SPINE_ID" ]]; then
	case "$MESSAGE_SPINE_ID" in
		QUESTION_PROOF_CHOICE|DETAIL_SILHOUETTE_DECISION)
			;;
		*)
			echo "Unsupported message spine: $MESSAGE_SPINE_ID" >&2
			exit 1
			;;
	esac
fi

RUN_ID="$(date +%Y%m%d-%H%M%S)"
if [[ -z "$OUT_DIR" ]]; then
	OUT_DIR="$ROOT_DIR/artifacts/gemini-review-loop/$RUN_ID"
fi
mkdir -p "$OUT_DIR"

case "$IMAGE_PATH" in
	*.*)
		SOURCE_IMAGE_COPY="$OUT_DIR/source-image.${IMAGE_PATH##*.}"
		;;
	*)
		SOURCE_IMAGE_COPY="$OUT_DIR/source-image"
		;;
esac
cp "$IMAGE_PATH" "$SOURCE_IMAGE_COPY"

STAGE_CLASSIFICATION_JSON="$OUT_DIR/stage-classification.json"
STAGE_CLASSIFICATION_MD="$OUT_DIR/stage-classification.md"

TMP_DIR="$(mktemp -d)"
cleanup() {
	rm -rf "$TMP_DIR"
}
trap cleanup EXIT

VIDEOS=()
while IFS= read -r video_path; do
	if [[ -n "$video_path" ]]; then
		VIDEOS+=("$video_path")
	fi
done < <(collect_videos)

if [[ "${#VIDEOS[@]}" -lt "$ITERATIONS" ]]; then
	echo "Need at least $ITERATIONS videos, found ${#VIDEOS[@]}" >&2
	exit 1
fi

VIDEOS=("${VIDEOS[@]:0:$ITERATIONS}")

RUN_MANIFEST_JSON="$OUT_DIR/run-manifest.json"
python3 - "$RUN_MANIFEST_JSON" "$IMAGE_PATH" "$SOURCE_IMAGE_COPY" "$MODEL" "$ITERATIONS" "$REVIEW_BACKEND" "$MESSAGE_SPINE_ID" "$AD_HOOK" "$AD_MESSAGE" "$PROOF_DETAIL" "$VIEWER_TAKEAWAY" "$AD_CTA" "$AD_AUDIENCE" "$EDITORIAL_THESIS" "$TALENT_BRIEF" "$CTA_MODE" "$REQUIRE_HUMAN" "$REQUIRE_OPENING_WEARER" "$REQUIRE_ACTIVE_DEMO" "$REQUIRE_STORY" "$REQUIRE_MESSAGE" "$REQUIRE_CTA" "${VIDEOS[@]}" <<'PY_MANIFEST'
from pathlib import Path
import json
import sys

manifest_path = Path(sys.argv[1])
source_image = sys.argv[2]
source_image_copy = sys.argv[3]
model = sys.argv[4]
iterations = int(sys.argv[5])
review_backend = sys.argv[6]
message_spine_id = sys.argv[7]
hook = sys.argv[8]
message = sys.argv[9]
proof_detail = sys.argv[10]
viewer_takeaway = sys.argv[11]
cta = sys.argv[12]
audience = sys.argv[13]
editorial_thesis = sys.argv[14]
talent_brief = sys.argv[15]
cta_mode = sys.argv[16]
require_human = sys.argv[17] == "true"
require_opening_wearer = sys.argv[18] == "true"
require_active_demo = sys.argv[19] == "true"
require_story = sys.argv[20] == "true"
require_message = sys.argv[21] == "true"
require_cta = sys.argv[22] == "true"
videos = sys.argv[23:]

manifest = {
    "sourceImagePath": source_image,
    "sourceImageCopyPath": source_image_copy,
    "model": model,
    "reviewBackend": review_backend,
    "iterationTarget": iterations,
    "adBrief": {
        "messageSpineId": message_spine_id,
        "hook": hook,
        "message": message,
        "proofDetail": proof_detail,
        "viewerTakeaway": viewer_takeaway,
        "cta": cta,
        "audience": audience,
        "editorialThesis": editorial_thesis,
        "talentBrief": talent_brief,
        "ctaMode": cta_mode,
    },
    "requiredChecks": {
        "human_present": require_human,
        "opening_has_wearer": require_opening_wearer,
        "opening_continuity": True,
        "active_demonstration": require_active_demo,
        "story_present": require_story,
        "message_present": require_message,
        "message_legibility": require_message,
        "silhouette_readability": True,
        "cta_present": require_cta,
        "product_truth_pass": True,
    },
    "videos": videos,
}
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY_MANIFEST

REVIEW_BRIEF_JSON="$OUT_DIR/review-brief.json"
REVIEW_BRIEF_MD="$OUT_DIR/review-brief.md"
python3 - "$RUN_MANIFEST_JSON" "$REVIEW_BRIEF_JSON" "$REVIEW_BRIEF_MD" <<'PY_REVIEW_BRIEF'
from pathlib import Path
import json
import sys

manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
review_brief = {
    "adBrief": manifest.get("adBrief", {}),
    "requiredChecks": manifest.get("requiredChecks", {}),
    "sourceImagePath": manifest.get("sourceImagePath"),
    "reviewBackend": manifest.get("reviewBackend"),
    "iterationTarget": manifest.get("iterationTarget"),
    "videos": manifest.get("videos", []),
}

Path(sys.argv[2]).write_text(
    json.dumps(review_brief, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)

lines = [
    "# Review Brief",
    "",
    "## Ad Brief",
]
for key, value in review_brief["adBrief"].items():
    lines.append(f"- {key}: {value or 'unspecified'}")

lines.extend(["", "## Required Checks"])
for key, value in review_brief["requiredChecks"].items():
    lines.append(f"- {key}: {value}")

lines.extend(["", "## Inputs"])
lines.append(f"- sourceImagePath: {review_brief['sourceImagePath']}")
lines.append(f"- reviewBackend: {review_brief['reviewBackend']}")
lines.append(f"- iterationTarget: {review_brief['iterationTarget']}")
for video in review_brief["videos"]:
    lines.append(f"- video: {video}")

Path(sys.argv[3]).write_text("\n".join(lines) + "\n", encoding="utf-8")
PY_REVIEW_BRIEF

python3 - "$STAGE_CLASSIFICATION_JSON" "$STAGE_CLASSIFICATION_MD" "$REVIEW_BACKEND" "$CLI_AVAILABLE" <<'PY_CLASSIFICATION'
from pathlib import Path
import json
import os
import socket
import sys
from urllib.parse import urlparse

classification_json = Path(sys.argv[1])
classification_md = Path(sys.argv[2])
review_backend = sys.argv[3]
cli_available = sys.argv[4] == "1"

required_full_stack = [
    "DATABASE_URL",
    "REDIS_URL",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "S3_BUCKET",
    "SESSION_COOKIE",
]
missing = [key for key in required_full_stack if not os.environ.get(key)]


def endpoint_from_env(name: str):
    value = os.environ.get(name)
    if not value:
        return None
    parsed = urlparse(value)
    if name == "DATABASE_URL":
        return {
            "name": name,
            "host": parsed.hostname,
            "port": parsed.port or 5432,
        }
    if name == "REDIS_URL":
        return {
            "name": name,
            "host": parsed.hostname,
            "port": parsed.port or 6379,
        }
    if name == "S3_ENDPOINT":
        default_port = 443 if parsed.scheme == "https" else 80
        return {
            "name": name,
            "host": parsed.hostname,
            "port": parsed.port or default_port,
        }
    return None


def can_connect(host, port):
    if not host or not port:
        return False
    try:
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except OSError:
        return False


service_checks = [
    item
    for item in [
        endpoint_from_env("DATABASE_URL"),
        endpoint_from_env("REDIS_URL"),
        endpoint_from_env("S3_ENDPOINT"),
    ]
    if item is not None
]
unreachable = [
    {
        "name": item["name"],
        "host": item["host"],
        "port": item["port"],
    }
    for item in service_checks
    if not can_connect(item["host"], item["port"])
]

stages = [
    {
        "id": "video-review-loop",
        "classification": "direct-provider",
        "reason": f"This run validates local media files through validate-media, ffmpeg, and Gemini using backend '{review_backend}'.",
    },
    {
        "id": "reviewer-cli",
        "classification": "available" if cli_available else "blocked",
        "reason": "Gemini CLI is available for headless review." if cli_available else "Gemini CLI command is not installed in this environment.",
    },
    {
        "id": "products-analyze-api",
        "classification": "stubbed",
        "reason": "The current products/analyze path uses stub-backed vision adapters and cannot be claimed as live provider-backed analysis.",
    },
    {
        "id": "media-jobs-api",
        "classification": "full-stack" if not missing and not unreachable else "blocked",
        "reason": (
            "All runtime prerequisites are present and reachable."
            if not missing and not unreachable
            else (
                ("Missing prerequisites: " + ", ".join(missing)) if missing else ""
            ) + (
                ("; " if missing and unreachable else "")
                + "Unreachable services: "
                + ", ".join(f"{item['name']}@{item['host']}:{item['port']}" for item in unreachable)
                if unreachable
                else ""
            )
        ),
    },
    {
        "id": "model-composite-api",
        "classification": "blocked",
        "reason": "This path still depends on auth, DB runtime, and valid preset IDs; it is not exercised by the direct-provider loop.",
    },
]

payload = {
    "stages": stages,
    "missingFullStackPrerequisites": missing,
    "unreachableServices": unreachable,
}
classification_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

lines = [
    "# Stage Classification",
    "",
]
for stage in stages:
    lines.append(f"- {stage['id']}: {stage['classification']} - {stage['reason']}")
if missing:
    lines.extend(["", "## Missing Full-Stack Prerequisites"])
    for item in missing:
        lines.append(f"- {item}")
if unreachable:
    lines.extend(["", "## Unreachable Services"])
    for item in unreachable:
        lines.append(f"- {item['name']}: {item['host']}:{item['port']}")
classification_md.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY_CLASSIFICATION

echo "Gemini review loop start"
echo "run_id=$RUN_ID"
echo "image=$IMAGE_PATH"
echo "videos=${#VIDEOS[@]}"
echo "review_backend=$REVIEW_BACKEND"
echo "out_dir=$OUT_DIR"
echo "run_manifest=$RUN_MANIFEST_JSON"
echo "stage_classification=$STAGE_CLASSIFICATION_JSON"

for INDEX in "${!VIDEOS[@]}"; do
	ITERATION=$((INDEX + 1))
	VIDEO_PATH="${VIDEOS[$INDEX]}"
	ITER_DIR="$OUT_DIR/iter-$(printf '%02d' "$ITERATION")"
	TECH_JSON="$ITER_DIR/technical-validation.json"
	REVIEW_JSON="$ITER_DIR/gemini-review.json"
	RAW_RESPONSE="$ITER_DIR/gemini-response.json"
	NORMALIZED_JSON="$ITER_DIR/iteration-summary.json"
	REVIEW_STDERR="$ITER_DIR/reviewer.stderr.log"
	mkdir -p "$ITER_DIR"

	echo ""
	echo "[iter $ITERATION] video=$VIDEO_PATH"

	if node "$ROOT_DIR/tooling/validate-media.mjs" --image "$IMAGE_PATH" --video "$VIDEO_PATH" --out "$TECH_JSON"; then
		TECH_EXIT=0
	else
		TECH_EXIT=$?
	fi
	if [[ ! -f "$TECH_JSON" ]]; then
		python3 - "$TECH_JSON" "$VIDEO_PATH" "$IMAGE_PATH" "$TECH_EXIT" <<'PY_FALLBACK_TECH'
from pathlib import Path
import json
import sys

tech_json = Path(sys.argv[1])
video_path = sys.argv[2]
image_path = sys.argv[3]
tech_exit = int(sys.argv[4])

payload = {
    "passed": False,
    "error": f"validate-media exited with code {tech_exit}",
    "image": {
        "path": image_path,
    },
    "video": {
        "path": video_path,
    },
}
tech_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY_FALLBACK_TECH
	fi

	FRAME_OPEN="$TMP_DIR/frame-${ITERATION}-open.jpg"
	FRAME_A="$TMP_DIR/frame-${ITERATION}-a.jpg"
	FRAME_B="$TMP_DIR/frame-${ITERATION}-b.jpg"
	FRAME_C="$TMP_DIR/frame-${ITERATION}-c.jpg"
	FRAME_TIMESTAMPS="$(python3 - "$TECH_JSON" <<'PY_FRAME_TIMES'
from pathlib import Path
import json
import sys

tech_json = Path(sys.argv[1])
duration = 0.0
try:
    payload = json.loads(tech_json.read_text(encoding="utf-8"))
    duration = float(payload.get("video", {}).get("metrics", {}).get("durationSeconds") or 0.0)
except Exception:
    duration = 0.0

safe_end = max(duration - 0.1, 0.0)
if duration <= 0.25:
    samples = [0.0, 0.0, 0.0]
else:
    samples = [
        min(safe_end, max(0.0, duration * 0.15)),
        min(safe_end, max(0.0, duration * 0.50)),
        min(safe_end, max(0.0, duration * 0.85)),
    ]

for value in samples:
    print(f"{value:.3f}")
PY_FRAME_TIMES
	)"
	FRAME_TIME_A="$(printf '%s\n' "$FRAME_TIMESTAMPS" | sed -n '1p')"
	FRAME_TIME_B="$(printf '%s\n' "$FRAME_TIMESTAMPS" | sed -n '2p')"
	FRAME_TIME_C="$(printf '%s\n' "$FRAME_TIMESTAMPS" | sed -n '3p')"
	ffmpeg -y -loglevel error -ss "0.000" -i "$VIDEO_PATH" -frames:v 1 -q:v 2 "$FRAME_OPEN"
	ffmpeg -y -loglevel error -ss "${FRAME_TIME_A:-0.000}" -i "$VIDEO_PATH" -frames:v 1 -q:v 2 "$FRAME_A"
	ffmpeg -y -loglevel error -ss "${FRAME_TIME_B:-0.000}" -i "$VIDEO_PATH" -frames:v 1 -q:v 2 "$FRAME_B"
	ffmpeg -y -loglevel error -ss "${FRAME_TIME_C:-0.000}" -i "$VIDEO_PATH" -frames:v 1 -q:v 2 "$FRAME_C"

	PAYLOAD_JSON="$TMP_DIR/payload-${ITERATION}.json"
	CLI_PROMPT_TXT="$TMP_DIR/prompt-${ITERATION}.txt"
	python3 - "$IMAGE_PATH" "$FRAME_OPEN" "$FRAME_A" "$FRAME_B" "$FRAME_C" "$TECH_JSON" "$PAYLOAD_JSON" "$CLI_PROMPT_TXT" "$(basename "$VIDEO_PATH")" "$MESSAGE_SPINE_ID" "$AD_HOOK" "$AD_MESSAGE" "$PROOF_DETAIL" "$VIEWER_TAKEAWAY" "$AD_CTA" "$AD_AUDIENCE" "$EDITORIAL_THESIS" "$TALENT_BRIEF" "$CTA_MODE" "$REQUIRE_HUMAN" "$REQUIRE_OPENING_WEARER" "$REQUIRE_ACTIVE_DEMO" "$REQUIRE_STORY" "$REQUIRE_MESSAGE" "$REQUIRE_CTA" <<'PY_PROMPT'
from pathlib import Path
import base64
import json
import mimetypes
import sys

source_image = Path(sys.argv[1])
frame_open = Path(sys.argv[2])
frame_a = Path(sys.argv[3])
frame_b = Path(sys.argv[4])
frame_c = Path(sys.argv[5])
technical_json = Path(sys.argv[6])
payload_json = Path(sys.argv[7])
cli_prompt_txt = Path(sys.argv[8])
video_name = sys.argv[9]
message_spine_id = sys.argv[10]
hook = sys.argv[11]
message = sys.argv[12]
proof_detail = sys.argv[13]
viewer_takeaway = sys.argv[14]
cta = sys.argv[15]
audience = sys.argv[16]
editorial_thesis = sys.argv[17]
talent_brief = sys.argv[18]
cta_mode = sys.argv[19]
require_human = sys.argv[20] == "true"
require_opening_wearer = sys.argv[21] == "true"
require_active_demo = sys.argv[22] == "true"
require_story = sys.argv[23] == "true"
require_message = sys.argv[24] == "true"
require_cta = sys.argv[25] == "true"

with technical_json.open() as fh:
    technical = json.load(fh)


def inline_part(path: Path):
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    return {
        "inlineData": {
            "mimeType": mime,
            "data": base64.b64encode(path.read_bytes()).decode("ascii"),
        }
    }


brief = {
    "message_spine_id": message_spine_id or "unspecified",
    "hook": hook or "unspecified",
    "message": message or "unspecified",
    "proof_detail": proof_detail or "unspecified",
    "viewer_takeaway": viewer_takeaway or "unspecified",
    "cta": cta or "unspecified",
    "audience": audience or "unspecified",
    "editorial_thesis": editorial_thesis or "unspecified",
    "talent_brief": talent_brief or "unspecified",
    "cta_mode": cta_mode,
}
required_checks = {
    "human_present": require_human,
    "opening_has_wearer": require_opening_wearer,
    "opening_continuity": True,
    "active_demonstration": require_active_demo,
    "story_present": require_story,
    "message_present": require_message,
    "message_legibility": require_message,
    "silhouette_readability": True,
    "cta_present": require_cta,
    "product_truth_pass": True,
}

prompt = f"""
You are reviewing a short-form vertical ecommerce ad candidate.

Use these inputs only:
- source product image
- opening frame at 0.0s
- sampled frames across the rest of the video
- technical validation summary
- expected ad brief

Video filename: {video_name}
Expected ad brief:
{json.dumps(brief, ensure_ascii=False)}

Required ad checks:
{json.dumps(required_checks, ensure_ascii=False)}

Technical summary:
{json.dumps(technical, ensure_ascii=False)}

Return strict JSON with this exact shape:
{{
  "verdict": "pass|revise|fail",
  "checks": {{
    "human_present": true,
    "opening_has_wearer": true,
    "opening_continuity": true,
    "active_demonstration": true,
    "story_present": true,
    "message_present": true,
    "message_legibility": true,
    "silhouette_readability": true,
    "talent_direction_pass": true,
    "cta_present": true,
    "product_truth_pass": true
  }},
  "message_spine": {{
    "id": "string",
    "aligned": true,
    "note": "string"
  }},
  "editorial_rubric": {{
    "color_palette_control": {{"score": 1-5, "note": "string"}},
    "composition": {{"score": 1-5, "note": "string"}},
    "alignment_blocking": {{"score": 1-5, "note": "string"}},
    "gaze_direction": {{"score": 1-5, "note": "string"}},
    "silhouette_readability": {{"score": 1-5, "note": "string"}},
    "framing": {{"score": 1-5, "note": "string"}},
    "visual_hierarchy": {{"score": 1-5, "note": "string"}}
  }},
  "talent_direction": {{
    "score": 1-5,
    "pass": true,
    "note": "string",
    "failure_reasons": ["string"]
  }},
  "scores": {{
    "message_legibility": 0-30,
    "editorial_visual_execution": 0-35,
    "talent_direction": 0-20,
    "product_truth_and_motion_discipline": 0-15
  }},
  "blocking_failures": ["string"],
  "one_sentence_summary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvements": ["string"]
}}

Evaluation rules:
- human_present: true only if a visible person or believable wearer/user appears in a meaningful way.
- opening_has_wearer: true only if the opening frame already contains a visible wearer. A product-only or mannequin-only opening means false.
- opening_continuity: true only if the opening frame and the early frame clearly read as the same wearer, same garment, same styling, and same scene continuing through time. Any abrupt identity drift, garment reinterpretation, or background reset means false.
- active_demonstration: true only if the product is demonstrated through action, use, styling, or clear motion beyond passive pan/zoom over a static subject.
- story_present: true only if the sequence implies hook -> proof -> payoff or another clear advertising progression.
- message_present: true only if the viewer can infer the intended selling angle or benefit.
- message_legibility: true only if the one selling angle is specific enough to be stated back in one sentence.
- silhouette_readability: true only if the garment outline or proof zone stays readable at a glance.
- talent_direction_pass: true only if the talent reads as a restrained editorial fashion choice rather than a generic stock model.
- cta_present: true only if the ending lands with a clear action or conversion prompt.
- product_truth_pass: true only if the product remains faithful to the source image.
- message_spine.aligned: true only if the clip clearly follows the requested message spine.
- editorial_rubric scores: use 1 for uncontrolled, 3 for usable, 5 for clearly editorial.
- talent_direction.failure_reasons: list stock-model cues, styling drift, or other explicit talent problems.
- Weighted scores must respect the requested 30/35/20/15 split across message legibility, editorial execution, talent direction, and product-truth/motion discipline.
- If CTA mode is external-overlay, a missing visible in-video CTA can be noted as a weakness but should not block an otherwise good candidate.
- If CTA mode is external-overlay, any visible burned-in text, subtitles, captions, CTA button, lower-third, black text bar, product label, random letters, or other rendered copy anywhere in the sampled frames must be treated as blocking failure "external_overlay_text_contamination".
- If CTA mode is external-overlay, do not return pass when visible in-video CTA or rendered text contamination is present.
- If opening_has_wearer, opening_continuity, message_legibility, silhouette_readability, or product_truth_pass is false, include a concrete hard-fail statement in blocking_failures.
- If any required check is missing, include a concrete statement in blocking_failures.
- If you are uncertain about a required check, set it to false.
- Do not use markdown fences. Output JSON only.
""".strip()

payload = {
    "contents": [
        {
            "role": "user",
            "parts": [
                {"text": prompt},
                inline_part(source_image),
                inline_part(frame_open),
                inline_part(frame_a),
                inline_part(frame_b),
                inline_part(frame_c),
            ],
        }
    ],
    "generationConfig": {
        "responseMimeType": "application/json",
        "temperature": 0.2,
    },
}
payload_json.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

cli_prompt = f"""{prompt}

Local workspace files to inspect:
- source image: {source_image}
- opening frame 0.0s: {frame_open}
- early frame: {frame_a}
- middle frame: {frame_b}
- late frame: {frame_c}
- technical validation json: {technical_json}

Inspect those local files and return JSON only.
"""
cli_prompt_txt.write_text(cli_prompt, encoding="utf-8")
PY_PROMPT

	BACKEND_SEQUENCE=()
	while IFS= read -r backend_name; do
		if [[ -n "$backend_name" ]]; then
			BACKEND_SEQUENCE+=("$backend_name")
		fi
	done < <(resolve_review_backends)
	BACKEND_ATTEMPTS=()
	BACKEND_ERRORS=()
	REVIEW_PARSED=0
	: > "$REVIEW_STDERR"

	for BACKEND in "${BACKEND_SEQUENCE[@]}"; do
		BACKEND_ATTEMPTS+=("$BACKEND")
		ATTEMPTED_CSV="$(printf '%s\n' "${BACKEND_ATTEMPTS[@]}" | paste -sd, -)"
		ERRORS_JOINED=""
		if [[ "${#BACKEND_ERRORS[@]}" -gt 0 ]]; then
			ERRORS_JOINED="$(printf '%s\n' "${BACKEND_ERRORS[@]}" | paste -sd'|' -)"
		fi

		if [[ "$BACKEND" == "api" ]]; then
			: > "$REVIEW_STDERR"
			if ! run_api_review "$PAYLOAD_JSON" "$RAW_RESPONSE"; then
				BACKEND_ERRORS+=("api_request_failed")
				continue
			fi
		else
			if ! run_cli_review "$CLI_PROMPT_TXT" "$RAW_RESPONSE" "$REVIEW_STDERR"; then
				BACKEND_ERRORS+=("cli_request_failed")
				continue
			fi
		fi

		if python3 - "$RAW_RESPONSE" "$REVIEW_JSON" "$NORMALIZED_JSON" "$TECH_JSON" "$VIDEO_PATH" "$TECH_EXIT" "$BACKEND" "$REVIEW_STDERR" "$ATTEMPTED_CSV" "$ERRORS_JOINED" "$CTA_MODE" "$REQUIRE_HUMAN" "$REQUIRE_OPENING_WEARER" "$REQUIRE_ACTIVE_DEMO" "$REQUIRE_STORY" "$REQUIRE_MESSAGE" "$REQUIRE_CTA" <<'PY_REVIEW'
from pathlib import Path
import json
import re
import sys

raw_response = Path(sys.argv[1])
review_json = Path(sys.argv[2])
normalized_json = Path(sys.argv[3])
technical_json = Path(sys.argv[4])
video_path = sys.argv[5]
tech_exit = int(sys.argv[6])
backend = sys.argv[7]
stderr_path = sys.argv[8]
attempted_csv = sys.argv[9]
errors_joined = sys.argv[10]
cta_mode = sys.argv[11]
require_human = sys.argv[12] == "true"
require_opening_wearer = sys.argv[13] == "true"
require_active_demo = sys.argv[14] == "true"
require_story = sys.argv[15] == "true"
require_message = sys.argv[16] == "true"
require_cta = sys.argv[17] == "true"


def strip_ansi(text: str) -> str:
    return re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", text)


def extract_json_block(text: str) -> str:
    cleaned = strip_ansi(text).strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    try:
        json.loads(cleaned)
        return cleaned
    except Exception:
        pass

    in_string = False
    escape = False
    depth = 0
    start = -1
    for index, char in enumerate(cleaned):
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
            continue
        if char == "{":
            if depth == 0:
                start = index
            depth += 1
        elif char == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start >= 0:
                    candidate = cleaned[start:index + 1]
                    try:
                        json.loads(candidate)
                        return candidate
                    except Exception:
                        start = -1
    raise SystemExit("Unable to extract JSON review output")


with technical_json.open() as fh:
    technical = json.load(fh)

raw_text = raw_response.read_text(encoding="utf-8")
if backend == "api":
    response = json.loads(raw_text)
    if "error" in response:
        raise SystemExit(f"Gemini request failed: {response['error']}")
    candidates = response.get("candidates", [])
    parts = (((candidates[0] or {}).get("content") or {}).get("parts") or []) if candidates else []
    text = parts[0].get("text", "") if parts else ""
else:
    text = raw_text

review = json.loads(extract_json_block(text))
checks = review.get("checks", {}) if isinstance(review.get("checks"), dict) else {}
scores = review.get("scores", {}) if isinstance(review.get("scores"), dict) else {}

normalized_checks = {
    "human_present": bool(checks.get("human_present", False)),
    "opening_has_wearer": bool(checks.get("opening_has_wearer", False)),
    "opening_continuity": bool(checks.get("opening_continuity", False)),
    "active_demonstration": bool(checks.get("active_demonstration", False)),
    "story_present": bool(checks.get("story_present", False)),
    "message_present": bool(checks.get("message_present", False)),
    "message_legibility": bool(checks.get("message_legibility", False)),
    "silhouette_readability": bool(checks.get("silhouette_readability", False)),
    "talent_direction_pass": bool(checks.get("talent_direction_pass", False)),
    "cta_present": bool(checks.get("cta_present", False)),
    "product_truth_pass": bool(checks.get("product_truth_pass", False)),
}

required_checks = {
    "human_present": require_human,
    "opening_has_wearer": require_opening_wearer,
    "opening_continuity": True,
    "active_demonstration": require_active_demo,
    "story_present": require_story,
    "message_present": require_message,
    "message_legibility": require_message,
    "silhouette_readability": True,
    "cta_present": require_cta,
    "product_truth_pass": True,
}

message_spine = review.get("message_spine", {}) if isinstance(review.get("message_spine"), dict) else {}
editorial_rubric = (
    review.get("editorial_rubric", {}) if isinstance(review.get("editorial_rubric"), dict) else {}
)
talent_direction = (
    review.get("talent_direction", {}) if isinstance(review.get("talent_direction"), dict) else {}
)

blocking_failures = [str(item) for item in review.get("blocking_failures", []) if str(item).strip()]
for key, required in required_checks.items():
    if required and not normalized_checks.get(key, False):
        statement = f"missing_required:{key}"
        if statement not in blocking_failures:
            blocking_failures.append(statement)

strengths = [str(item) for item in review.get("strengths", []) if str(item).strip()]
weaknesses = [str(item) for item in review.get("weaknesses", []) if str(item).strip()]
improvements = [str(item) for item in review.get("improvements", []) if str(item).strip()]
external_overlay_signal_text = " ".join(
    [
        str(review.get("one_sentence_summary", "")),
        *strengths,
        *weaknesses,
        *improvements,
        *blocking_failures,
    ]
).lower()
external_overlay_patterns = (
    # Avoid generic "in-video CTA" matches because reviewers often say
    # "No in-video CTA is present" for healthy external-overlay runs.
    "visible in-video cta",
    "visible in video cta",
    "rendered in-video cta",
    "rendered in video cta",
    "burned-in cta",
    "burned in cta",
    "burned-in text",
    "burned in text",
    "on-screen text",
    "on screen text",
    "overlay text",
    "subtitle",
    "subtitles",
    "caption",
    "captions",
    "black text bar",
    "black bar",
    "lower-third",
    "lower third",
    "gibberish",
    "random letters",
    "cta button",
    "cta contamination",
    "text contamination",
)
external_overlay_text_contaminated = cta_mode == "external-overlay" and (
    normalized_checks.get("cta_present", False)
    or any(pattern in external_overlay_signal_text for pattern in external_overlay_patterns)
)
if external_overlay_text_contaminated:
    statement = "external_overlay_text_contamination"
    if statement not in blocking_failures:
        blocking_failures.append(statement)
    contamination_note = (
        "CTA mode is external-overlay, but visible in-video text/CTA contamination was detected."
    )
    if contamination_note not in weaknesses:
        weaknesses.append(contamination_note)
    contamination_fix = (
        "Strip all burned-in text from external-overlay runs and leave clean negative space only."
    )
    if contamination_fix not in improvements:
        improvements.append(contamination_fix)

score_order = [
    "message_legibility",
    "editorial_visual_execution",
    "talent_direction",
    "product_truth_and_motion_discipline",
]
score_values = [float(scores.get(key, 0)) for key in score_order]
weighted_score = round(sum(score_values), 2) if score_values else 0.0
average_score = round(weighted_score / 10, 2) if score_values else 0.0
technical_passed = bool(technical.get("passed")) and tech_exit == 0
combined_score = weighted_score
raw_verdict = str(review.get("verdict", "unknown"))
final_verdict = "fail" if blocking_failures else raw_verdict
if final_verdict == "pass" and not normalized_checks["talent_direction_pass"]:
    final_verdict = "revise"

review["verdict"] = final_verdict
review["blocking_failures"] = blocking_failures
review["strengths"] = strengths
review["weaknesses"] = weaknesses
review["improvements"] = improvements
review_json.write_text(json.dumps(review, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
normalized = {
    "videoPath": video_path,
    "technicalPassed": technical_passed,
    "technicalExitCode": tech_exit,
    "technicalReportPath": str(technical_json),
    "reviewBackend": backend,
    "reviewBackendAttempts": [item for item in attempted_csv.split(",") if item],
    "reviewBackendErrors": [item for item in errors_joined.split("|") if item],
    "reviewerStderrPath": str(stderr_path) if backend == "cli" and Path(stderr_path).exists() else None,
    "geminiVerdict": final_verdict,
    "rawReviewerVerdict": raw_verdict,
    "hasBlockingFailures": bool(blocking_failures),
    "blockingFailures": blocking_failures,
    "requiredChecks": required_checks,
    "checks": normalized_checks,
    "averageGeminiScore": average_score,
    "combinedScore": combined_score,
    "scores": scores,
    "messageSpine": {
        "id": message_spine.get("id"),
        "aligned": bool(message_spine.get("aligned", False)),
        "note": message_spine.get("note", ""),
    },
    "editorialRubric": editorial_rubric,
    "talentDirectionReview": {
        "score": talent_direction.get("score", 0),
        "pass": bool(talent_direction.get("pass", False)),
        "note": talent_direction.get("note", ""),
        "failureReasons": [
            str(item) for item in talent_direction.get("failure_reasons", []) if str(item).strip()
        ],
    },
    "oneSentenceSummary": review.get("one_sentence_summary", ""),
    "strengths": strengths,
    "weaknesses": weaknesses,
    "improvements": improvements,
}
normalized_json.write_text(json.dumps(normalized, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY_REVIEW
		then
			REVIEW_PARSED=1
			break
		else
			BACKEND_ERRORS+=("${BACKEND}_parse_failed")
		fi
	done

	if [[ "$REVIEW_PARSED" -ne 1 ]]; then
		ATTEMPTED_CSV=""
		ERRORS_JOINED=""
		if [[ "${#BACKEND_ATTEMPTS[@]}" -gt 0 ]]; then
			ATTEMPTED_CSV="$(printf '%s\n' "${BACKEND_ATTEMPTS[@]}" | paste -sd, -)"
		fi
		if [[ "${#BACKEND_ERRORS[@]}" -gt 0 ]]; then
			ERRORS_JOINED="$(printf '%s\n' "${BACKEND_ERRORS[@]}" | paste -sd'|' -)"
		fi
		python3 - "$REVIEW_JSON" "$NORMALIZED_JSON" "$TECH_JSON" "$VIDEO_PATH" "$TECH_EXIT" "$ATTEMPTED_CSV" "$ERRORS_JOINED" "$REQUIRE_HUMAN" "$REQUIRE_OPENING_WEARER" "$REQUIRE_ACTIVE_DEMO" "$REQUIRE_STORY" "$REQUIRE_MESSAGE" "$REQUIRE_CTA" <<'PY_REVIEW_FAIL'
from pathlib import Path
import json
import sys

review_json = Path(sys.argv[1])
normalized_json = Path(sys.argv[2])
technical_json = Path(sys.argv[3])
video_path = sys.argv[4]
tech_exit = int(sys.argv[5])
attempted_csv = sys.argv[6]
errors_joined = sys.argv[7]
require_human = sys.argv[8] == "true"
require_opening_wearer = sys.argv[9] == "true"
require_active_demo = sys.argv[10] == "true"
require_story = sys.argv[11] == "true"
require_message = sys.argv[12] == "true"
require_cta = sys.argv[13] == "true"

with technical_json.open() as fh:
    technical = json.load(fh)

review = {
    "verdict": "fail",
    "checks": {
        "human_present": False,
        "opening_has_wearer": False,
        "opening_continuity": False,
        "active_demonstration": False,
        "story_present": False,
        "message_present": False,
        "message_legibility": False,
        "silhouette_readability": False,
        "talent_direction_pass": False,
        "cta_present": False,
        "product_truth_pass": False,
    },
    "message_spine": {
        "id": None,
        "aligned": False,
        "note": "Reviewer backend failed before message-spine alignment could be judged.",
    },
    "editorial_rubric": {
        "color_palette_control": {"score": 0, "note": "not evaluated"},
        "composition": {"score": 0, "note": "not evaluated"},
        "alignment_blocking": {"score": 0, "note": "not evaluated"},
        "gaze_direction": {"score": 0, "note": "not evaluated"},
        "silhouette_readability": {"score": 0, "note": "not evaluated"},
        "framing": {"score": 0, "note": "not evaluated"},
        "visual_hierarchy": {"score": 0, "note": "not evaluated"},
    },
    "talent_direction": {
        "score": 0,
        "pass": False,
        "note": "Reviewer backend failed before talent direction could be judged.",
        "failure_reasons": ["review_backend_failed"],
    },
    "scores": {
        "message_legibility": 0,
        "editorial_visual_execution": 0,
        "talent_direction": 0,
        "product_truth_and_motion_discipline": 0,
    },
    "blocking_failures": ["review_backend_failed"],
    "one_sentence_summary": "Reviewer backend failed before ad validation could complete.",
    "strengths": [],
    "weaknesses": ["Reviewer backend failed before structured review output could be parsed."],
    "improvements": ["Check Gemini reviewer backend availability, credentials, and output parsing."],
}
review_json.write_text(json.dumps(review, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

technical_passed = bool(technical.get("passed")) and tech_exit == 0
normalized = {
    "videoPath": video_path,
    "technicalPassed": technical_passed,
    "technicalExitCode": tech_exit,
    "technicalReportPath": str(technical_json),
    "reviewBackend": None,
    "reviewBackendAttempts": [item for item in attempted_csv.split(",") if item],
    "reviewBackendErrors": [item for item in errors_joined.split("|") if item],
    "reviewerStderrPath": None,
    "geminiVerdict": "fail",
    "rawReviewerVerdict": "fail",
    "hasBlockingFailures": True,
    "blockingFailures": ["review_backend_failed"],
    "requiredChecks": {
        "human_present": require_human,
        "opening_has_wearer": require_opening_wearer,
        "opening_continuity": True,
        "active_demonstration": require_active_demo,
        "story_present": require_story,
        "message_present": require_message,
        "message_legibility": require_message,
        "silhouette_readability": True,
        "cta_present": require_cta,
        "product_truth_pass": True,
    },
    "checks": review["checks"],
    "averageGeminiScore": 0.0,
    "combinedScore": -40.0,
    "scores": review["scores"],
    "messageSpine": review["message_spine"],
    "editorialRubric": review["editorial_rubric"],
    "talentDirectionReview": {
        "score": 0,
        "pass": False,
        "note": review["talent_direction"]["note"],
        "failureReasons": review["talent_direction"]["failure_reasons"],
    },
    "oneSentenceSummary": review["one_sentence_summary"],
    "strengths": review["strengths"],
    "weaknesses": review["weaknesses"],
    "improvements": review["improvements"],
}
normalized_json.write_text(json.dumps(normalized, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY_REVIEW_FAIL
	fi
done

SUMMARY_JSON="$OUT_DIR/loop-summary.json"
SUMMARY_MD="$OUT_DIR/loop-summary.md"
python3 - "$OUT_DIR" "$SUMMARY_JSON" "$SUMMARY_MD" "$RUN_MANIFEST_JSON" "$STAGE_CLASSIFICATION_JSON" <<'PY_SUMMARY'
from pathlib import Path
import json
import sys

out_dir = Path(sys.argv[1])
summary_json = Path(sys.argv[2])
summary_md = Path(sys.argv[3])
run_manifest_json = Path(sys.argv[4])
stage_classification_json = Path(sys.argv[5])

with run_manifest_json.open() as fh:
    run_manifest = json.load(fh)

with stage_classification_json.open() as fh:
    stage_classification = json.load(fh)

iterations = []
for path in sorted(out_dir.glob("iter-*/iteration-summary.json")):
    with path.open() as fh:
        data = json.load(fh)
    data["iteration"] = path.parent.name
    iterations.append(data)

iterations.sort(
    key=lambda item: (
        not item.get("hasBlockingFailures", False),
        item.get("technicalPassed", False),
        item.get("combinedScore", -9999),
    ),
    reverse=True,
)
best_overall = iterations[0] if iterations else None
best_qualified = next(
    (
        item
        for item in iterations
        if not item.get("hasBlockingFailures", False) and item.get("technicalPassed", False)
    ),
    None,
)

common_weaknesses = {}
common_blocking_failures = {}
for item in iterations:
    for weakness in item.get("weaknesses", []):
        common_weaknesses[weakness] = common_weaknesses.get(weakness, 0) + 1
    for failure in item.get("blockingFailures", []):
        common_blocking_failures[failure] = common_blocking_failures.get(failure, 0) + 1

summary = {
    "iterationCount": len(iterations),
    "runManifestPath": str(run_manifest_json),
    "sourceImagePath": run_manifest.get("sourceImagePath"),
    "sourceImageCopyPath": run_manifest.get("sourceImageCopyPath"),
    "candidateVideos": run_manifest.get("videos", []),
    "reviewBackend": run_manifest.get("reviewBackend"),
    "adBrief": run_manifest.get("adBrief", {}),
    "requiredChecks": run_manifest.get("requiredChecks", {}),
    "stageClassificationPath": str(stage_classification_json),
    "stageClassification": stage_classification.get("stages", []),
    "missingFullStackPrerequisites": stage_classification.get("missingFullStackPrerequisites", []),
    "unreachableServices": stage_classification.get("unreachableServices", []),
    "bestOverall": best_overall,
    "bestQualified": best_qualified,
    "ranked": iterations,
    "commonWeaknesses": sorted(
        [{"statement": key, "count": value} for key, value in common_weaknesses.items()],
        key=lambda item: (-item["count"], item["statement"]),
    ),
    "commonBlockingFailures": sorted(
        [{"statement": key, "count": value} for key, value in common_blocking_failures.items()],
        key=lambda item: (-item["count"], item["statement"]),
    ),
}

summary_json.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

lines = [
    "# Gemini Video Review Loop",
    "",
    f"- iterations: {summary['iterationCount']}",
    f"- source image: {summary['sourceImageCopyPath']}",
    f"- review backend: {summary['reviewBackend']}",
    f"- run manifest: {summary['runManifestPath']}",
    f"- stage classification: {summary['stageClassificationPath']}",
    "",
    "## Ad Brief",
]
for key, value in summary["adBrief"].items():
    lines.append(f"- {key}: {value or 'unspecified'}")
lines.extend(["", "## Required Checks"])
for key, value in summary["requiredChecks"].items():
    lines.append(f"- {key}: {value}")

if best_qualified:
    lines.extend([
        "",
        "## Best Qualified Candidate",
        f"- iteration: {best_qualified['iteration']}",
        f"- video: {best_qualified['videoPath']}",
        f"- verdict: {best_qualified['geminiVerdict']}",
        f"- combined score: {best_qualified['combinedScore']}",
    ])
elif best_overall:
    lines.extend([
        "",
        "## Best Available Candidate",
        f"- iteration: {best_overall['iteration']}",
        f"- video: {best_overall['videoPath']}",
        f"- verdict: {best_overall['geminiVerdict']}",
        f"- combined score: {best_overall['combinedScore']}",
        "- note: no candidate passed all required ad checks.",
    ])

candidate_for_notes = best_qualified or best_overall
if candidate_for_notes:
    message_spine = candidate_for_notes.get("messageSpine") or {}
    talent_review = candidate_for_notes.get("talentDirectionReview") or {}
    editorial_rubric = candidate_for_notes.get("editorialRubric") or {}
    lines.extend(["", "## Message And Rubric Snapshot"])
    lines.append(
        f"- message spine: {message_spine.get('id') or 'unspecified'} (aligned={message_spine.get('aligned')})"
    )
    if message_spine.get("note"):
        lines.append(f"- message spine note: {message_spine['note']}")
    lines.append(
        f"- talent direction: score={talent_review.get('score', 0)}, pass={talent_review.get('pass', False)}"
    )
    if talent_review.get("note"):
        lines.append(f"- talent note: {talent_review['note']}")
    for key, value in editorial_rubric.items():
        if isinstance(value, dict):
            lines.append(f"- {key}: score={value.get('score', 0)} note={value.get('note', '')}")

if iterations:
    lines.extend(["", "## Ranking"])
    for item in iterations:
        lines.append(
            f"- {item['iteration']}: verdict={item['geminiVerdict']}, combined={item['combinedScore']}, backend={item.get('reviewBackend')}, blocking={item.get('blockingFailures', [])}"
        )

if summary["commonBlockingFailures"]:
    lines.extend(["", "## Common Blocking Failures"])
    for failure in summary["commonBlockingFailures"]:
        lines.append(f"- {failure['statement']} ({failure['count']})")

if summary["commonWeaknesses"]:
    lines.extend(["", "## Common Weaknesses"])
    for weakness in summary["commonWeaknesses"][:10]:
        lines.append(f"- {weakness['statement']} ({weakness['count']})")

lines.extend(["", "## Stage Classification"])
for stage in summary["stageClassification"]:
    lines.append(f"- {stage['id']}: {stage['classification']} - {stage['reason']}")
if summary["missingFullStackPrerequisites"]:
    lines.extend(["", "## Missing Full-Stack Prerequisites"])
    for item in summary["missingFullStackPrerequisites"]:
        lines.append(f"- {item}")
if summary["unreachableServices"]:
    lines.extend(["", "## Unreachable Services"])
    for item in summary["unreachableServices"]:
        lines.append(f"- {item['name']}: {item['host']}:{item['port']}")

if best_overall:
    lines.extend(["", "## Best Candidate Guidance"])
    for strength in best_overall.get("strengths", []):
        lines.append(f"- strength: {strength}")
    for improvement in best_overall.get("improvements", []):
        lines.append(f"- next: {improvement}")

summary_md.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY_SUMMARY

CALIBRATION_JSON="$OUT_DIR/calibration-summary.json"
CALIBRATION_MD="$OUT_DIR/calibration-summary.md"
node --experimental-strip-types apps/api/scripts/render-editorial-calibration.ts \
	--loop-summary "$SUMMARY_JSON" \
	--summary-md "$SUMMARY_MD" \
	--out-json "$CALIBRATION_JSON" \
	--out-md "$CALIBRATION_MD"

cp "$SUMMARY_JSON" "$ROOT_DIR/artifacts/gemini-review-loop-latest.json"
cp "$SUMMARY_MD" "$ROOT_DIR/artifacts/gemini-review-loop-latest.md"
cp "$RUN_MANIFEST_JSON" "$ROOT_DIR/artifacts/gemini-review-loop-latest-manifest.json"
cp "$REVIEW_BRIEF_JSON" "$ROOT_DIR/artifacts/gemini-review-loop-latest-review-brief.json"
cp "$REVIEW_BRIEF_MD" "$ROOT_DIR/artifacts/gemini-review-loop-latest-review-brief.md"
cp "$STAGE_CLASSIFICATION_JSON" "$ROOT_DIR/artifacts/gemini-review-loop-latest-stage-classification.json"
cp "$CALIBRATION_JSON" "$ROOT_DIR/artifacts/gemini-review-loop-latest-calibration.json"
cp "$CALIBRATION_MD" "$ROOT_DIR/artifacts/gemini-review-loop-latest-calibration.md"

echo ""
echo "Gemini review loop completed"
echo "summary_json=$SUMMARY_JSON"
echo "summary_md=$SUMMARY_MD"
echo "review_brief_json=$REVIEW_BRIEF_JSON"
echo "review_brief_md=$REVIEW_BRIEF_MD"
echo "calibration_summary_json=$CALIBRATION_JSON"
echo "calibration_summary_md=$CALIBRATION_MD"
