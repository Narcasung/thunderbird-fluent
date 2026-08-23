// Mica backdrop (DWM). Applied at every startup; prefs.js is rewritten on
// quit, user.js is not, so the theme's prefs live here.
//
// widget.windows.mica              master switch, Firefox-lineage pref
// widget.windows.mica.popups       extend the backdrop to menupopups/panels
// widget.windows.mica.toplevel-backdrop   DWM_SYSTEMBACKDROP_TYPE:
//                                  0 auto, 1 none, 2 Mica, 3 Acrylic, 4 Tabbed
//
// mica.popups is deliberately FALSE. With it on, toolkit hands menupopups to
// the native path (menu.css:48-55, "The mica backdrop takes care of our
// shadow, border, and border-radius") and DWM paints a 1px rim around the
// popup window. That rim is outside the CSS box: --panel-border-color is
// already transparent and cannot reach it, and neither can appearance: none.
// Translucent popups and no popup border are not both available -- this theme
// takes no border. Flip this back to true and the rim returns; the theme's
// (-moz-windows-mica-popups) blocks still handle that case.
user_pref("widget.windows.mica", true);
user_pref("widget.windows.mica.popups", false);
user_pref("widget.windows.mica.toplevel-backdrop", 2);
