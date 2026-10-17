#!/usr/bin/env bash
# Run every ready packet of a change with any agent CLI, respecting depends_on.
#   AGENT_CMD='claude -p' PARALLEL=3 playbook/bin/run-lanes.sh quire/changes/0001-mvp
# AGENT_CMD receives the packet prompt on stdin. Loops until no packet is ready.
# Two packets whose owns/borrows paths overlap never run in the same batch.
set -euo pipefail
change="${1:?usage: run-lanes.sh <change folder>}"
: "${AGENT_CMD:?set AGENT_CMD to your agent CLI, prompt is piped on stdin}"
parallel="${PARALLEL:-2}"
here="$(cd "$(dirname "$0")" && pwd)"

meta() { sed -n '/^---$/,/^---$/p' "$1" | awk -v k="$2:" '$1 == k {sub(/^[^:]*: */, ""); print; exit}'; }

# owns and borrows globs of a packet, one per line, reduced to path prefixes.
paths_of() {
  sed -n '/^---$/,/^---$/p' "$1" | awk '
    /^[a-z_]+:/ { inlist = ($1 == "owns:" || $1 == "borrows:"); next }
    inlist && /^ *- / { sub(/^ *- */, ""); sub(/ +#.*$/, ""); sub(/\/?\*\*.*$/, ""); sub(/\/?\*[^\/]*$/, ""); print }'
}

overlaps() { # overlaps <packet> <packet>: exit 0 if any path of one is a prefix of a path of the other
  local a b
  while read -r a; do
    while read -r b; do
      [[ "$a" == "$b"* || "$b" == "$a"* ]] && return 0
    done < <(paths_of "$2")
  done < <(paths_of "$1")
  return 1
}

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
  batch=()
  while read -r p; do
    (( ${#batch[@]} < parallel )) || break
    clash=0
    for q in "${batch[@]}"; do overlaps "$p" "$q" && clash=1; done
    (( clash )) || batch+=("$p")
  done < <(ready_packets)
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
