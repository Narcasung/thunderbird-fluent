# Handoff — Fluent 2 theme for Thunderbird

**Next session focus: Tier 3 (Settings, Calendar, Address Book, Account Settings).**
Tiers 1–2 are complete and verified in both light and dark. Do not redo them.

---

## Where everything is

| What | Where |
|---|---|
| Theme source (6 files) | `%APPDATA%\Thunderbird\Profiles\jwiaz7ph.default-esr\chrome\` |
| Screenshot capture script | `D:\Thunderbird\.fluent-shots\capture.ps1` |
| Thunderbird install | `D:\Thunderbird` (this is the *install*, not the source — nothing to edit here) |
| Persistent project note | `.claude\projects\D--Thunderbird\memory\fluent-thunderbird-theme.md` |

**All design decisions and their rationale are written as comments inside the CSS
files.** Read `fluent-tokens.css` first — it is the source of truth for palette,
geometry, motion and typography, and every other module consumes its tokens.
Do not re-derive the design from this handoff; the files are authoritative.

Module layout (imported by `userChrome.css`, in order):
`fluent-tokens.css` → `fluent-layout.css` → `fluent-chrome.css` →
`fluent-lists.css` → `fluent-icons.css`

---

## Environment facts worth not rediscovering

- Thunderbird **153.1.0** (mozilla-esr153), build 20260818021847. It auto-updated
  from 140.13.0 *partway through the previous session*, invalidating notes taken
  from the old `omni.ja`. **Always verify structure against the installed
  `omni.ja`**, not memory.
- Read `omni.ja` (a zip) via PowerShell `System.IO.Compression.ZipFile`. Prefs
  compiled as StaticPrefs are not in `greprefs.js`; grep `xul.dll` for those.
- Windows 11 Pro 22631. Windows accent is a desaturated slate (`#4A5459`), which
  is why selection tints look muted — this is correct, not a bug. Tint
  percentages were already raised to compensate.
- Prefs set: `toolkit.legacyUserProfileCustomizations.stylesheets=true`,
  `ui.useOverlayScrollbars=1`, `mail.tabs.drawInTitlebar` (via Settings →
  General → Window Layout → "Hide system window titlebar").
- The spaces rail is currently **visible** (was hidden earlier;
  `xulstore.json` had `"spacesToolbar":{"hidden":"true"}`).
- Thunderbird's Light/Dark theme is in **Add-ons and Themes → Themes**, NOT in
  Settings → Appearance (that pane holds message-list options only).

---

## Verification loop

The agent captures its own screenshots — the user does not need to.

```powershell
D:\Thunderbird\.fluent-shots\capture.ps1 -Name whatever
D:\Thunderbird\.fluent-shots\capture.ps1 -DelaySeconds 6   # to catch open menus
```
Then `Read` the PNG. Crop and **pixel-sample** with `System.Drawing` to verify
colours and insets — reading colour off a zoomed crop led to two wrong
conclusions last session; sampling settled both immediately.

CSS changes require a **full Thunderbird restart**; there is no hot reload.

---

## Hard-won gotchas — these all cost a debug cycle

1. **`@import` must come first.** It must precede `@namespace` and all style
   rules or every import is silently dropped. There must be **no `@namespace`
   declaration at all** — declaring XUL as default namespace stops HTML type
   selectors (`body`, `hr`, `div`) matching.
2. **`!important` on a layout property can resurrect hidden elements.**
   `display: flex !important` on `.titlebar-button` un-hid the inactive
   maximise/restore button, because Thunderbird hides it with a plain
   `display: none`. Audit any `display`/`visibility` override for this.
3. **One `::before` per element.** `fluent-icons.css` puts Segoe Fluent glyphs on
   `::before`; the spaces-rail accent pill therefore uses `::after`. Any new
   indicator must check what already owns that pseudo-element.
4. **XUL `toolbarbutton` carries an anonymous `.toolbarbutton-text` label** even
   when empty. It takes width, so `justify-content: center` centres icon+label
   as a pair and the glyph lands left of centre. Hide the label.
5. **Scope icon-hiding to buttons that actually have a glyph mapping.** A blanket
   `> img { display: none }` turns every wrong/missing mapping into a blank
   square instead of falling back to Thunderbird's own icon.
6. **Verify Segoe Fluent Icons codepoints by rendering them**, never from memory.
   Several plausible guesses (`E901`, `E8A8`, `E11B`) are blanks or unrelated.
   Render a labelled grid with `System.Drawing` + font "Segoe Fluent Icons".

---

## Tier 3 — the actual next task

Scope: **Settings (about:preferences), Calendar, Address Book, Account Settings.**

Starting points:

- **Delete the Calendar holdout block** in `fluent-tokens.css` (clearly marked,
  with a "DELETE THIS BLOCK" comment). It currently pins `#calendarTabPanel` and
  `#calendar-view-box` to Thunderbird's stock colours so Calendar isn't left
  half-themed. Removing it is step one of doing Calendar properly.
- Calendar has its own hardcoded colours layered over the shared tokens — see
  `chrome/calendar/skin/classic/calendar/shared/*.css` inside `omni.ja`,
  especially `calendar-views.css`. This is the hardest surface; event chips and
  grid lines will need explicit work.
- Address Book largely rides on `shared/list-container.css`, which
  `fluent-lists.css` already retokenizes — check how much comes free before
  writing anything.
- Settings consumes `--layout-*` faithfully and should already be mostly correct
  from the global token mapping. Verify before assuming work is needed.
- **Fluent pill toggles and checkboxes were deferred to this tier** (agreed at
  interview Q16). Toggle = 40×20 pill. `widget.non-native-theme.use-theme-accent`
  is already `true`, so native checkbox/radio pick up the accent.

Design rules that must carry over (full rationale in the CSS comments):
base-vs-card split, 8px card radius / 4px control radius, 32px control height,
neutral+pill for nav surfaces vs accent-tint+bar for list surfaces, semibold
never bold, and `light-dark()` pairs for every colour.

---

## Smaller open items

- `widget.non-native-theme.scrollbar.style` — promised an empirical test of the
  enum value; never done. Current setup may already be sufficient.
- The message-header **More** button still uses Thunderbird's vertical-dots icon
  while five neighbours are Segoe glyphs (Fluent's More is `E712`, horizontal).
  Its class name was never looked up.
- Interactive states never actually observed: search-bar 2px accent focus
  underline, menu-item hover pills, pill grow-in animation.
- Flyout shadow deliberately left native (`-moz-window-shadow` untouched) to
  avoid a double halo. Revisit only with a before/after capture.
- Message pane content area renders `#18181B` vs the `#2B2B2B` cards, because
  message *content* is Tier 4 and excluded by decision. Not a defect.

---

## Suggested skills

- **`superpowers:brainstorming`** — if the user wants to reshape Tier 3's scope
  or revisit any design decision, run this before planning.
- **`grilling`** — the interview skill used to derive this design. Use it if
  Tier 3 needs its own decision tree resolved (Calendar in particular has real
  choices: how far to restyle event chips, whether to theme the mini-month).
  Do not re-litigate settled Tier 1–2 decisions.
- **`superpowers:systematic-debugging`** — for any "this selector doesn't apply"
  problem. Last session's failures all came from guessing instead of measuring.

---

## Working agreements with this user

- Replies in French, English, or Japanese — match the user's message language.
- Caveman mode is active via a session hook (terse; full technical substance
  retained). It does not apply to code, commits, or security warnings.
- The user tests by restarting Thunderbird and saying "capture done" — then read
  the newest PNG in `D:\Thunderbird\.fluent-shots\`.
- Never credit Claude/Anthropic in git commits.
