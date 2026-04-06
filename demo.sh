#!/usr/bin/env bash
# =============================================================================
# resize-cli — script demo cho báo cáo / quay video
# Chạy: bash demo.sh [all|1|2|3|4|interactive|multi|dry|bench]
# Yêu cầu: Git Bash / WSL / Linux / macOS
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

NODE="${NODE:-node}"
ENTRY="src/index.js"
INPUT="${INPUT:-./images}"
OUTPUT="${OUTPUT:-./resized}"

banner() {
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  ⚡ $1"
  echo "════════════════════════════════════════════════════════════"
}

# [1] Interactive — cần TTY (quay video: ghi màn hình khi trả lời wizard)
demo_interactive() {
  banner "DEMO 1 — Interactive mode (wizard)"
  if [ -t 0 ] && [ -t 1 ]; then
    echo "→ Chạy: $NODE $ENTRY"
    echo "  (Không tham số — trả lời từng bước, có validation thư mục / số)"
    "$NODE" "$ENTRY"
  else
    echo "⚠ Không có TTY — không thể mô phỏng inquirer tự động."
    echo "  Hãy mở terminal và chạy: $NODE $ENTRY"
  fi
}

# [2] Nhiều kích thước
demo_multi_sizes() {
  banner "DEMO 2 — Multiple sizes (--sizes)"
  echo "→ $NODE $ENTRY -i \"$INPUT\" -o \"$OUTPUT\" --sizes 640,1024,1280 --overwrite"
  "$NODE" "$ENTRY" -i "$INPUT" -o "$OUTPUT" --sizes 640,1024,1280 --overwrite
}

# [3] Dry-run
demo_dry_run() {
  banner "DEMO 3 — Dry-run"
  echo "→ $NODE $ENTRY -i \"$INPUT\" -o \"$OUTPUT\" --sizes 800,1200 --dry-run"
  "$NODE" "$ENTRY" -i "$INPUT" -o "$OUTPUT" --sizes 800,1200 --dry-run
}

# [4] Benchmark (module benchmark.js — Stream vs Buffer + workers)
demo_benchmark() {
  banner "DEMO 4 — Benchmark (--benchmark)"
  echo "→ $NODE $ENTRY --benchmark -i \"$INPUT\" -o \"$OUTPUT\""
  "$NODE" "$ENTRY" --benchmark -i "$INPUT" -o "$OUTPUT"
}

# [4b] Đo thời gian resize thường (tùy chọn, khi có GNU time)
demo_timed_resize() {
  banner "DEMO 4b — Timed resize (time, nếu có)"
  if command -v /usr/bin/time >/dev/null 2>&1; then
    echo "→ /usr/bin/time $NODE $ENTRY -i \"$INPUT\" -o \"$OUTPUT\" --width 1024 --overwrite --with-stats"
    /usr/bin/time -f "\n⚡ wall %e s | CPU %P" \
      "$NODE" "$ENTRY" -i "$INPUT" -o "$OUTPUT" --width 1024 --overwrite --with-stats
  elif command -v time >/dev/null 2>&1; then
    echo "→ time $NODE $ENTRY ... (TIMEFORMAT bash)"
    TIMEFORMAT=$'\n⚡ real %R s'
    time "$NODE" "$ENTRY" -i "$INPUT" -o "$OUTPUT" --width 1024 --overwrite --with-stats
  else
    echo "→ (không có lệnh time) chạy resize + --with-stats"
    "$NODE" "$ENTRY" -i "$INPUT" -o "$OUTPUT" --width 1024 --overwrite --with-stats
  fi
}

case "${1:-all}" in
  1|interactive) demo_interactive ;;
  2|multi)         demo_multi_sizes ;;
  3|dry)           demo_dry_run ;;
  4|bench)         demo_benchmark ;;
  timed)           demo_timed_resize ;;
  all)
    demo_dry_run
    demo_multi_sizes
    demo_benchmark
    demo_timed_resize
    echo ""
    echo "ℹ Chạy riêng interactive (cần tay):  bash demo.sh 1"
    ;;
  help|-h|--help)
    echo "Usage: bash demo.sh [all|1|2|3|4|timed|help]"
    echo "  1 / interactive  — wizard"
    echo "  2 / multi         — --sizes"
    echo "  3 / dry           — --dry-run"
    echo "  4 / bench         — --benchmark (Stream vs Buffer + workers)"
    echo "  timed             — resize + --with-stats và time (nếu có)"
    echo "  all               — dry-run → multi → benchmark → timed (không gồm interactive)"
    echo ""
    echo "Biến môi trường: INPUT=./images OUTPUT=./resized NODE=node"
    ;;
  *)
    echo "Không rõ lệnh: $1 — thử: bash demo.sh help"
    exit 1
    ;;
esac

echo ""
echo "✓ Demo bước hoàn tất."
