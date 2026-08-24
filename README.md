# thunderbird-fluent

A Fluent theme for Thunderbird.

## Install

1. Download `fluent-transparency.xpi` from the
   [latest release](https://github.com/Narcasung/thunderbird-fluent/releases/latest).
2. Install it from the Add-ons Manager: gear icon > Install Add-on From File.
3. Restart Thunderbird.

To uninstall: remove the add-on from the Add-ons Manager and restart.

That removes the theme but leaves the window backdrop on. To go all the way
back to stock, open Settings > General > Config Editor and reset these
(right-click > Reset):

- `widget.windows.mica`
- `widget.windows.mica.popups`
- `widget.windows.mica.toplevel-backdrop`
- `toolkit.legacyUserProfileCustomizations.stylesheets` — leave this one alone
  if you have your own `userChrome.css`.
