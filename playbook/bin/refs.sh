#!/usr/bin/env bash
# Manage upstream copies of open-source reference products.
#
#   playbook/bin/refs.sh list                 show every reference, its role and pinned rev
#   playbook/bin/refs.sh fetch <id|all>       shallow-clone the pinned revision(s)
#   playbook/bin/refs.sh update <id|all>      move the pin to the upstream branch head
#   playbook/bin/refs.sh status               pinned vs. upstream head, per submodule
#
# Plain bash + git so any harness can run it. Upstream copies are read-only study
# material: never edit files under <references>/*/upstream/.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"
# References folder from playbook.yaml (key "references"), default "references".
refs_dir="$(awk -F': *' '$1 == "references" {print $2; exit}' playbook.yaml 2>/dev/null | sed 's/ *#.*//')"
refs_dir="${refs_dir:-references}"

paths_for() {
  local id="$1"
  if [[ "$id" == "all" ]]; then
    git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | awk '{print $2}'
  else
    git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | awk '{print $2}' | grep "^$refs_dir/$id/" || {
      echo "no upstream registered for reference '$id'" >&2
      exit 1
    }
  fi
}

field() { # field <reference id> <key>
  sed -n '/^---$/,/^---$/p' "$refs_dir/$1/REFERENCE.md" | awk -v k="$2:" '$1 == k {print $2; exit}'
}

cmd="${1:-list}"
case "$cmd" in
  list)
    printf '%-14s %-10s %-12s %s\n' ID ROLE CADENCE UPSTREAM
    for dir in "$refs_dir"/*/; do
      id="$(basename "$dir")"
      [[ -f "$dir/REFERENCE.md" ]] || continue
      ups="$(git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | awk '{print $2}' | grep -c "^$refs_dir/$id/" || true)"
      printf '%-14s %-10s %-12s %s\n' "$id" "$(field "$id" role)" "$(field "$id" review_cadence)" "$ups repo(s)"
    done
    ;;
  fetch)
    for p in $(paths_for "${2:?usage: refs.sh fetch <id|all>}"); do
      echo "== $p"
      GIT_LFS_SKIP_SMUDGE=1 git submodule update --init --depth 1 -- "$p"
    done
    ;;
  update)
    for p in $(paths_for "${2:?usage: refs.sh update <id|all>}"); do
      name="$(git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | awk -v p="$p" '$2 == p {print $1}' | sed 's/^submodule\.//; s/\.path$//')"
      branch="$(git config -f .gitmodules "submodule.$name.branch")"
      echo "== $p ($branch)"
      GIT_LFS_SKIP_SMUDGE=1 git submodule update --init --depth 1 --remote -- "$p"
      echo "   now at $(git -C "$p" rev-parse HEAD)"
    done
    echo
    echo "Next: update 'pinned' and add a Review log row in each REFERENCE.md you touched, then commit."
    ;;
  status)
    while read -r _ p; do
      name="$(git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | awk -v p="$p" '$2 == p {print $1}' | sed 's/^submodule\.//; s/\.path$//')"
      url="$(git config -f .gitmodules "submodule.$name.url")"
      branch="$(git config -f .gitmodules "submodule.$name.branch")"
      pinned="$(git ls-tree HEAD "$p" | awk '{print $3}')"
      head="$(git ls-remote "$url" "refs/heads/$branch" | cut -f1)"
      state="up to date"; [[ "$pinned" == "$head" ]] || state="behind"
      printf '%-50s %s  %.12s -> %.12s\n' "$p" "$state" "$pinned" "$head"
    done < <(git config -f .gitmodules --get-regexp '^submodule\..*\.path$')
    ;;
  *)
    sed -n '2,8p' "$0"; exit 1 ;;
esac
