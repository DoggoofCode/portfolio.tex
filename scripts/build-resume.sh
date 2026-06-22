#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT="$ROOT_DIR/resume/basic-resume/main.typ"
OUTPUT="$ROOT_DIR/public/resume.pdf"

if ! command -v typst >/dev/null 2>&1; then
  echo "Error: typst is not installed or not on PATH." >&2
  exit 1
fi

if [[ ! -f "$INPUT" ]]; then
  echo "Error: missing resume source at $INPUT" >&2
  echo "Initialize it with: typst init @preview/basic-resume:0.2.9" >&2
  exit 1
fi

typst compile "$INPUT" "$OUTPUT"
echo "Wrote $OUTPUT"
