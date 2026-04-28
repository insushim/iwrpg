#!/bin/bash
# codex CLI gpt-image-2 wrapper — picbooksk-style helper.
# Modes:
#   single — one image
#   sheet  — grid spritesheet (caller supplies grid spec in prompt; sliced separately)

set -euo pipefail
MODE=${1:-single}
shift

PROMPT=""
OUTPUT=""
RESOLUTION="1024x1024"
REFERENCE=""
THINKING=""
GRID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --prompt)     PROMPT="$2"; shift 2;;
    --output)     OUTPUT="$2"; shift 2;;
    --resolution) RESOLUTION="$2"; shift 2;;
    --reference)  REFERENCE="$2"; shift 2;;
    --thinking)   THINKING=""; shift 1;;  # codex CLI 0.125 has no --high; fall back to default mode
    --grid)       GRID="$2"; shift 2;;
    *) echo "Unknown arg: $1"; shift;;
  esac
done

if [ -z "$PROMPT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: codex-asset.sh <mode> --prompt '...' --output /abs/path.png [--resolution WxH] [--reference path[,path]] [--thinking]"
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

# Skip if already generated (idempotent re-runs)
if [ -s "$OUTPUT" ]; then
  echo "⏭️  Skip (exists): $OUTPUT ($(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT") bytes)"
  exit 0
fi

# Build instruction string for codex CLI
INSTRUCTION="\$imagegen 다음 조건으로 이미지 1장 생성 후 저장.
프롬프트: $PROMPT
저장 경로: $OUTPUT
해상도: $RESOLUTION"

if [ -n "$REFERENCE" ]; then
  INSTRUCTION="$INSTRUCTION
참조 이미지: $REFERENCE (캐릭터·스타일 일관성 유지)"
fi

INSTRUCTION="$INSTRUCTION
저장 완료 후 파일 절대 경로만 한 줄 출력."

# Use --skip-git-repo-check since this monorepo may not be a git repo
codex exec --full-auto --skip-git-repo-check \
  --add-dir "$(dirname "$OUTPUT")" \
  ${THINKING:+$THINKING} \
  "$INSTRUCTION" 2>&1 | tail -5

if [ -f "$OUTPUT" ]; then
  echo "✅ Generated: $OUTPUT ($(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT") bytes)"
else
  echo "⚠️  File not found at $OUTPUT — codex may have failed"
  exit 2
fi
