# Handoff — Mica backdrop for the Fluent Thunderbird theme

**Next session focus: turn on real DWM Mica and make the theme's base layer
transparent so it shows through.**

This is a *different* task from Tier 3. The Tier 3 handoff
(`%TEMP%\fluent-thunderbird-handoff.md`) is still valid and still pending —
read it for file locations, the capture/verify loop, and the six hard-won
gotchas. **Do not duplicate that work here, and do not re-read the design out
of either document: the CSS files' own comments are authoritative.**

Agreed sequencing: **Mica first, Tier 3 after.** Settings and Calendar backdrop
decisions depend on whether the window base is transparent, so doing Tier 3
first would mean redoing it.

---

## Why this is cheap, and what actually costs

Mica is a DWM window effect, not CSS. No stylesheet can fake it — the window
must be created with `DWMWA_SYSTEMBACKDROP_TYPE`. Gecko does that behind prefs.

**Verified present in this build's `xul.dll` (TB 153.1.0):**

```
widget.windows.mica
widget.windows.mica.popups
widget.windows.mica.toplevel-backdrop
```

`toplevel-backdrop` is the DWM enum (2 = Mica, 3 = Acrylic, 4 = Tabbed).
**Confirm the mapping empirically — do not trust it from memory.** `.popups`
extends the backdrop to menupopups, which would cover flyouts for free.

Flipping the pref is minutes. The real work is a **transparency audit**: the
theme currently paints everything opaque (that was the deliberate answer to
interview Q6, "Mica-alike only"). A backdrop dies at the first opaque layer in
the paint chain.

What must change:
- `--fluent-base` and `--toolbar-bgcolor` go transparent or a thin tint.
- Hunt the `:root` / `#messengerWindow` / `#tabmail` chain for opaque paints.
  Any one of them left opaque kills the effect and looks like "the pref did
  nothing" — check this before concluding the pref is unwired.

What must **stay opaque** (this is correct Fluent, not an oversight):
- the three pane-cards — cards float *on* Mica
- the selected tab

The existing base-vs-card split is already the Mica structure. That is the
whole reason this is a short job rather than a rewrite.

---

## Environment facts already established (do not re-derive)

- `EnableTransparency = 1` in
  `HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize`.
  Windows transparency is **already on**; nothing for the user to toggle. (On
  Win 11 that setting lives under Accessibility > Visual effects, not only
  Personalization > Colors.)
- `AppsUseLightTheme=1`, `SystemUsesLightTheme=0` — apps light, shell dark.
  Consistent with the theme's current `color-scheme: light`.
- `mail.tabs.drawInTitlebar` is already on, which Mica wants.
- If transparency were ever disabled, or on battery saver, DWM falls back to a
  solid backdrop — degrades gracefully, does not break.

**Open risk:** these are Firefox-lineage prefs. They exist in the binary, but
Thunderbird's window-creation path was never proven to honour them. First step
is a two-minute empirical test: flip `widget.windows.mica`, restart, capture.
If nothing changes, complete the transparency audit *before* concluding the
pref is a dead end — an opaque layer masks a working backdrop.

Contrast risk is low: Mica is mostly theme tint with only a wash of wallpaper,
and only tab/toolbar labels sit on the base layer. Everything else is on
opaque cards.

---

## Also settled this session (context, not tasks)

The user asked whether the theme should become an XPI. Answer, with evidence:

- Store "themes" are **static themes** (`manifest.json` `"theme"` key: colors
  and images only). Strictly **weaker** than the current userChrome.css — no
  layout, radius, glyphs, or state selectors. Switching to that loses the theme.
- The real power tier is a **MailExtension with `experiment_apis`** —
  confirmed present in this build's `omni.ja`, with
  `extensions.experiments.enabled` defaulting true. Thunderbird does **not**
  override `xpinstall.signatures.required`, so it stays `false` from
  `greprefs.js` and unsigned XPIs install permanently. No signing gate.
- An extension buys reparenting, real new buttons, a settings UI, distribution,
  and **stylesheet reload without a restart**. It buys **no extra reach** —
  userChrome.css already hits Settings, Calendar, Address Book, and popups.

**Decision: stay on userChrome.css.** Revisit only on a concrete trigger — a
cross-parent move that's actually wanted, or restart fatigue getting expensive.

DOM capability limits, confirmed against `messenger.xhtml`:

```
#navigation-toolbox
  #titlebar (vbox)
    #toolbar-menubar    -+ siblings
    #tabs-toolbar       -+
#messengerBody (vbox)
  #tabmail-container    -+ siblings
    #tabmail             |
  #status-bar           -+
```

- **Hiding** anything works unconditionally.
- **Same-parent reordering** is a real, stable move (`order`, or legacy
  `-moz-box-ordinal-group`; both exist in TB 153). Sibling pairs above are the
  clean candidates.
- **Cross-parent moves** are visual-only via `position: absolute`, and the
  theme's own `overflow: clip` on the three panes will clip anything moved out
  of a pane. Self-inflicted constraint worth remembering.
- `#unifiedToolbarContainer` lives inside `<html:template
  id="unifiedToolbarTemplate">` and is cloned in at runtime, so its **runtime
  parent is not readable from the static file**. Any reorder involving the
  unified toolbar needs the live DOM via Browser Toolbox (Ctrl+Shift+I) first.
  Do not guess it.

---

## Suggested skills

- **`superpowers:systematic-debugging`** — the likely failure mode here is
  "pref flipped, nothing visible", which has at least two distinct causes
  (unwired pref vs. an opaque layer still painting). Measure, do not guess;
  that was the root of every failure in the first session.
- **`grilling`** — only if the user wants to revisit how far transparency
  should go (base only, or also toolbars/flyouts via `.popups`). Do not
  re-litigate settled decisions.
- **`superpowers:brainstorming`** — if Mica turns out unsupported and a
  fallback approach needs designing.

---

## Working agreements with this user

- Replies in French, English, or Japanese — match the user's message language.
- Caveman mode is active via a session hook (terse; full technical substance
  retained). Does not apply to code, commits, or security warnings.
- **This is now the design/discussion session.** The user explicitly wants
  implementation done in separate sessions. Confirm scope before writing CSS.
- Verify facts against the installed `omni.ja` / `xul.dll` rather than memory —
  Thunderbird auto-updated mid-work once already.
- CSS changes need a full Thunderbird restart; no hot reload.
- Never credit Claude/Anthropic in git commits.
