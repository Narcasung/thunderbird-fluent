"""Vendor Fluent icons into the repo.

Downloads once from microsoft/fluentui-system-icons, rewrites the hardcoded
fill to Gecko's context-fill keyword, and writes the result under icons/fluent/.
Nothing here runs at theme runtime; this is authoring-time only.
"""

import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

RAW = ("https://raw.githubusercontent.com/microsoft/fluentui-system-icons"
       "/main/assets/{folder}/SVG/{stem}_{size}_filled.svg")

OUT = Path(__file__).resolve().parent.parent / "icons" / "fluent"

# TB --icon-* token  ->  Microsoft icon folder name.
# Ranked by how many places the token is referenced in Thunderbird's skin.
MAP = {
    "nav-down-sm":  "Chevron Down",
    "nav-up-sm":    "Chevron Up",
    "nav-left-sm":  "Chevron Left",
    "nav-right-sm": "Chevron Right",
    "trash":        "Delete",
    "search":       "Search",
    "mail":         "Mail",
    "address-book": "Book Contacts",
    "folder":       "Folder",
    "spam":         "Shield Prohibited",
    "calendar":     "Calendar LTR",
    "globe":        "Globe",
    "close":        "Dismiss",
    "chat":         "Chat",
    "archive":      "Archive",
    "tasks":        "Task List Square LTR",
    "check":        "Checkmark",
    "add":          "Add",
    "more":         "More Horizontal",
    "print":        "Print",
    "tag":          "Tag",
    "sync":         "Arrow Sync",
    "filter":       "Filter",
    "pencil":       "Edit",
}


def stem(folder):
    return "ic_fluent_" + re.sub(r"[^a-z0-9]+", "_", folder.lower()).strip("_")


def fetch(folder, size):
    url = RAW.format(folder=urllib.parse.quote(folder), stem=stem(folder), size=size)
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return r.read().decode("utf-8")
    except Exception:
        return None


def contextify(svg):
    """Every hardcoded fill becomes context-fill so Gecko paints it with the
    theme colour, exactly the way Thunderbird's own icons are painted."""
    svg = re.sub(r'fill="#[0-9A-Fa-f]{3,8}"', 'fill="context-fill"', svg)
    # The root element carries fill="none"; leave it, it is the canvas.
    return svg


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ok, failed = 0, []
    for token, folder in MAP.items():
        svg = fetch(folder, 16) or fetch(folder, 20)
        if svg is None:
            failed.append((token, folder))
            continue
        if "context-fill" not in contextify(svg):
            failed.append((token, folder + " (no fill to rewrite)"))
            continue
        (OUT / f"{token}.svg").write_text(contextify(svg), encoding="utf-8")
        ok += 1
    print(f"vendored {ok}/{len(MAP)} into {OUT}")
    for token, folder in failed:
        print(f"  FAILED  {token:14s} <- {folder}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
