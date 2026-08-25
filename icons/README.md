# Icons

Vendored from [microsoft/fluentui-system-icons][repo] (MIT). Filled variants,
16px where available.

Nothing here is fetched at runtime, and nothing is fetched at build time
either. `tools/vendor-icons.py` downloads and rewrites them once, on demand;
the results are committed and are the source of truth from then on.

## The one edit made to each file

Upstream ships every path with a hardcoded `fill="#212121"`. That ignores the
theme and renders near-black on dark chrome. Each one is rewritten to
`fill="context-fill"`, which is what Thunderbird's own icons carry and what
lets Gecko paint them with the surrounding colour.

## How they reach Thunderbird

Not as `data:` URIs — Gecko refuses context-paint to those and the glyphs come
out solid black. The add-on copies this folder into `<profile>/chrome/icons/`
and registers `resource://thunderbird-fluent/` against it, which is a
privileged URL and does resolve `context-fill`. See THE ICON SET in
`extension/api.js`.

## THREE FILES ARE CURRENTLY A TEST — do not re-run the vendor script

Stock's rules put the full-strength colour on `stroke` and only a 20%-alpha
wash on `fill`, because Thunderbird's own art is outline art. Filled art is all
fill, so it lands at 20% and reads as a smudge. Which context keyword our paths
should claim is being measured, three ways at once:

| File | Declares | Asking |
|---|---|---|
| `spam.svg` | `context-fill` | control — the faint result we already have |
| `trash.svg` | `context-stroke` | does claiming stroke get full strength for free? |
| `archive.svg` | both, stroke drawn over fill | does carrying both cover either kind of site? |

If `context-stroke` holds everywhere, the whole fill problem costs zero CSS. If
it only holds where stock declares stroke, the dual-path form is the fallback.
`tools/vendor-icons.py` writes `context-fill` for every file and would flatten
all three back — leave it alone until this is settled.

## Mapping

`<token>.svg` is the file that overrides Thunderbird's `--icon-<token>`.
Where the name differs from upstream's, the upstream folder is listed.

| Token | Upstream icon |
|---|---|
| `add` | Add |
| `address-book` | Book Contacts |
| `archive` | Archive |
| `calendar` | Calendar LTR |
| `chat` | Chat |
| `check` | Checkmark |
| `close` | Dismiss |
| `filter` | Filter |
| `folder` | Folder |
| `globe` | Globe |
| `mail` | Mail |
| `more` | More Horizontal |
| `nav-down-sm` | Chevron Down |
| `nav-left-sm` | Chevron Left |
| `nav-right-sm` | Chevron Right |
| `nav-up-sm` | Chevron Up |
| `pencil` | Edit |
| `print` | Print |
| `search` | Search |
| `spam` | Shield Prohibited |
| `sync` | Arrow Sync |
| `tag` | Tag |
| `tasks` | Task List Square LTR |
| `trash` | Delete |

24 of 198. The remaining tokens are listed, with their use counts, in the
notes referenced from `chrome/fluent-icons.css`.

[repo]: https://github.com/microsoft/fluentui-system-icons
