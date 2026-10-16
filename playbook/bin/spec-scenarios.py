#!/usr/bin/env python3
"""Generate Gherkin .feature files from the GIVEN/WHEN/THEN scenarios in Markdown specs.

    playbook/bin/spec-scenarios.py            write features to the configured output folder
    playbook/bin/spec-scenarios.py --check    also fail on requirements without scenarios
    playbook/bin/spec-scenarios.py --list     print requirement IDs and scenario names

Reads playbook.yaml at the repo root: `specs`, `changes`, and `scenarios_out` (default
`<target>/scenarios/.features`). Living specs come first; specs in active (non-archived)
change folders override requirements with the same ID, and REMOVED requirements drop out.

Spec syntax (see modules/specs/format.md):

    ### Requirement R-SYN-03: Merge on stale base
    Layer: ui                      optional, default "system"
    #### Scenario: Two offline devices
    Tags: @slow                    optional
    - **GIVEN** device "pixel" ...
    - **WHEN** ...
    - **THEN** ... `inline code becomes a "quoted" string`
    - **AND** ...

No dependencies beyond the Python 3 standard library.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

STEP_RE = re.compile(r"^\s*[-*]\s+\*\*(GIVEN|WHEN|THEN|AND|BUT)\*\*\s+(.*)$", re.I)
REQ_RE = re.compile(r"^###\s+Requirement\s+(R-[A-Z]+-\d+)\s*:?\s*(.*)$")
SCN_RE = re.compile(r"^####\s+Scenario\s*:\s*(.+)$")
SECTION_RE = re.compile(r"^##\s+(ADDED|MODIFIED|REMOVED)\s+Requirements", re.I)
CODE_RE = re.compile(r"`([^`]*)`")


@dataclass
class Scenario:
    name: str
    steps: list[tuple[str, str]] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    line: int = 0


@dataclass
class Requirement:
    rid: str
    title: str
    capability: str
    source: str
    layer: str = "system"
    removed: bool = False
    scenarios: list[Scenario] = field(default_factory=list)


def read_config(root: Path) -> dict[str, str]:
    cfg: dict[str, str] = {}
    path = root / "playbook.yaml"
    if not path.exists():
        sys.exit("playbook.yaml not found at the repo root")
    for raw in path.read_text().splitlines():
        line = raw.split(" #", 1)[0].rstrip()
        if not line or line.startswith((" ", "\t", "#")) or ":" not in line:
            continue
        key, value = line.split(":", 1)
        cfg[key.strip()] = value.strip().strip("'\"")
    return cfg


def front_matter(text: str) -> dict[str, str]:
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    out: dict[str, str] = {}
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                out[k.strip()] = v.split("#", 1)[0].strip()
    return out


def gherkin_text(text: str) -> str:
    """Inline code becomes a double-quoted string; quotes inside it are escaped.

    Backslash sequences such as \\n are passed through untouched; step definitions decide
    what they mean (Quire's turn \\n into a newline)."""
    return CODE_RE.sub(lambda m: '"' + m.group(1).replace('"', '\\"') + '"', text).strip()


def parse_spec(path: Path, root: Path) -> list[Requirement]:
    text = path.read_text()
    fm = front_matter(text)
    capability = fm.get("capability") or path.parent.name
    reqs: list[Requirement] = []
    section = "ADDED"
    req: Requirement | None = None
    scn: Scenario | None = None
    errors: list[str] = []
    for n, line in enumerate(text.splitlines(), 1):
        if m := SECTION_RE.match(line):
            section = m.group(1).upper()
            continue
        if m := REQ_RE.match(line):
            req = Requirement(m.group(1), m.group(2).strip(), capability, str(path.relative_to(root)), removed=section == "REMOVED")
            reqs.append(req)
            scn = None
            continue
        if req is None:
            continue
        if line.lower().startswith("layer:") and scn is None:
            req.layer = line.split(":", 1)[1].strip().lower()
            continue
        if m := SCN_RE.match(line):
            scn = Scenario(m.group(1).strip(), line=n)
            req.scenarios.append(scn)
            continue
        if scn is not None and line.lower().startswith("tags:"):
            scn.tags += [t if t.startswith("@") else f"@{t}" for t in line.split(":", 1)[1].split()]
            continue
        if scn is not None and (m := STEP_RE.match(line)):
            scn.steps.append((m.group(1).capitalize(), gherkin_text(m.group(2))))
            continue
        if scn is not None and line.strip().startswith(("- ", "* ")) and "**" not in line:
            errors.append(f"{path}:{n}: scenario bullet without GIVEN/WHEN/THEN/AND/BUT: {line.strip()}")
    for e in errors:
        print(e, file=sys.stderr)
    if errors:
        sys.exit(1)
    return reqs


def collect(root: Path, cfg: dict[str, str]) -> dict[str, Requirement]:
    reqs: dict[str, Requirement] = {}
    specs = root / cfg.get("specs", "spec")
    changes = root / cfg.get("changes", "changes")
    files = sorted(specs.glob("*/spec.md")) if specs.exists() else []
    if changes.exists():
        files += sorted(p for p in changes.glob("*/spec/*/spec.md") if "archive" not in p.parts)
    for f in files:
        for r in parse_spec(f, root):
            reqs[r.rid] = r
    return {k: v for k, v in reqs.items() if not v.removed}


def write_features(reqs: dict[str, Requirement], out: Path) -> int:
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.feature"):
        old.unlink()
    by_cap: dict[str, list[Requirement]] = {}
    for r in reqs.values():
        by_cap.setdefault(r.capability, []).append(r)
    count = 0
    for cap, items in sorted(by_cap.items()):
        lines = [
            "# Generated by playbook/bin/spec-scenarios.py from the Markdown specs. Do not edit.",
            f"@cap-{cap}",
            f"Feature: {cap}",
            "",
        ]
        for r in sorted(items, key=lambda r: r.rid):
            for s in r.scenarios:
                if not s.steps:
                    continue
                tags = [f"@{r.rid}", f"@{r.layer}", *s.tags]
                lines.append("  " + " ".join(dict.fromkeys(tags)))
                lines.append(f"  Scenario: {r.rid} {s.name}")
                lines.append(f"    # {r.source}:{s.line}")
                lines += [f"    {kw} {txt}" for kw, txt in s.steps]
                lines.append("")
                count += 1
        (out / f"{cap}.feature").write_text("\n".join(lines))
    return count


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="fail on requirements without scenarios")
    ap.add_argument("--list", action="store_true", help="list requirements and scenarios")
    args = ap.parse_args()

    root = Path(__file__).resolve()
    while not (root / "playbook.yaml").exists() and root != root.parent:
        root = root.parent
    cfg = read_config(root)
    reqs = collect(root, cfg)

    if args.list:
        for r in sorted(reqs.values(), key=lambda r: r.rid):
            print(f"{r.rid} [{r.layer}] {r.title}")
            for s in r.scenarios:
                print(f"    - {s.name}")
        return

    out = root / cfg.get("scenarios_out", f"{cfg.get('target', '.')}/scenarios/.features")
    count = write_features(reqs, out)
    missing = sorted(r.rid for r in reqs.values() if not any(s.steps for s in r.scenarios))
    print(f"{count} scenarios from {len(reqs)} requirements -> {out.relative_to(root)}")
    if missing:
        print(f"{len(missing)} requirements without scenarios: {', '.join(missing)}", file=sys.stderr)
        if args.check:
            sys.exit(1)


if __name__ == "__main__":
    main()
