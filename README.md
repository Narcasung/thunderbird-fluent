# thunderbird-fluent

A Fluent 2 (Windows 11 / WinUI 3) theme for Thunderbird 153 ESR, written as a
`userChrome.css` module set.

Not a packaged extension. Thunderbird's store "themes" are static themes
(`manifest.json` `"theme"` key: colours and images only) and cannot do layout,
corner radii, glyph substitution, or state selectors — strictly less capable
than this. See `docs/handoff-mica.md` for that comparison and the conditions
under which switching to a MailExtension would actually pay off.

## Layout

```
chrome/     the deployable stylesheets — mirrors the profile chrome/ folder
tools/      capture.ps1 (screenshots), sync.ps1 (repo <-> profile)
docs/       handoff notes from prior working sessions
profile/    user.js — the Mica prefs, deployed to the profile root
```

`chrome/userChrome.css` is the entry point: module imports, the light/dark
switch, and nothing else.

**Design rationale lives in the CSS files themselves, as comments.** Read
`chrome/fluent-tokens.css` first — it is the source of truth for palette,
geometry, elevation, motion, and typography, and every other module consumes
its tokens. Do not re-derive the design from the docs folder.

## Install

Thunderbird only reads from the profile. This repo is history; the profile is
what runs.

1. Set `toolkit.legacyUserProfileCustomizations.stylesheets` to `true`
   (Settings > General > Config Editor).
2. Copy `chrome/*.css` into
   `%APPDATA%\Thunderbird\Profiles\<profile>\chrome\`, or run
   `tools\sync.ps1 -Push`.
3. Copy `profile/user.js` into the profile root — beside `prefs.js`, not in
   `chrome/`. It carries the three Mica prefs; without them the theme still
   renders, but every transparent surface degrades to its opaque fallback and
   there is no backdrop. `prefs.js` is rewritten on quit, which is why these
   live in `user.js`.
4. Restart Thunderbird. There is no hot reload — every CSS change needs a full
   restart.

To disable: close Thunderbird, rename the profile's `chrome` folder, reopen.
To disable one module: comment out its `@import` in `userChrome.css`.

## Working on it

```powershell
tools\sync.ps1              # report differences only, changes nothing
tools\sync.ps1 -Pull        # profile -> repo, capture iteration
tools\sync.ps1 -Push        # repo -> profile, deploy
tools\capture.ps1 -Name x   # screenshot the Thunderbird window
tools\capture.ps1 -DelaySeconds 6   # ...with time to open a menu first
```

Verify by pixel-sampling captures with `System.Drawing`, not by eyeballing
zoomed crops — reading colour off a crop produced two wrong conclusions early
on, and sampling settled both immediately.

## Status

| Area | State |
|---|---|
| Tier 1–2: 3-pane, chrome, tabs, lists, icons | Shipped, verified light + dark |
| Tier 3: Calendar | Shipped, verified light + dark |
| Tier 3: Settings, Address Book, Account Settings | Abandoned — see below |
| Mica backdrop: window, menus, 3-pane gutters | Shipped, verified by pixel-sampling |
| Mica backdrop: Calendar tab | Shipped, verified by pixel-sampling |
| Tier 4: message content (`userContent.css`) | Out of scope by decision |

Transparency is gated on the `-moz-windows-mica` and `-moz-windows-mica-popups`
media features, so the theme degrades to opaque by itself when the backdrop is
off, unsupported, or dropped by DWM. Install step 3 is what turns it on.

## Why three pages could not be themed

The blocker is the hosting `<browser>` element's `type`, not how the `about:`
page is registered — all four are plain `ALLOW_SCRIPT` in
`AboutRedirector.sys.mjs`.

| Surface | Docshell | Sheet that reaches it |
|---|---|---|
| `about:3pane`, `about:message` | chrome (no `type` attribute → default) | `userChrome.css` |
| `about:preferences` | content (`#preferencesbrowser type="content"`) | `userContent.css` |
| `about:accountsettings` | content (`openTab("contentTab", …)`) | `userContent.css` |
| `about:addressbook` | content | `userContent.css` |

Verified against `messenger.xhtml` and `specialTabs.js` in TB 153's `omni.ja`.
This is exactly why the 3-pane work succeeded and those three failed.

Anyone resuming should know: `userContent.css` was already proven to load and
reach `about:preferences`. The unresolved question is scoping. That sheet also
hits message display, which is Tier 4 and deliberately out of scope, so rules
there must be scoped — via `@-moz-document url-prefix(...)` (the at-rule and
`url-prefix` are both still present in `xul.dll`) or via a page-unique
selector.

Fingerprint for "no override landed": TB 153 dark stock
`--layout-background-0` is `#18181b` and `-1` is `#27272a`. Sampling those
exact values means the sheet never applied.

## Environment this was built against

- Thunderbird 153.1.0 (mozilla-esr153). It auto-updated from 140.13.0 partway
  through the first session, invalidating notes taken from the old `omni.ja` —
  verify structure against the installed archive rather than memory.
- Windows 11 Pro 22631. The machine's accent is a desaturated slate
  (`#4A5459`), which is why selection tints look muted; the tint percentages in
  `fluent-tokens.css` are raised to compensate and should be lowered toward
  Fluent's spec 12%/24% under a vivid accent.
