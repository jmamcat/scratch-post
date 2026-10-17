#!/usr/bin/env bash
# Run one of the project's gates by name, as declared in playbook.yaml.
#   playbook/bin/gate.sh check
#   playbook/bin/gate.sh scenarios "@R-SYN-03|@R-SYN-06"    only scenarios with these tags
# Packets name gates, never tool commands, so a change of tooling never makes them stale.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
cd "$root"
name="${1:?usage: gate.sh <check|scenarios|demo|...> [scenario tag filter]}"
value() { awk -F': *' -v k="$1" '$1 == k {sub(/^[^:]*: */, ""); sub(/ +#.*$/, ""); print; exit}' playbook.yaml; }
cmd="$(value "$name")"
[[ -n "$cmd" ]] || { echo "playbook.yaml declares no gate named '$name'" >&2; exit 2; }
if [[ $# -ge 2 && -n "$2" ]]; then
  flag="$(value scenario_filter_flag)"
  exec bash -c "$cmd ${flag:---grep} \"\$0\"" "$2"
fi
exec bash -c "$cmd"
