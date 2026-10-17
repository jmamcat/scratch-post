#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Archive a finished change: apply its spec deltas to the living specs, then move it.

    playbook/bin/archive-change.py <change-id> [--dry-run]

Reads `specs` and `changes` from playbook.yaml. For each `<changes>/<id>/spec/<cap>/spec.md`
(modules/specs/format.md):

- a new capability becomes `<specs>/<cap>/spec.md`: the delta's front matter and purpose,
  then `## Requirements` with the ADDED requirements;
- an existing capability gets ADDED requirements appended, MODIFIED ones replaced in place,
  and REMOVED ones turned into a tombstone heading that keeps the reason.

Any ID clash (ADDED that exists, MODIFIED or REMOVED that does not) stops the run before a
file is written. Then the change folder moves to `<changes>/archive/<id>` (with `git mv` in a
git work tree) and its proposal gets `status: archived`. Standard library only.
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

REQ_RE = re.compile(r"^### Requirement (R-[A-Z]+-\d+)\b")
OP_RE = re.compile(r"^## (ADDED|MODIFIED|REMOVED) Requirements\s*$")


def repo_root() -> Path:
    p = Path(__file__).resolve()
    while not (p / "playbook.yaml").exists() and p != p.parent:
        p = p.parent
    return p


def config(root: Path) -> dict[str, str]:
    cfg: dict[str, str] = {}
    for raw in (root / "playbook.yaml").read_text().splitlines():
        if ":" in raw and not raw.startswith((" ", "#")):
            k, _, v = raw.partition(":")
            cfg[k.strip()] = v.split("#", 1)[0].strip()
    return cfg


def split_blocks(lines: list[str]) -> list[tuple[str, list[str]]]:
    """Requirement blocks as (id, lines), each running to the next requirement heading."""
    blocks: list[tuple[str, list[str]]] = []
    for line in lines:
        if m := REQ_RE.match(line):
            blocks.append((m.group(1), [line]))
        elif blocks:
            blocks[-1][1].append(line)
        elif line.strip():
            sys.exit(f"text before the first requirement in a section: {line!r}")
    return blocks


def parse_delta(path: Path) -> tuple[list[str], dict[str, list[tuple[str, list[str]]]]]:
    """Head (front matter, title, purpose) and requirement blocks per operation."""
    head: list[str] = []
    sections: dict[str, list[str]] = {}
    op = None
    for line in path.read_text().splitlines():
        if m := OP_RE.match(line):
            op = m.group(1)
            sections.setdefault(op, [])
        elif op is None:
            head.append(line)
        else:
            sections[op].append(line)
    return head, {k: split_blocks(v) for k, v in sections.items()}


def parse_living(path: Path) -> tuple[list[str], list[tuple[str, list[str]]]]:
    lines = path.read_text().splitlines()
    try:
        at = lines.index("## Requirements")
    except ValueError:
        sys.exit(f"{path}: no '## Requirements' heading")
    return lines[: at + 1], split_blocks(lines[at + 1 :])


def trim(block: list[str]) -> list[str]:
    while block and not block[-1].strip():
        block = block[:-1]
    return block


def render(head: list[str], blocks: list[tuple[str, list[str]]]) -> str:
    out = trim(head) + [""]
    for _, b in blocks:
        out += trim(b) + [""]
    return "\n".join(out)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if len(args) != 1:
        sys.exit(__doc__.strip().splitlines()[2])
    change_id = args[0]
    root = repo_root()
    cfg = config(root)
    specs = root / cfg.get("specs", "spec")
    changes = root / cfg.get("changes", "changes")
    change = changes / change_id
    target = changes / "archive" / change_id
    if not change.is_dir():
        sys.exit(f"no change folder {change}")
    if target.exists():
        sys.exit(f"already archived: {target}")

    writes: dict[Path, str] = {}
    summary: list[str] = []
    for delta in sorted(change.glob("spec/*/spec.md")):
        cap = delta.parent.name
        living = specs / cap / "spec.md"
        head, ops = parse_delta(delta)
        added, modified, removed = ops.get("ADDED", []), ops.get("MODIFIED", []), ops.get("REMOVED", [])
        if not living.exists():
            if modified or removed:
                sys.exit(f"{delta}: MODIFIED or REMOVED for a capability with no living spec")
            writes[living] = render(trim(head) + ["", "## Requirements"], added)
            summary.append(f"{cap}: new spec, {len(added)} added")
            continue
        lhead, blocks = parse_living(living)
        index = {rid: i for i, (rid, _) in enumerate(blocks)}
        for rid, block in modified:
            if rid not in index:
                sys.exit(f"{delta}: MODIFIED {rid} is not in {living}")
            blocks[index[rid]] = (rid, block)
        for rid, block in removed:
            if rid not in index:
                sys.exit(f"{delta}: REMOVED {rid} is not in {living}")
            reason = [line for line in block[1:] if line.strip()]
            blocks[index[rid]] = (rid, [f"### Requirement {rid}: (removed in {change_id})", "", *reason])
        for rid, block in added:
            if rid in index:
                sys.exit(f"{delta}: ADDED {rid} already exists in {living}")
            index[rid] = len(blocks)
            blocks.append((rid, block))
        writes[living] = render(lhead, blocks)
        summary.append(f"{cap}: {len(added)} added, {len(modified)} modified, {len(removed)} removed")

    for line in summary:
        print(line)
    if dry:
        print(f"dry run: would write {len(writes)} specs and move {change} to {target}")
        return
    for path, text in writes.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    target.parent.mkdir(parents=True, exist_ok=True)
    in_git = subprocess.run(["git", "-C", str(root), "rev-parse"], capture_output=True).returncode == 0
    if in_git:
        subprocess.run(["git", "-C", str(root), "mv", str(change), str(target)], check=True)
    else:
        shutil.move(str(change), str(target))
    proposal = target / "proposal.md"
    if proposal.exists():
        text = proposal.read_text()
        proposal.write_text(re.sub(r"^status: .*$", "status: archived", text, count=1, flags=re.M))
    print(f"archived {change_id} -> {target.relative_to(root)}")


if __name__ == "__main__":
    main()
