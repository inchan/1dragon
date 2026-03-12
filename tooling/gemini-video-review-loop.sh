#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.test"
VIDEO_DIR="$ROOT_DIR/apps/api/scripts/output"
MODEL="gemini-2.5-flash"
ITERATIONS=5
IMAGE_PATH=""
VIDEOS_ARG=""
OUT_DIR=""

usage() {
	cat <<'EOF'
Usage:
  tooling/gemini-video-review-loop.sh --image <source-image> [--env-file <path>] [--video-dir <dir>] [--videos <comma-list>] [--iterations <n>] [--model <name>] [--out-dir <dir>]

Examples:
  tooling/gemini-video-review-loop.sh --image /tmp/fashion-001.png
  tooling/gemini-video-review-loop.sh --image /tmp/fashion-001.png --videos a.mp4,b.mp4,c.mp4,d.mp4,e.mp4
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
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
		--image)
			IMAGE_PATH="$2"
			shift 2
			;;
		--out-dir)
			OUT_DIR="$2"
			shift 2
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

: "${GEMINI_VEO_API_KEY:?GEMINI_VEO_API_KEY is required}"

RUN_ID="$(date +%Y%m%d-%H%M%S)"
if [[ -z "$OUT_DIR" ]]; then
	OUT_DIR="$ROOT_DIR/artifacts/gemini-review-loop/$RUN_ID"
fi
mkdir -p "$OUT_DIR"

SOURCE_IMAGE_COPY="$OUT_DIR/source-image${IMAGE_PATH##*.}"
case "$IMAGE_PATH" in
	*.*)
		SOURCE_IMAGE_COPY="$OUT_DIR/source-image.${IMAGE_PATH##*.}"
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
python3 - "$RUN_MANIFEST_JSON" "$IMAGE_PATH" "$SOURCE_IMAGE_COPY" "$MODEL" "$ITERATIONS" "${VIDEOS[@]}" <<'PY_MANIFEST'
from pathlib import Path
import json
import sys

manifest_path = Path(sys.argv[1])
source_image = sys.argv[2]
source_image_copy = sys.argv[3]
model = sys.argv[4]
iterations = int(sys.argv[5])
videos = sys.argv[6:]

manifest = {
    "sourceImagePath": source_image,
    "sourceImageCopyPath": source_image_copy,
    "model": model,
    "iterationTarget": iterations,
    "videos": videos,
}
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY_MANIFEST

python3 - "$STAGE_CLASSIFICATION_JSON" "$STAGE_CLASSIFICATION_MD" <<'PY_CLASSIFICATION'
from pathlib import Path
import json
import os
import socket
import sys
from urllib.parse import urlparse

classification_json = Path(sys.argv[1])
classification_md = Path(sys.argv[2])

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
        "reason": "This run validates local media files through validate-media, ffmpeg, and Gemini directly.",
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

	FRAME_A="$TMP_DIR/frame-${ITERATION}-a.jpg"
	FRAME_B="$TMP_DIR/frame-${ITERATION}-b.jpg"
	FRAME_C="$TMP_DIR/frame-${ITERATION}-c.jpg"
	ffmpeg -y -loglevel error -ss 0.5 -i "$VIDEO_PATH" -frames:v 1 "$FRAME_A"
	ffmpeg -y -loglevel error -ss 2.5 -i "$VIDEO_PATH" -frames:v 1 "$FRAME_B"
	ffmpeg -y -loglevel error -ss 4.5 -i "$VIDEO_PATH" -frames:v 1 "$FRAME_C"

	PAYLOAD_JSON="$TMP_DIR/payload-${ITERATION}.json"
	python3 - "$IMAGE_PATH" "$FRAME_A" "$FRAME_B" "$FRAME_C" "$TECH_JSON" "$PAYLOAD_JSON" "$(basename "$VIDEO_PATH")" <<'PY_PAYLOAD'
from pathlib import Path
import base64
import json
import mimetypes
import sys

source_image = Path(sys.argv[1])
frame_a = Path(sys.argv[2])
frame_b = Path(sys.argv[3])
frame_c = Path(sys.argv[4])
technical_json = Path(sys.argv[5])
payload_json = Path(sys.argv[6])
video_name = sys.argv[7]

with technical_json.open() as fh:
    technical = json.load(fh)

def inline_part(path: Path, label: str):
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    return {
        "inlineData": {
            "mimeType": mime,
            "data": base64.b64encode(path.read_bytes()).decode("ascii"),
        }
    }

prompt = f"""
You are reviewing a short-form vertical product video candidate.
Input assets:
- source product image
- sampled frames at 0.5s, 2.5s, and 4.5s
- technical validation summary

Video filename: {video_name}
Technical summary:
{json.dumps(technical, ensure_ascii=False)}

Return strict JSON with this shape:
{{
  "verdict": "pass|revise|fail",
  "scores": {{
    "opening_hook": 0-10,
    "product_truth": 0-10,
    "scene_diversity": 0-10,
    "narrative_clarity": 0-10,
    "cta_clarity": 0-10,
    "visual_quality": 0-10
  }},
  "one_sentence_summary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvements": ["string"]
}}

Evaluation rules:
- product_truth: does the product still look like the source image?
- opening_hook: does frame 0.5 imply motion, tension, or scroll-stopping value?
- scene_diversity: do the frames show meaningful progression instead of one static photo?
- narrative_clarity: does the sequence imply a story, proof beat, or payoff?
- cta_clarity: does the video appear to land with an understandable action or closing point?
- visual_quality: are composition, realism, and readability acceptable for a vertical ad?

Do not use markdown fences. Output JSON only.
""".strip()

payload = {
    "contents": [
        {
            "role": "user",
            "parts": [
                {"text": prompt},
                inline_part(source_image, "source"),
                inline_part(frame_a, "frame_0_5"),
                inline_part(frame_b, "frame_2_5"),
                inline_part(frame_c, "frame_4_5"),
            ],
        }
    ],
    "generationConfig": {
        "responseMimeType": "application/json",
        "temperature": 0.2,
    },
}

payload_json.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
PY_PAYLOAD

	curl -sS \
		-X POST \
		-H "Content-Type: application/json" \
		--data-binary "@$PAYLOAD_JSON" \
		"https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_VEO_API_KEY}" \
		> "$RAW_RESPONSE"

		python3 - "$RAW_RESPONSE" "$REVIEW_JSON" "$NORMALIZED_JSON" "$TECH_JSON" "$VIDEO_PATH" "$TECH_EXIT" <<'PY_REVIEW'
from pathlib import Path
import json
import sys

raw_response = Path(sys.argv[1])
review_json = Path(sys.argv[2])
normalized_json = Path(sys.argv[3])
technical_json = Path(sys.argv[4])
video_path = sys.argv[5]
tech_exit = int(sys.argv[6])

response = json.loads(raw_response.read_text(encoding="utf-8"))
with technical_json.open() as fh:
    technical = json.load(fh)

if "error" in response:
    raise SystemExit(f"Gemini request failed: {response['error']}")

candidates = response.get("candidates", [])
parts = (((candidates[0] or {}).get("content") or {}).get("parts") or []) if candidates else []
text = parts[0].get("text", "") if parts else ""
text = text.strip()
if text.startswith("```"):
    text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
review = json.loads(text)

scores = review.get("scores", {})
score_values = [float(scores.get(key, 0)) for key in [
    "opening_hook",
    "product_truth",
    "scene_diversity",
    "narrative_clarity",
    "cta_clarity",
    "visual_quality",
]]
average_score = round(sum(score_values) / len(score_values), 2) if score_values else 0.0
technical_passed = bool(technical.get("passed")) and tech_exit == 0
combined_score = round(average_score * 10 + (10 if technical_passed else 0), 2)

review_json.write_text(json.dumps(review, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
normalized = {
    "videoPath": video_path,
    "technicalPassed": technical_passed,
    "technicalExitCode": tech_exit,
    "technicalReportPath": str(technical_json),
    "geminiVerdict": review.get("verdict", "unknown"),
    "averageGeminiScore": average_score,
    "combinedScore": combined_score,
    "scores": scores,
    "oneSentenceSummary": review.get("one_sentence_summary", ""),
    "strengths": review.get("strengths", []),
    "weaknesses": review.get("weaknesses", []),
    "improvements": review.get("improvements", []),
}
normalized_json.write_text(json.dumps(normalized, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY_REVIEW
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

iterations.sort(key=lambda item: item["combinedScore"], reverse=True)
best = iterations[0] if iterations else None

common_weaknesses = {}
for item in iterations:
    for weakness in item.get("weaknesses", []):
        common_weaknesses[weakness] = common_weaknesses.get(weakness, 0) + 1

summary = {
    "iterationCount": len(iterations),
    "runManifestPath": str(run_manifest_json),
    "sourceImagePath": run_manifest.get("sourceImagePath"),
    "sourceImageCopyPath": run_manifest.get("sourceImageCopyPath"),
    "candidateVideos": run_manifest.get("videos", []),
    "stageClassificationPath": str(stage_classification_json),
    "stageClassification": stage_classification.get("stages", []),
    "missingFullStackPrerequisites": stage_classification.get("missingFullStackPrerequisites", []),
    "unreachableServices": stage_classification.get("unreachableServices", []),
    "best": best,
    "ranked": iterations,
    "commonWeaknesses": sorted(
        [{"statement": key, "count": value} for key, value in common_weaknesses.items()],
        key=lambda item: (-item["count"], item["statement"]),
    ),
}

summary_json.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

lines = [
    "# Gemini Video Review Loop",
    "",
    f"- iterations: {summary['iterationCount']}",
    f"- source image: {summary['sourceImageCopyPath']}",
    f"- run manifest: {summary['runManifestPath']}",
    f"- stage classification: {summary['stageClassificationPath']}",
]

if best:
    lines.extend([
        f"- best iteration: {best['iteration']}",
        f"- best video: {best['videoPath']}",
        f"- best verdict: {best['geminiVerdict']}",
        f"- best combined score: {best['combinedScore']}",
        "",
        "## Ranking",
    ])
    for item in iterations:
        lines.append(
            f"- {item['iteration']}: verdict={item['geminiVerdict']}, combined={item['combinedScore']}, avgGemini={item['averageGeminiScore']}, technical={item['technicalPassed']}"
        )
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
    lines.extend(["", "## Best Candidate Guidance"])
    for strength in best.get("strengths", []):
        lines.append(f"- strength: {strength}")
    for improvement in best.get("improvements", []):
        lines.append(f"- next: {improvement}")

summary_md.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY_SUMMARY

cp "$SUMMARY_JSON" "$ROOT_DIR/artifacts/gemini-review-loop-latest.json"
cp "$SUMMARY_MD" "$ROOT_DIR/artifacts/gemini-review-loop-latest.md"
cp "$RUN_MANIFEST_JSON" "$ROOT_DIR/artifacts/gemini-review-loop-latest-manifest.json"
cp "$STAGE_CLASSIFICATION_JSON" "$ROOT_DIR/artifacts/gemini-review-loop-latest-stage-classification.json"

echo ""
echo "Gemini review loop completed"
echo "summary_json=$SUMMARY_JSON"
echo "summary_md=$SUMMARY_MD"
