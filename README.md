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
| Tier 3: Account Settings, Address Book | Shipped (`userContent.css`), verified dark by pixel-sampling; light not yet checked |
| Tier 3: Settings, Advanced Preferences, Add-ons Manager | Reachable and measured, not themed — see below |
| Mica backdrop: window, menus, 3-pane gutters | Shipped, verified by pixel-sampling |
| Mica backdrop: Calendar tab | Shipped, verified by pixel-sampling |
| Mica backdrop: content tabs | Not reachable — see below |
| Tier 4: message content | Out of scope by decision — `userContent.css` is scoped away from it |

Transparency is gated on the `-moz-windows-mica` and `-moz-windows-mica-popups`
media features, so the theme degrades to opaque by itself when the backdrop is
off, unsupported, or dropped by DWM. Install step 3 is what turns it on.

## The content tabs

Five pages live in content-type docshells, so `userChrome.css` cannot reach
them and `userContent.css` is the only sheet that can. The blocker was never
how the `about:` page is registered — all of them are plain `ALLOW_SCRIPT` in
`AboutRedirector.sys.mjs` — it is the hosting `<browser>` element's `type`.

| Surface | Docshell | Sheet that reaches it |
|---|---|---|
| `about:3pane`, `about:message` | chrome (no `type` attribute → default) | `userChrome.css` |
| `about:preferences` | content (`#preferencesbrowser type="content"`) | `userContent.css` |
| `about:accountsettings` | content (`openTab("contentTab", …)`) | `userContent.css` |
| `about:addressbook` | content | `userContent.css` |
| `about:config`, `about:addons` | content | `userContent.css` |

Verified against `messenger.xhtml`, `specialTabs.js` and `AboutRedirector.sys.mjs`
in TB 153's `omni.ja`.

Everything below was settled by canary — loud-colour rules pushed to the
profile and pixel-sampled — rather than by reading source, and each answer
cost a restart. Don't re-derive them:

- **Scope on `about:`, not on the chrome URL.** Every page matched its
  `about:` URI. Blocks keyed on the `chrome://` URL the page is served from
  fired on nothing, on all five.
- **Per-page `@-moz-document url-prefix()` solves the Tier 4 problem.**
  `userContent.css` also hits message display, which is out of scope; message
  docshells never carry these `about:` URIs. Every rule in that file is scoped
  and none may be added unscoped.
- **Account Settings is two documents.** `AccountManager.xhtml` is a shell
  around `<iframe id="contentFrame">` holding
  `chrome://messenger/content/am-*.xhtml`, where every actual setting lives.
  The `about:` scope reaches 10% of the surface; the `am-` prefix reaches 78%.
- **Nested `chrome://` documents inside a content docshell are reachable.**
  Proven on the `am-*` panes and on Settings' `dialogFrame`. Scope any further
  sub-dialog by its chrome path — no restart needed to find out.
- **Mica does NOT reach a content docshell, and `#1C1B22` is the trap.**
  Transparency does not cross a content browser, so dropping a content page's
  background exposes Gecko's default canvas — `#1C1B22` in dark, which is
  `--color-gray-90` in `design-system/tokens-shared.css`, not a backdrop
  colour. It has B > R,G, so beside our flat `#202020` it reads exactly like a
  Mica sample. Two checks separate them: a real backdrop **varies** with what
  is behind the window (this was identical at 16 points across 1500px and
  100% of every row band over 300px of height), and the chrome that does get
  the backdrop sampled `#1D1D1D` in the same capture. Do not use "is it
  blue-tinted" as the test. No user sheet can change this — the canvas colour
  comes from the docshell, not the cascade.
- **Custom properties do not cross a document boundary.** `fluent-tokens.css`
  reaches none of these pages; each document restates the palette. That is why
  `userContent.css` carries its own `color-scheme`, which must be kept equal to
  the switch in `userChrome.css`.

Three token vocabularies meet on these pages, and all three need mapping or
half the surface stays stock: messenger's `--layout-*` ladder, messenger's
`--color-*-base` semantics, and toolkit's Acorn tokens
(`--background-color-box`, `--border-color`, `--button-*`, `--border-radius-*`).
The chrome modules only ever needed the first. `userContent.css`'s shared block
maps all three; Settings, Advanced Preferences and Add-ons Manager are built on
the Acorn layer almost entirely, so adding their `about:` URIs to that block's
selector list is most of what they need.

Add-ons Manager has one known gap: `addon-updates-message` and
`message-bar-stack` are shadow DOM. Its core UI (`addon-card`, `categories-box`,
`addon-page-header`) is light DOM and reachable.

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
