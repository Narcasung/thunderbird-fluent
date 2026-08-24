/* The options page. Two checkboxes over browser.fluentTransparency, which is
 * this add-on's own experiment API -- an addon_parent experiment is injected
 * into the add-on's extension pages, so there is no background script and no
 * messaging here, the call goes straight to api.js's getAPI.
 *
 * Prefs are the store, not browser.storage: the light setting has to be
 * readable by the stylesheets themselves (@media -moz-pref), which can see a
 * pref and cannot see extension storage. */

"use strict";

const light = document.getElementById("light");
const mica = document.getElementById("mica");

async function load() {
  const settings = await browser.fluentTransparency.getSettings();
  light.checked = settings.light;
  mica.checked = settings.mica;
}

light.addEventListener("change", () => {
  browser.fluentTransparency.setLight(light.checked);
});

mica.addEventListener("change", () => {
  browser.fluentTransparency.setMica(mica.checked);
});

load();
