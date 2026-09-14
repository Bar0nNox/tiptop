#!/usr/bin/env python3
# =============================================================================
#  TipTop — deployment preflight, v1.0.0
#  © 2026 Childish Agency — Alexandre F. Vial. Tous droits réservés.
#
#  Builds deploy/_publish/ from the allowlist in deploy/publish.json and refuses
#  to hand anything to the FTP step until every control passes. Every check
#  fails loudly: an unexpected count, a zero-byte file or a version mismatch
#  stops the run. Nothing here is advisory.
# =============================================================================
"""Preflight controls for the OVH deployment.

Controls, in order:
  1. allowlist    — only files matched by publish.json are selected
  2. tracked      — every selected file is committed (git ls-files), never local
  3. forbidden    — no selected path falls under a must_never_publish prefix
  4. negative     — known-excluded files are proven absent from the selection
  5. zero-byte    — no selected file is empty (a truncated FTP upload once
                    broke production with two zero-byte files)
  6. version      — APP_VERSION in event.html matches the tag being deployed
  7. sizes        — a size table is emitted for §7 of the roadmap
"""

import fnmatch
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

VERSION = "1.0.0"
_OWNER_MARK = "TipTop​‌Childish​‍Agency​‌MC"  # ownership watermark

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "deploy" / "publish.json"
STAGING = ROOT / "deploy" / "_publish"
VERSION_FILE = ROOT / "event.html"


def fail(message):
    print("FAIL  %s" % message)
    sys.exit(1)


def ok(message):
    print("ok    %s" % message)


def tracked_files():
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True)
    if out.returncode != 0:
        fail("git ls-files failed: %s" % out.stderr.strip())
    return [line for line in out.stdout.splitlines() if line]


def matches(path, pattern):
    """Glob match where '*' never crosses a directory separator."""
    if path.count("/") != pattern.count("/"):
        return False
    return fnmatch.fnmatchcase(path, pattern)


def main():
    print("TipTop deployment preflight v%s" % VERSION)
    print("-" * 60)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    include = manifest["include"]
    forbidden = manifest["must_never_publish"]
    witnesses = manifest["negative_control"]

    everything = tracked_files()
    if not everything:
        fail("no tracked file found")

    selected = sorted(f for f in everything if any(matches(f, p) for p in include))
    if not selected:
        fail("the allowlist selected no file")
    ok("allowlist: %d of %d tracked files selected" % (len(selected), len(everything)))

    # Control 3 — forbidden prefixes and markdown must never reach the server.
    leaked = [f for f in selected
              if f.endswith(".md") or any(f == p or f.startswith(p) for p in forbidden)]
    if leaked:
        fail("forbidden paths selected: %s" % leaked)
    ok("no forbidden path selected")

    # Control 4 — negative control: these must exist in the repo AND be excluded.
    for witness in witnesses:
        if witness not in everything:
            fail("negative control is void: %s is not in the repository" % witness)
        if witness in selected:
            fail("negative control failed: %s would have been published" % witness)
    ok("negative control: %d excluded files proven absent from the selection" % len(witnesses))

    # Control 5 — zero-byte files.
    empty = [f for f in selected if (ROOT / f).stat().st_size == 0]
    if empty:
        fail("zero-byte files: %s" % empty)
    ok("no zero-byte file")

    # Control 6 — version declared in the code vs the tag being deployed.
    app_version = None
    for line in VERSION_FILE.read_text(encoding="utf-8").splitlines():
        if "APP_VERSION" in line and "=" in line:
            app_version = line.split('"')[1] if '"' in line else None
            break
    if not app_version:
        fail("APP_VERSION not found in event.html")
    ref = os.environ.get("GITHUB_REF", "")
    if ref.startswith("refs/tags/"):
        tag = ref[len("refs/tags/"):].lstrip("v")
        if tag != app_version:
            fail("version mismatch: tag v%s, APP_VERSION %s" % (tag, app_version))
        ok("version: tag v%s matches APP_VERSION" % tag)
    else:
        ok("version: APP_VERSION %s (no tag on this run, comparison skipped)" % app_version)

    # Staging — the FTP step uploads this directory and nothing else.
    if STAGING.exists():
        shutil.rmtree(STAGING)
    total = 0
    rows = []
    for f in selected:
        destination = STAGING / f
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / f, destination)
        size = destination.stat().st_size
        total += size
        rows.append((f, size))
    staged = sorted(str(p.relative_to(STAGING)) for p in STAGING.rglob("*") if p.is_file())
    if staged != selected:
        fail("staging differs from the selection (%d staged, %d selected)"
             % (len(staged), len(selected)))
    ok("staging: %d files, %d bytes, verified against the selection" % (len(selected), total))

    # Control 7 — size table, for §7 of the roadmap.
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write("### Fichiers déposés — version %s\n\n" % app_version)
            fh.write("| Fichier | Octets |\n|---|--:|\n")
            for name, size in rows:
                fh.write("| `%s` | %d |\n" % (name, size))
            fh.write("\n**%d fichiers, %d octets.**\n" % (len(rows), total))
    print("-" * 60)
    print("PREFLIGHT PASSED — %d files ready in deploy/_publish/" % len(rows))


if __name__ == "__main__":
    main()
