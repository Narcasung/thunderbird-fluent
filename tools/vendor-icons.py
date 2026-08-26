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
       "/main/assets/{folder}/SVG/{stem}_{size}_{style}.svg")

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

    # --- navigation / chrome furniture -------------------------------------
    "nav-back": "Arrow Left",
    "nav-forward": "Arrow Right",
    "nav-left": "Chevron Left",
    "nav-right": "Chevron Right",
    "nav-down": "Chevron Down",
    "nav-up": "Chevron Up",
    "nav-down-xs": "Chevron Down",
    "nav-up-xs": "Chevron Up",
    "ascending-xs": "Chevron Up",
    "descending-xs": "Chevron Down",
    "kebab": "More Vertical",
    "more-md": "More Horizontal",
    "overflow": "More Horizontal",  # check
    "collapse": "Panel Left Contract",  # check
    "close-lg": "Dismiss",
    "close-xs": "Dismiss",
    "maximize-sm": "Maximize",
    "minimize-sm": "Arrow Minimize",  # check
    "restore": "Square Multiple",  # check
    "flexible-space": "Line Horizontal 1",  # check
    # --- mail ---------------------------------------------------------------
    "inbox": "Mail Inbox",
    "sent": "Send",
    "draft": "Document Edit",  # check
    "file-draft": "Document Edit",  # check
    "outbox": "Mail Arrow Up",  # check
    "new-mail": "Mail Edit",  # check
    "mail-lg": "Mail",
    "mail-sm": "Mail",
    "mail-list": "Mail Multiple",  # check
    "mail-secure": "Mail Shield",  # check
    "mail-lock-lg": "Mail Shield",  # check
    "unread": "Mail Unread",  # check
    "unread-sm": "Mail Unread",  # check
    "reply": "Arrow Reply",
    "reply-all": "Arrow Reply All",
    "forward": "Arrow Forward",
    "redirect": "Share",  # check
    "conversation": "Chat Multiple",  # check
    "thread": "Chat Multiple",  # check
    "thread-sm": "Chat Multiple",  # check
    "replies-xs": "Arrow Reply All",  # check
    "newsletter": "News",  # check
    "rss": "RSS",
    "folder-rss": "Folder",  # check
    "folder-filter": "Folder Search",  # check
    "folder-compact-sm": "Folder",
    "template": "Document Copy",  # check
    "quote": "Text Quote",  # check
    "spam-sm": "Shield Prohibited",
    "trash-sm": "Delete",
    "tag-sm": "Tag",
    "attachment": "Attach",
    "attachment-sm": "Attach",
    "priority": "Arrow Up",  # check
    "priority-low": "Arrow Down",  # check
    "receipt": "Receipt",
    # --- people / identity --------------------------------------------------
    "contact": "Person",
    "user": "Person",
    "user-list": "People",
    "new-contact": "Person Add",
    "new-user-list": "People Add",
    "address-book-lg": "Book Contacts",
    "address-book-new-lg": "Book Add",  # check
    "address-book-remote-lg": "Book Globe",  # check
    "new-address-book": "Book Add",  # check
    "id": "Person Board",  # check
    "photo-ban": "Person Prohibited",  # check
    # --- calendar / tasks ---------------------------------------------------
    "new-event": "Calendar Add",
    "calendar-today": "Calendar Today",
    "calendar-lg": "Calendar LTR",
    "nav-today": "Calendar Today",
    "new-task": "Task List Square Add",  # check
    "date-time-sm": "Calendar Clock",  # check
    "clock": "Clock",
    "recurrence": "Arrow Repeat All",  # check
    # --- status / feedback --------------------------------------------------
    "warning": "Warning",
    "warning-sm": "Warning",
    "warning-dialog": "Warning",
    "error-circle": "Error Circle",
    "success": "Checkmark Circle",
    "info": "Info",
    "question": "Question Circle",
    "question-dialog": "Question Circle",
    "loading": "Arrow Clockwise",  # check
    "bell": "Alert",
    "bell-ring": "Alert Badge",  # check
    "notification-sm": "Alert",
    "hidden": "Eye Off",
    "eye": "Eye",
    "dot": "Circle Small",
    "dot-xs": "Circle Small",
    "circle-small": "Circle Small",
    "circle-add-sm": "Add Circle",
    "subtract-circle-sm": "Subtract Circle",
    "checkbox": "Checkbox Unchecked",  # check
    "star": "Star",
    "star-sm": "Star",
    "heart": "Heart",
    "ribbon": "Ribbon",
    "pin": "Pin",
    # --- presence -----------------------------------------------------------
    "status-online": "Presence Available",  # check
    "status-offline": "Presence Offline",  # check
    "status-away": "Presence Away",  # check
    "status-idle": "Presence Away",  # check
    "online": "Presence Available",  # check
    "offline": "Presence Offline",  # check
    "new-chat": "Chat Add",
    "chat-lg": "Chat",
    # --- security -----------------------------------------------------------
    "lock": "Lock Closed",
    "lock-disabled": "Lock Open",  # check
    "key": "Key",
    "new-key": "Key",  # check
    "shield": "Shield",
    "globe-secure": "Globe Shield",  # check
    "handshake": "Handshake",
    # --- files / transfer ---------------------------------------------------
    "file": "Document",
    "download": "Arrow Download",
    "cloud-download": "Cloud Arrow Down",
    "cloud-download-md": "Cloud Arrow Down",
    "import": "Arrow Import",
    "import-lg": "Arrow Import",
    "export": "Arrow Export",
    "export-lg": "Arrow Export",
    "mobile-export-sm": "Phone Arrow Right",  # check
    "copy": "Copy",
    "cut": "Cut",
    "paste": "Clipboard Paste",
    "link": "Link",
    "url": "Link",
    "shortcut": "Open",  # check
    "video-sm": "Video",
    # --- app / settings -----------------------------------------------------
    "settings": "Settings",
    "account-settings": "Person Settings",  # check
    "account-sync": "Arrow Sync",  # check
    "sync-lg": "Arrow Sync",
    "extension": "Puzzle Piece",
    "app-menu": "Line Horizontal 3",  # check
    "app-menu-addon": "Puzzle Piece",  # check
    "tools": "Wrench",
    "quit": "Sign Out",  # check
    "layout": "Layout Column Two",  # check
    "display-options": "Options",
    "column-menu": "Table Settings",  # check
    "density-compact": "Text Density",  # check
    "density-default": "Text Density",  # check
    "density-relaxed": "Text Density",  # check
    "font": "Text Font",  # check
    "spelling": "Text Grammar Checkmark",  # check
    "add-md": "Add",
    "sparkle-star-sm": "Sparkle",  # check
    "sparkle-star-xs": "Sparkle",  # check
    "moon-xs": "Weather Moon",  # check
    "sun-xs": "Weather Sunny",  # check

    # --- rescued from the orphan list ---
    "thread-ignored": "Chat Off",
    "subthread-ignored": "Comment Off",
    "reply-list": "Arrow Reply All",
    "spaces-menu": "Apps",
    "calendar-imip": "Calendar Mail",
    "guest-attending": "Checkmark Circle",
    "guest-declined": "Dismiss Circle",
    "guest-maybe": "Question Circle",
    "tentative": "Question Circle",

    # ---- The 25 tokens the first survey missed --------------------------
    # icons.css declares 223 image-valued --icon-* tokens, not the 198 that
    # earlier passes assumed. The shortfall was invisible until light mode:
    # part 3 pours a 72% fill into whatever art a rule points at, and on
    # OUTLINE art that reads as a dark ring around a filled body, because the
    # stroke stays at full strength. Filled art has no such edge. So every
    # token the fill pass can reach has to BE filled -- leaving one behind is
    # not neutral, it actively breaks it.
    "bell-disabled": "Alert Off",
    "calendar-empty": "Calendar Empty",
    "calendar-invite": "Calendar Mail",           # check
    "clear": "Dismiss Circle",
    "compress": "Arrow Minimize",                 # check
    "download-md": "Arrow Download",
    "event-continue": "Arrow Right",              # check
    "event-end": "Arrow Export",                  # check
    "event-start": "Arrow Import",                # check
    "features": "Sparkle",
    "fingerprint": "Fingerprint",
    "folder-save": "Folder Arrow Right",          # check
    "get-mail": "Arrow Download",                 # check
    "mobile-export-lg": "Phone Arrow Right",
    "new-indicator": "Circle Small",              # check
    "notify": "Alert",
    "paint-brush": "Paint Brush",
    "recurrence-exception": "Arrow Repeat All Off",
    "recurrence-sm": "Arrow Repeat All",
    "remove": "Subtract",                         # check
    "sort": "Arrow Sort",
    "status-away-sm": "Presence Away",
    "status-idle-sm": "Presence Away",
    "status-offline-sm": "Presence Offline",
    "status-online-sm": "Presence Available",
    "upload-sm": "Arrow Upload",

    # ---- Not --icon-* tokens at all -------------------------------------
    # The four --addons-manager-* names with no --icon-* twin. They are given
    # files of their own here so the alias block in fluent-icons.css has
    # something to point at; the Add-ons Manager sidebar is where the dark
    # ring was first spotted, and these were three of the four icons in it.
    "dictionary": "Book Letter",                  # check
    "language": "Local Language",                 # check
    "extension-update-available": "Arrow Sync Circle",   # check
    "extension-update-recent": "History",         # check
}

# Deliberately NOT replaced -- these keep Thunderbird's own art.
#
# The first seven are thread-list column marks: single glyphs encoding WHICH
# combination of replied / forwarded / redirected happened to a message. Fluent
# has no vocabulary for that, and substituting a plain arrow throws the encoding
# away. The rest are cases where the badge, the dot or the brand IS the meaning.
KEEP_STOCK = {
    "reply-col": "column mark: replied",
    "forward-col": "column mark: forwarded",
    "redirect-col": "column mark: redirected",
    "reply-forward-col": "column mark: replied and forwarded",
    "reply-redirect-col": "column mark: replied and redirected",
    "forward-redirect-col": "column mark: forwarded and redirected",
    "reply-forward-redirect-col": "column mark: all three",
    "nav-down-unread": "chevron carrying an unread dot -- the dot is the point",
    "nav-up-unread": "chevron carrying an unread dot -- the dot is the point",
    "app-menu-badged": "app menu with an update badge -- the badge is the point",
    "event-status": "event state marker, no Fluent counterpart",
    "thundermail-lg": "Thundermail brand mark, not furniture",
}


def stem(folder):
    return "ic_fluent_" + re.sub(r"[^a-z0-9]+", "_", folder.lower()).strip("_")


def fetch(folder, size, style="filled"):
    url = RAW.format(folder=urllib.parse.quote(folder), stem=stem(folder),
                     size=size, style=style)
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return r.read().decode("utf-8")
    except Exception:
        return None


def fetch_any(folder):
    """16px filled, then 20px, then the regular cut at either size.

    The regular fallback is not a compromise everywhere it fires. A few icons
    ship no filled variant at all because filling them would destroy what they
    mean -- Presence Offline is an empty ring, and a filled ring is Presence
    Available. Where upstream declined to draw one, upstream is right."""
    for size in (16, 20):
        if svg := fetch(folder, size):
            return svg
    for size in (16, 20):
        if svg := fetch(folder, size, "regular"):
            return svg
    return None


def contextify(svg):
    """Every hardcoded fill becomes context-fill so Gecko paints it with the
    theme colour, exactly the way Thunderbird's own icons are painted."""
    svg = re.sub(r'fill="#[0-9A-Fa-f]{3,8}"', 'fill="context-fill"', svg)
    # The root element carries fill="none"; leave it, it is the canvas.
    return svg



def write_sheet(ok_names):
    """A reviewable table of what maps to what, regenerated on every run."""
    out = [
        "# Icon mapping",
        "",
        "Generated by `tools/vendor-icons.py`. **The script's `MAP` is the source",
        "of truth** -- edit it there and re-run, not this file.",
        "",
        f"{len(MAP)} of Thunderbird's 198 image-valued `--icon-*` tokens are replaced;",
        f"{len(KEEP_STOCK)} deliberately keep stock art.",
        "",
        "`<token>.svg` overrides Thunderbird's `--icon-<token>`.",
        "",
        "| Token | Upstream icon |",
        "|---|---|",
    ]
    for token in sorted(MAP):
        mark = "" if token in ok_names else " **(not vendored)**"
        out.append(f"| `{token}` | {MAP[token]}{mark} |")
    out += ["", "## Left as Thunderbird's own", "", "| Token | Why |", "|---|---|"]
    for token in sorted(KEEP_STOCK):
        out.append(f"| `{token}` | {KEEP_STOCK[token]} |")
    out.append("")
    (OUT.parent / "MAPPING.md").write_text("\n".join(out), encoding="utf-8")

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ok, failed = 0, []
    for token, folder in MAP.items():
        svg = fetch_any(folder)
        if svg is None:
            failed.append((token, folder))
            continue
        if "context-fill" not in contextify(svg):
            failed.append((token, folder + " (no fill to rewrite)"))
            continue
        (OUT / f"{token}.svg").write_text(contextify(svg), encoding="utf-8")
        ok += 1
    write_sheet({p.stem for p in OUT.glob("*.svg")})
    print(f"vendored {ok}/{len(MAP)} into {OUT}")
    for token, folder in failed:
        print(f"  FAILED  {token:14s} <- {folder}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
