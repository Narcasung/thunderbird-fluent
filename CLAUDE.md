# thunderbird-fluent

A Fluent 2 / WinUI 3 theme for Thunderbird 153 ESR, shipped as one add-on that
writes CSS into the profile's `chrome/` folder.

The source files carry almost no comments on purpose. Everything below is the
part that is expensive to rediscover: things that were measured, things that
were tried and failed, and rules that look arbitrary until you break one. Full
reasoning for any of it is in git history before the comment strip.

## Layout

| Path | What |
|---|---|
| `chrome/userChrome.css` | entry point, `@import` hub, colour-scheme switch |
| `chrome/userContent.css` | content tabs (Settings, Address Book, Add-ons, about:config, Import, Saved Files) |
| `chrome/fluent-*.css` | the chrome modules |
| `chrome/fluent-icons*.css` | icon token overrides + the fill pass |
| `extension/api.js` | Experiment API: transparency bridge, deploy, resource:// host |
| `tools/pack-extension.ps1` | build to `dist/thunderbird-fluent.zip` |
| `tools/sync.ps1 -Push` | push `chrome/` straight into the profile during dev |
| `tools/vendor-icons.py` | authoring-time icon vendoring, not runtime |

## Build and deploy

`pack-extension.ps1` stages `extension/` + a copy of `chrome/` + `icons/fluent/`
and generates `chrome-files.json` / `icon-files.json` from a glob, so adding a
CSS module or an SVG needs no code edit anywhere.

**The manifest must be at the archive ROOT.** Nesting it one level down gives an
unhelpful "corrupt" error on install.

**The deploy is version-gated.** `api.js` returns early when the add-on's
version equals `PREF_DEPLOYED_VERSION`. This exists so `sync.ps1 -Push` edits
are not silently reverted at the next startup — but it also means **any change
under `chrome/` or `icons/` needs a version bump to reach a profile.** Repacking
at the same version ships a no-op. This has cost several rounds of "the fix
didn't work".

Gecko reads the profile's `chrome/` folder *during* startup, so a deploy always
takes effect at the *next* launch. That is why installing ends with a restart.

**Ship `.zip`, not `.xpi`.** GitHub types a release asset from its filename
extension and ignores the `Content-Type` the upload sends (measured — reuploading
with `application/octet-stream` came back typed `application/x-xpinstall`). It
serves `.xpi` as `x-xpinstall` with `content-disposition: inline`, so Firefox
hands the click to its own add-on installer instead of downloading. Every other
extension gets `attachment`. Nothing is lost: XPInstall reads the archive rather
than trusting its name, and Thunderbird's picker already filters
`*.xpi;*.jar;*.zip` (toolkit `aboutaddons-utils.mjs`).

The README links `releases/latest/download/thunderbird-fluent.zip`, which only
works while the asset filename stays exactly that. Never put a version in it.

## CSS cascade rules

These are user sheets. Author-normal beats user-normal, so nearly every
declaration needs `!important` to reach a surface Thunderbird also sets.

1. **`@import` must come before any style rule.** CSS silently drops an
   `@import` that follows one — which disables every module at once.
2. **No `@namespace`.** Thunderbird's chrome mixes XUL and HTML; declaring XUL
   as default stops `body`, `div`, `hr` from matching anything. This also means
   a generated selector list must never carry an `html|` prefix.
3. **One invalid selector invalidates the whole comma list.** A single bad
   selector silently drops all its siblings. This has happened twice.
4. **User-origin `!important` beats author at any specificity** — which is how
   the broad fill rules ended up overriding stock's deliberate
   `fill: transparent` states, e.g. the unread dot (`--read-status-fill`).
5. **An element's own custom-property declaration beats an inherited one**
   regardless of origin. That is why `--button-icon-fill` and friends are
   redefined on `*` and not on `:root`.
6. **A `*/` inside comment prose ends the comment early.** Found live in
   `fluent-calendar.css`: `--color-gray-*/--color-ink-*` terminated the file
   header, and the `:root { --selected-item-color … }` rule right after it was
   swallowed as the body of a bogus rule and never applied. Fixed by the comment
   strip. If a rule seems inert, check what is above it.

`chrome/` is scoped to chrome documents; `userContent.css` scopes **everything**
inside `@-moz-document`, so rendered mail is never touched. Keep it that way.

## The colour-scheme switch

`extensions.thunderbird-fluent.colorScheme` is `system` | `light` | `dark`, read
by the sheets through `@media -moz-pref(...)` and by `api.js`. Gecko
re-evaluates pref media queries live.

`-moz-pref` can only test a pref against **one literal value** — there is no
less-than form and no way to read a pref as a number. So the transparency
setting is discrete steps, each needing its own block in `fluent-tokens.css`,
and `options.html`'s slider `min`/`step` must list exactly the same set. A value
that reaches the pref with no block behind it paints nothing and looks broken.

**The pref also swaps Thunderbird's own built-in theme**, and it has to.
Thunderbird's colours arrive as `--lwt-*` properties injected on the chrome root
by `LightweightThemeConsumer` — no media query, no cascade reaches them.
Measured: with the Dark theme selected, light mode left the tab strip, toolbars,
menupopups, calendar and chat dark against a light window. The user's original
theme is recorded on first run and restored on uninstall.

Corollary for the README: users must **not** change Thunderbird's Appearance by
hand, or the two halves disagree.

## Icons

The theme overrides the `--icon-*` custom properties `messenger/icons.css`
declares on `:root`. There are **223** of them (an earlier count of 198 was
wrong and left 25 tokens on stock art through several rounds). 211 are
repointed; 12 stay on Thunderbird's art where the stock drawing carries meaning
the Fluent set has no equivalent for. Alias families (`--spaces-icon-*`,
`--folder-pane-*`, `--account-central-*`, `--addons-manager-*`) are matched by
SVG **basename**, not by URL — density folders differ, so URL matching returns
zero twins.

**`resource://`, never `data:`.** Gecko refuses context-paint to an image loaded
from a `data:` URI, so `fill="context-fill"` never resolves and the glyph paints
its initial value — solid **black**, not nothing. Proven: with
`fill: currentColor` forced on the folder pane, a stock `chrome://` icon on that
same element went white while ours stayed black. `api.js` registers a
`resource://thunderbird-fluent/` host via `nsISubstitutingProtocolHandler`
pointing at `<profile>/chrome/icons/`. The trailing slash is load-bearing.
The content-access flag is deliberately omitted — web pages have no business
loading chrome furniture.

**Filled art in a skin written for outline art.** Stock puts full-strength
colour on `stroke` and a 10–20% alpha wash on `fill`; Microsoft's art is a
single filled path with **zero** `stroke` attributes. Consequences:

- A rule that only sets `stroke` leaves our glyphs on the faint wash.
- A `-moz-context-properties` list that omits `fill` leaves them **black**.
- Giving filled art the wash *and* stock art a fill produces a full-strength
  outline around a softened body — the dark ring, obvious in light mode.

So the fill pass hands each rule's own stroke value to `fill`, softened to 72%
in light mode only (`--fluent-icon-fill`), and only `currentColor` gets softened
— softening a literal produces nonsense like
`color-mix(in srgb, transparent 72%, transparent)`.

Tab icons are matched on `src`, not on a token. Inbox is a deliberate exception:
it uses `--icon-mail` so the tab matches the spaces rail.

The 12 keep-stock icons are still reachable by the fill pass
(`#button-nextUnread`, card-view column marks, the app-menu badge). Fixing that
means handing those consumers stock's 20% wash back. Not done.

Compose's formatting toolbar hardcodes `chrome://` URLs instead of reading
tokens, so it sits outside this whole layer. Not done.

**Both icon sheets have a kill switch and they are a pair.**
`fluent-icons.css` (chrome) and `fluent-icons-content.css` (content tabs).
Commenting out one and not the other leaves half the app broken, because the
two jobs — repointing tokens, and recolouring — must stop together. Dropping
only the fill pass leaves Microsoft's glyphs unpainted; dropping only the tokens
leaves stock outline art with a filled body.

## The transparency bridge (why an add-on exists at all)

Under a root content document Gecko composes an opaque backstop beneath the root
element's background (`PresShell::UpdateCanvasBackground`). That is *below* the
cascade — no user sheet can reach it, which is why three earlier attempts
concluded this was impossible. Dropping a content tab's background in CSS alone
exposes the backstop (`#1C1B22` in dark), not the DWM backdrop.

Gecko skips the compose when the embedder element carries a `transparent`
attribute. CSS cannot set an attribute, and no WebExtension API can touch chrome
DOM — hence an Experiment API.

- Stamped on `document-element-inserted`: the attribute must land before the
  canvas colour is computed, and at browser-insertion time `currentURI` is still
  `about:blank` so there is nothing to match on.
- **The page allowlist is staged on purpose.** Add a page only *after* its CSS
  has landed. Suppressing the backstop on a page the theme has no rule for yet
  makes it fully see-through with no gate to stop it.
- A marker attribute (`thunderbird-fluent`) gates every CSS rule that depends on
  this, so removing the add-on reverts cleanly and the chrome-side rules key on
  `:has(browser[transparent])` rather than per-tab id lists.
- Settings sub-dialogs are deliberately absent — nested browsers are not root
  content documents, so no backstop is composed for them.
- The Thundermail sign-in page (`auth.tb.pro`) runs out of process, so the
  parent-process observer never sees it. Its CSS is written to look right
  without the stamp.

## Experiment API sandbox

The parent script's globals are an explicit allowlist
(`ExtensionCommon.sys.mjs`). Consequences that each cost a debugging round:

- **No `fetch`.** Use `NetUtil` on a `rootURI`-resolved path, as stock does in
  `ExtensionData.readJSON`. `IOUtils`, `PathUtils` and `Components` are
  available; `Ci` and `FileUtils` are not reliably.
- **`experiment_apis` needs `paths` in the manifest**, not just `events`. With
  only `events` the add-on starts fine and answers no calls at all — the child
  sees "fun is not a function" with nothing naming the manifest.
- **`static onUninstall` is never dispatched** for the add-on being removed: the
  registry is built from installed add-ons' manifests, and the module's URL
  points into the archive that is going away. Use the `onUninstalling`
  AddonManager listener plus `onShutdown`.
- `onShutdown` cannot tell a disable from an uninstall — both arrive with
  `isAppShutdown` false. The `onUninstalling` listener supplies the difference.
- **An upgrade must not delete the stylesheets.** Install-over is a shutdown
  then a startup, and the deploy happens *after* startup while Gecko reads
  `chrome/` *during* it — so the outgoing copy deleting the sheets left the next
  session with no theme. `onInstalling` fires before any of that, so the removal
  is skipped outright.

## Prefs

Set on deploy only (not from `user.js`, which re-applies every startup):
`widget.windows.mica`, `widget.windows.mica.toplevel-backdrop`,
`toolkit.legacyUserProfileCustomizations.stylesheets`, plus the add-on's own
branch.

**Ownership is recorded.** `prefHasUserValue` is checked before each write and
only prefs that had no user value are remembered, because
`toolkit.legacyUserProfileCustomizations.stylesheets` is dangerous to clear —
anyone with their own `userChrome.css` turned it on first. Uninstall reverts
only the recorded set.

Disable removes the stylesheets and Thunderbird's prefs but keeps the add-on's
own settings; uninstall clears everything. `widget.windows.mica` applies live
(measured — it was believed to need a restart, and the options page used to say
so).

`widget.windows.mica.popups` is **not** in the list and should not be added back
without evidence. It is an int pref, so the old `setBoolPref` threw on every
deploy and the value never once landed — meaning the rim it existed to prevent
was never actually observed. Measured at 0 and 2 afterwards: popups render
identically.

## Working on this

- **Read the shipped source rather than guessing.** Thunderbird's omni.ja is
  extracted at `%TEMP%\omni-extract\`. Nearly every correct fix in this project
  came from reading stock's own rule and matching it.
- **Do not drive Thunderbird.** Don't relaunch, focus, or synthetically click
  it, and don't run `tools/capture.ps1` unprompted — it captures the **whole
  screen** and has caught unrelated windows with private content. Deploy, then
  hand verification back to the user.
- User-supplied screenshots contain real email addresses and contact names.
  Never propagate them into comments, commit messages or replies.
- To measure a colour from a screenshot, dump pixels with `System.Drawing`
  rather than eyeballing — hex values name the token directly.
- `tools/sync.ps1 -Push` must run through the PowerShell tool; under Bash it
  fails with `Get-FileHash is not recognized`.
- A `sync.ps1` report of "differs" on one CSS file is usually CRLF vs LF, not a
  real gap.
- Never add a Claude/Anthropic credit trailer to a commit.
