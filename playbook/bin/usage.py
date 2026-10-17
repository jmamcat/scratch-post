#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Record and summarise token and credit usage per slice of work (modules/usage).

    playbook/bin/usage.py add --change C --scope S --harness H --model M [--tier T] [numbers...]
    playbook/bin/usage.py report [--by change|model|harness|scope|tier] [--change C]
    playbook/bin/usage.py models

Reads `usage` from playbook.yaml (default `usage`). Writes `<usage>/ledger.csv`. Model
aliases come from `<usage>/models.yaml` and, if present, the uncommitted
`<usage>/models.local.yaml` (alias: real model identifier), which `report` and `models` join.
Standard library only.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import sys
from collections import defaultdict
from pathlib import Path

COLUMNS = [
    "date", "change", "scope", "harness", "model", "tier", "agents",
    "input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens", "total_tokens",
    "credits", "credit_unit", "wall_minutes", "outcome", "source", "notes",
]
NUMERIC = ["agents", "input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens", "total_tokens", "credits", "wall_minutes"]
SOURCES = {"harness-subagent-report", "harness-cost-command", "harness-json-log", "billing-dashboard", "estimate", "unknown"}


def repo_root() -> Path:
    p = Path(__file__).resolve()
    while not (p / "playbook.yaml").exists() and p != p.parent:
        p = p.parent
    return p


def usage_dir(root: Path) -> Path:
    for raw in (root / "playbook.yaml").read_text().splitlines():
        if raw.startswith("usage:"):
            return root / raw.split(":", 1)[1].split("#", 1)[0].strip()
    return root / "usage"


def read_simple_yaml(path: Path) -> dict[str, dict[str, str]]:
    """Tiny reader for `alias:` blocks with `key: value` children, or `alias: value` lines."""
    out: dict[str, dict[str, str]] = {}
    if not path.exists():
        return out
    current = None
    for raw in path.read_text().splitlines():
        line = raw.split(" #", 1)[0].rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line.startswith((" ", "\t")):
            key, _, value = line.partition(":")
            current = key.strip()
            out[current] = {"name": value.strip().strip("'\"")} if value.strip() else {}
        elif current is not None:
            k, _, v = line.strip().partition(":")
            out[current][k.strip()] = v.strip().strip("'\"")
    return out


def models(udir: Path) -> dict[str, dict[str, str]]:
    known = read_simple_yaml(udir / "models.yaml")
    for alias, info in read_simple_yaml(udir / "models.local.yaml").items():
        known.setdefault(alias, {}).update({"name": info.get("name", "")} if "name" in info else info)
    return known


def ledger_rows(udir: Path) -> list[dict[str, str]]:
    path = udir / "ledger.csv"
    if not path.exists():
        return []
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def cmd_add(a: argparse.Namespace, udir: Path) -> None:
    known = models(udir)
    if a.model not in known:
        sys.exit(f"unknown model alias '{a.model}': add it to {udir / 'models.yaml'} first")
    if a.source not in SOURCES:
        sys.exit(f"--source must be one of {', '.join(sorted(SOURCES))}")
    row = {c: "" for c in COLUMNS}
    row.update(
        date=a.date or dt.date.today().isoformat(), change=a.change, scope=a.scope, harness=a.harness,
        model=a.model, tier=a.tier or known[a.model].get("tier", ""), outcome=a.outcome or "", source=a.source,
        notes=a.notes or "", credit_unit=a.credit_unit or "",
    )
    for col in NUMERIC:
        v = getattr(a, col)
        if v is not None:
            row[col] = str(v)
    if not row["total_tokens"]:
        parts = [row[c] for c in ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens") if row[c]]
        if parts:
            row["total_tokens"] = str(sum(int(float(x)) for x in parts))
    udir.mkdir(parents=True, exist_ok=True)
    path = udir / "ledger.csv"
    new = not path.exists()
    with path.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        if new:
            w.writeheader()
        w.writerow(row)
    print(f"recorded {row['change']} {row['scope']} on {row['harness']}/{row['model']}: {row['total_tokens'] or '?'} tokens")


def num(v: str) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def cmd_report(a: argparse.Namespace, udir: Path) -> None:
    known = models(udir)
    rows = [r for r in ledger_rows(udir) if not a.change or r["change"] == a.change]
    if not rows:
        print("no usage recorded yet")
        return
    groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    for r in rows:
        groups[r[a.by]].append(r)

    def label(key: str) -> str:
        if a.by != "model":
            return key
        info = known.get(key, {})
        extra = ", ".join(x for x in (f"tier {info.get('tier')}" if info.get("tier") else "", info.get("name", "")) if x)
        return f"{key} ({extra})" if extra else key

    print(f"| {a.by} | slices | agents | total tokens | credits | wall minutes | unknown token rows |")
    print("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
    for key in sorted(groups):
        g = groups[key]
        units = {r["credit_unit"] for r in g if r["credits"]}
        credits = f"{sum(num(r['credits']) for r in g):g} {'/'.join(sorted(units))}" if units else ""
        print(
            f"| {label(key)} | {len(g)} | {sum(num(r['agents']) for r in g):g} | {sum(num(r['total_tokens']) for r in g):,.0f} "
            f"| {credits} | {sum(num(r['wall_minutes']) for r in g):g} | {sum(1 for r in g if not r['total_tokens'])} |"
        )


def cmd_models(udir: Path) -> None:
    known = models(udir)
    local = (udir / "models.local.yaml").exists()
    print(f"| alias | tier | name{'' if local else ' (models.local.yaml not found)'} | notes |")
    print("| --- | --- | --- | --- |")
    for alias, info in sorted(known.items()):
        print(f"| {alias} | {info.get('tier', '')} | {info.get('name', '')} | {info.get('notes', '')} |")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    add = sub.add_parser("add", help="append one ledger row")
    for req in ("change", "scope", "harness", "model"):
        add.add_argument(f"--{req}", required=True)
    add.add_argument("--tier")
    add.add_argument("--date")
    for col in NUMERIC:
        add.add_argument(f"--{col.replace('_', '-')}", dest=col, type=float if col in ("credits", "wall_minutes") else int)
    add.add_argument("--credit-unit")
    add.add_argument("--outcome")
    add.add_argument("--source", default="unknown")
    add.add_argument("--notes")
    rep = sub.add_parser("report", help="totals grouped by a column")
    rep.add_argument("--by", default="change", choices=["change", "model", "harness", "scope", "tier"])
    rep.add_argument("--change")
    sub.add_parser("models", help="list model aliases")
    a = ap.parse_args()

    udir = usage_dir(repo_root())
    if a.cmd == "add":
        cmd_add(a, udir)
    elif a.cmd == "report":
        cmd_report(a, udir)
    else:
        cmd_models(udir)


if __name__ == "__main__":
    main()
