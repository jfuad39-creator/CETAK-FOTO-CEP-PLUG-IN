#!/usr/bin/env python3
"""Static validation for the AI-friendly CEP repository.

No external dependencies. Safe to run before committing or packaging.
"""
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
errors = []
warnings = []

def require(rel):
    p = ROOT / rel
    if not p.exists():
        errors.append(f"Missing required file: {rel}")
    return p

# Required package files
for rel in [
    "CSXS/manifest.xml",
    "src/client/index.html",
    "src/client/js/state.js",
    "src/client/js/bridge.js",
    "src/client/js/layout-engine.js",
    "src/client/js/core.js",
    "src/client/js/photos.js",
    "src/client/js/order.js",
    "src/client/js/preview.js",
    "src/client/js/generate.js",
    "src/client/js/editor.js",
    "src/client/js/app.js",
    "src/host/main.jsx",
    "src/vendor/CSInterface.js",
]:
    require(rel)

# Manifest XML
manifest = ROOT / "CSXS/manifest.xml"
if manifest.exists():
    try:
        ET.parse(manifest)
    except Exception as exc:
        errors.append(f"Invalid manifest XML: {exc}")
    text = manifest.read_text(encoding="utf-8", errors="replace")
    for path in re.findall(r"<(?:MainPath|ScriptPath|Icon[^>]*)>([^<]+)</", text):
        rel = path.replace("./", "", 1)
        if not (ROOT / rel).exists():
            errors.append(f"Manifest path does not exist: {path}")

# Client script references
html = ROOT / "src/client/index.html"
if html.exists():
    text = html.read_text(encoding="utf-8", errors="replace")
    scripts = re.findall(r'<script[^>]+src="([^"]+)"', text)
    for src in scripts:
        if src.startswith(("http://", "https://")):
            continue
        p = (html.parent / src).resolve()
        if not p.exists():
            errors.append(f"Missing client script: {src}")

    expected = [
        "../vendor/CSInterface.js",
        "js/state.js",
        "js/bridge.js",
        "js/layout-engine.js",
        "js/core.js",
        "js/photos.js",
        "js/order.js",
        "js/preview.js",
        "js/generate.js",
        "js/editor.js",
        "js/app.js",
    ]
    if scripts != expected:
        errors.append(
            "Unexpected client script order.\n"
            f"Expected: {expected}\nActual:   {scripts}"
        )

# Simple source checks
for rel in [
    "src/client/js/state.js",
    "src/client/js/bridge.js",
    "src/client/js/layout-engine.js",
    "src/client/js/core.js",
    "src/client/js/photos.js",
    "src/client/js/order.js",
    "src/client/js/preview.js",
    "src/client/js/generate.js",
    "src/client/js/editor.js",
    "src/client/js/app.js",
]:
    p = ROOT / rel
    if p.exists():
        text = p.read_text(encoding="utf-8", errors="replace")
        if "\x00" in text:
            errors.append(f"NUL byte found in {rel}")

# High-risk source should remain intact
host = ROOT / "src/host/main.jsx"
if host.exists():
    text = host.read_text(encoding="utf-8", errors="replace")
    if "#target illustrator" not in text:
        warnings.append("Host main.jsx does not contain '#target illustrator'.")

# No common junk
for p in ROOT.rglob("*"):
    if p.is_file() and p.name in {".DS_Store", "Thumbs.db"}:
        warnings.append(f"Repository junk file: {p.relative_to(ROOT)}")

if warnings:
    print("Warnings:")
    for item in warnings:
        print("  -", item)

if errors:
    print("Validation FAILED:")
    for item in errors:
        print("  -", item)
    sys.exit(1)

print("Validation OK.")
print(f"Repository: {ROOT}")
