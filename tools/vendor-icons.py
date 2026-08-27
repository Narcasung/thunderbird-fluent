"""Vendor Fluent icons into icons/fluent/, rewriting each hardcoded fill to
context-fill so Gecko paints them with the theme colour. Authoring-time only --
nothing here runs at theme runtime."""

import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

RAW = ("https://raw.githubusercontent.com/microsoft/fluentui-system-icons"
       "/main/assets/{folder}/SVG/{stem}_{size}_{style}.svg")

OUT = Path(__file__).resolve().parent.parent / "icons" / "fluent"

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
    "overflow": "More Horizontal",
    "collapse": "Panel Left Contract",
    "close-lg": "Dismiss",
    "close-xs": "Dismiss",
    "maximize-sm": "Maximize",
    "minimize-sm": "Arrow Minimize",
    "restore": "Square Multiple",
    "flexible-space": "Line Horizontal 1",

    "inbox": "Mail Inbox",
    "sent": "Send",
    "draft": "Document Edit",
    "file-draft": "Document Edit",
    "outbox": "Mail Arrow Up",
    "new-mail": "Mail Edit",
    "mail-lg": "Mail",
    "mail-sm": "Mail",
    "mail-list": "Mail Multiple",
    "mail-secure": "Mail Shield",
    "mail-lock-lg": "Mail Shield",
    "unread": "Mail Unread",
    "unread-sm": "Mail Unread",
    "reply": "Arrow Reply",
    "reply-all": "Arrow Reply All",
    "forward": "Arrow Forward",
    "redirect": "Share",
    "conversation": "Chat Multiple",
    "thread": "Chat Multiple",
    "thread-sm": "Chat Multiple",
    "replies-xs": "Arrow Reply All",
    "newsletter": "News",
    "rss": "RSS",
    "folder-rss": "Folder",
    "folder-filter": "Folder Search",
    "folder-compact-sm": "Folder",
    "template": "Document Copy",
    "quote": "Text Quote",
    "spam-sm": "Shield Prohibited",
    "trash-sm": "Delete",
    "tag-sm": "Tag",
    "attachment": "Attach",
    "attachment-sm": "Attach",
    "priority": "Arrow Up",
    "priority-low": "Arrow Down",
    "receipt": "Receipt",

    "contact": "Person",
    "user": "Person",
    "user-list": "People",
    "new-contact": "Person Add",
    "new-user-list": "People Add",
    "address-book-lg": "Book Contacts",
    "address-book-new-lg": "Book Add",
    "address-book-remote-lg": "Book Globe",
    "new-address-book": "Book Add",
    "id": "Person Board",
    "photo-ban": "Person Prohibited",

    "new-event": "Calendar Add",
    "calendar-today": "Calendar Today",
    "calendar-lg": "Calendar LTR",
    "nav-today": "Calendar Today",
    "new-task": "Task List Square Add",
    "date-time-sm": "Calendar Clock",
    "clock": "Clock",
    "recurrence": "Arrow Repeat All",

    "warning": "Warning",
    "warning-sm": "Warning",
    "warning-dialog": "Warning",
    "error-circle": "Error Circle",
    "success": "Checkmark Circle",
    "info": "Info",
    "question": "Question Circle",
    "question-dialog": "Question Circle",
    "loading": "Arrow Clockwise",
    "bell": "Alert",
    "bell-ring": "Alert Badge",
    "notification-sm": "Alert",
    "hidden": "Eye Off",
    "eye": "Eye",
    "dot": "Circle Small",
    "dot-xs": "Circle Small",
    "circle-small": "Circle Small",
    "circle-add-sm": "Add Circle",
    "subtract-circle-sm": "Subtract Circle",
    "checkbox": "Checkbox Unchecked",
    "star": "Star",
    "star-sm": "Star",
    "heart": "Heart",
    "ribbon": "Ribbon",
    "pin": "Pin",

    "status-online": "Presence Available",
    "status-offline": "Presence Offline",
    "status-away": "Presence Away",
    "status-idle": "Presence Away",
    "online": "Presence Available",
    "offline": "Presence Offline",
    "new-chat": "Chat Add",
    "chat-lg": "Chat",

    "lock": "Lock Closed",
    "lock-disabled": "Lock Open",
    "key": "Key",
    "new-key": "Key",
    "shield": "Shield",
    "globe-secure": "Globe Shield",
    "handshake": "Handshake",

    "file": "Document",
    "download": "Arrow Download",
    "cloud-download": "Cloud Arrow Down",
    "cloud-download-md": "Cloud Arrow Down",
    "import": "Arrow Import",
    "import-lg": "Arrow Import",
    "export": "Arrow Export",
    "export-lg": "Arrow Export",
    "mobile-export-sm": "Phone Arrow Right",
    "copy": "Copy",
    "cut": "Cut",
    "paste": "Clipboard Paste",
    "link": "Link",
    "url": "Link",
    "shortcut": "Open",
    "video-sm": "Video",

    "settings": "Settings",
    "account-settings": "Person Settings",
    "account-sync": "Arrow Sync",
    "sync-lg": "Arrow Sync",
    "extension": "Puzzle Piece",
    "app-menu": "Line Horizontal 3",
    "app-menu-addon": "Puzzle Piece",
    "tools": "Wrench",
    "quit": "Sign Out",
    "layout": "Layout Column Two",
    "display-options": "Options",
    "column-menu": "Table Settings",
    "density-compact": "Text Density",
    "density-default": "Text Density",
    "density-relaxed": "Text Density",
    "font": "Text Font",
    "spelling": "Text Grammar Checkmark",
    "add-md": "Add",
    "sparkle-star-sm": "Sparkle",
    "sparkle-star-xs": "Sparkle",
    "moon-xs": "Weather Moon",
    "sun-xs": "Weather Sunny",

    "thread-ignored": "Chat Off",
    "subthread-ignored": "Comment Off",
    "reply-list": "Arrow Reply All",
    "spaces-menu": "Apps",
    "calendar-imip": "Calendar Mail",
    "guest-attending": "Checkmark Circle",
    "guest-declined": "Dismiss Circle",
    "guest-maybe": "Question Circle",
    "tentative": "Question Circle",

    "bell-disabled": "Alert Off",
    "calendar-empty": "Calendar Empty",
    "calendar-invite": "Calendar Mail",
    "clear": "Dismiss Circle",
    "compress": "Arrow Minimize",
    "download-md": "Arrow Download",
    "event-continue": "Arrow Right",
    "event-end": "Arrow Export",
    "event-start": "Arrow Import",
    "features": "Sparkle",
    "fingerprint": "Fingerprint",
    "folder-save": "Folder Arrow Right",
    "get-mail": "Arrow Download",
    "mobile-export-lg": "Phone Arrow Right",
    "new-indicator": "Circle Small",
    "notify": "Alert",
    "paint-brush": "Paint Brush",
    "recurrence-exception": "Arrow Repeat All Off",
    "recurrence-sm": "Arrow Repeat All",
    "remove": "Subtract",
    "sort": "Arrow Sort",
    "status-away-sm": "Presence Away",
    "status-idle-sm": "Presence Away",
    "status-offline-sm": "Presence Offline",
    "status-online-sm": "Presence Available",
    "upload-sm": "Arrow Upload",

    "dictionary": "Book Letter",
    "language": "Local Language",
    "extension-update-available": "Arrow Sync Circle",
    "extension-update-recent": "History",
}

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

    for size in (16, 20):
        if svg := fetch(folder, size):
            return svg
    for size in (16, 20):
        if svg := fetch(folder, size, "regular"):
            return svg
    return None

def contextify(svg):

    svg = re.sub(r'fill="#[0-9A-Fa-f]{3,8}"', 'fill="context-fill"', svg)

    return svg

def write_sheet(ok_names):

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
