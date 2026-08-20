// Mica backdrop (DWM). Applied at every startup; prefs.js is rewritten on
// quit, user.js is not, so the theme's prefs live here.
//
// widget.windows.mica              master switch, Firefox-lineage pref
// widget.windows.mica.popups       extend the backdrop to menupopups/panels
// widget.windows.mica.toplevel-backdrop   DWM_SYSTEMBACKDROP_TYPE:
//                                  0 auto, 1 none, 2 Mica, 3 Acrylic, 4 Tabbed
user_pref("widget.windows.mica", true);
user_pref("widget.windows.mica.popups", true);
user_pref("widget.windows.mica.toplevel-backdrop", 2);
