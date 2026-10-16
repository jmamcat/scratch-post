#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Check the language-neutral structure rules (modules/structure: S2, S8, S9, S10).

    playbook/bin/check-structure.py           exit 1 on violations, print warnings
    playbook/bin/check-structure.py --quiet   only violations

Settings in playbook.yaml (comma-separated lists):

    structure_roots: app/packages, app/apps/server/src   folders whose child folders are modules
    structure_ext: .ts, .tsx                             source files to measure
    structure_allow: shared                              module names allowed besides capabilities
    structure_soft_lines: 300
    structure_hard_lines: 500

Capability names are read from the spec folders (`specs` and active change deltas), so code
modules and specs share one vocabulary. Dependency rules (S1, S3 to S7) need a language tool
such as dependency-cruiser, import-linter or depguard; see modules/structure/README.md.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

FORBIDDEN_NAMES = {"utils", "util", "helpers", "helper", "misc", "common"}
SKIP_DIRS = {"node_modules", "dist", "build", ".git", "__pycache__", ".venv", "target", "vendor"}


def config(root: Path) -> dict[str, str]:
    cfg: dict[str, str] = {}
    for raw in (root / "playbook.yaml").read_text().splitlines():
        line = raw.split(" #", 1)[0].rstrip()
        if line and not line.startswith((" ", "\t", "#")) and ":" in line:
            k, v = line.split(":", 1)
            cfg[k.strip()] = v.strip()
    return cfg


def as_list(value: str) -> list[str]:
    return [v.strip() for v in value.strip("[]").split(",") if v.strip()]


def capabilities(root: Path, cfg: dict[str, str]) -> set[str]:
    caps: set[str] = set()
    specs = root / cfg.get("specs", "spec")
    changes = root / cfg.get("changes", "changes")
    if specs.exists():
        caps |= {p.parent.name for p in specs.glob("*/spec.md")}
    if changes.exists():
        caps |= {p.parent.name for p in changes.glob("*/spec/*/spec.md") if "archive" not in p.parts}
    return caps


def source_files(folder: Path, exts: tuple[str, ...]):
    for p in folder.rglob("*"):
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.is_file() and p.suffix in exts and not p.name.endswith(".d.ts"):
            yield p


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    root = Path(__file__).resolve()
    while not (root / "playbook.yaml").exists() and root != root.parent:
        root = root.parent
    cfg = config(root)
    target = root / cfg.get("target", ".")
    roots = [root / r for r in as_list(cfg.get("structure_roots", ""))]
    exts = tuple(as_list(cfg.get("structure_ext", ".ts, .tsx, .py, .go")))
    allowed = capabilities(root, cfg) | set(as_list(cfg.get("structure_allow", "shared")))
    soft = int(cfg.get("structure_soft_lines", "300"))
    hard = int(cfg.get("structure_hard_lines", "500"))

    errors: list[str] = []
    warnings: list[str] = []
    modules: list[Path] = []

    arch = target / "ARCHITECTURE.md"
    arch_text = arch.read_text() if arch.exists() else ""
    if not arch.exists():
        errors.append(f"S10 {arch.relative_to(root)} is missing")

    for r in roots:
        if not r.exists():
            errors.append(f"structure root {r.relative_to(root)} does not exist")
            continue
        for child in sorted(p for p in r.iterdir() if p.is_dir() and p.name not in SKIP_DIRS and not p.name.startswith(".")):
            modules.append(child)
            rel = child.relative_to(root)
            if child.name not in allowed:
                errors.append(f"S2 {rel}: '{child.name}' is not a capability ({', '.join(sorted(allowed))})")
            readme = child / "README.md"
            if not readme.exists():
                errors.append(f"S10 {rel}: no README.md")
            elif len(readme.read_text().strip().splitlines()) > 15:
                errors.append(f"S10 {rel}/README.md: longer than 15 lines")
            if arch_text and str(child.relative_to(target)) not in arch_text:
                errors.append(f"S10 {rel}: not listed in ARCHITECTURE.md")

        for f in source_files(r, exts):
            rel = f.relative_to(root)
            lines = len(f.read_text(errors="replace").splitlines())
            if lines > hard:
                errors.append(f"S8 {rel}: {lines} lines (hard limit {hard})")
            elif lines > soft:
                warnings.append(f"S8 {rel}: {lines} lines (soft limit {soft})")
            for part in f.relative_to(r).parts:
                stem = part.split(".")[0].lower()
                if stem in FORBIDDEN_NAMES:
                    errors.append(f"S9 {rel}: '{part}' says nothing about what the code does")

    if not args.quiet:
        for w in warnings:
            print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    print(f"structure: {len(modules)} modules, {len(errors)} violations, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
