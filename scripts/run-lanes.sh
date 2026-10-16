#!/usr/bin/env bash
# Run every ready packet of a change with any agent CLI, respecting depends_on.
#   AGENT_CMD='claude -p' PARALLEL=3 scripts/run-lanes.sh quire/changes/0001-mvp
# AGENT_CMD receives the packet prompt on stdin. Loops until no packet is ready.
set -euo pipefail
change="${1:?usage: run-lanes.sh <change folder>}"
: "${AGENT_CMD:?set AGENT_CMD to your agent CLI, prompt is piped on stdin}"
parallel="${PARALLEL:-2}"
here="$(cd "$(dirname "$0")" && pwd)"

meta() { sed -n '/^---$/,/^---$/p' "$1" | awk -v k="$2:" '$1 == k {sub(/^[^:]*: */, ""); print; exit}'; }

ready_packets() {
  for p in "$change"/packets/P*.md; do
    [[ "$(meta "$p" status)" == "todo" ]] || continue
    deps="$(meta "$p" depends_on | tr -d '[] ' | tr ',' ' ')"
    ok=1
    for d in $deps; do
      dep_file="$(ls "$change"/packets/"${d##*/}"*.md 2>/dev/null | head -1)"
      [[ -n "$dep_file" && "$(meta "$dep_file" status)" == "done" ]] || ok=0
    done
    (( ok )) && echo "$p"
  done
}

while :; do
  mapfile -t batch < <(ready_packets | head -n "$parallel")
  (( ${#batch[@]} )) || break
  echo "== running: ${batch[*]##*/}"
  for p in "${batch[@]}"; do
    "$here/packet-prompt.sh" "$p" | $AGENT_CMD > "${p%.md}.log" 2>&1 &
  done
  wait
  for p in "${batch[@]}"; do
    if [[ "$(meta "$p" status)" == "todo" ]]; then
      echo "!! ${p##*/} did not update its status; marking blocked" >&2
      sed -i '0,/^status: todo/s//status: blocked/' "$p"
    fi
  done
done
echo "== no ready packets left"
grep -H '^status:' "$change"/packets/P*.md
