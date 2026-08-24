/* The options page. Checkboxes and two Mica sub-settings over
 * browser.fluentTransparency, which is this add-on's own experiment API -- an
 * addon_parent experiment is injected into the add-on's extension pages, so
 * there is no background script and no messaging here, the call goes straight
 * to api.js's getAPI.
 *
 * Prefs are the store, not browser.storage: the light setting and the veil are
 * read by the stylesheets themselves (@media -moz-pref), which can see a pref
 * and cannot see extension storage. */

"use strict";

const light = document.getElementById("light");
const mica = document.getElementById("mica");
const micaOptions = document.getElementById("mica-options");
const backdrop = document.getElementById("backdrop");
const transparency = document.getElementById("transparency");

function showMicaOptions() {
  micaOptions.hidden = !mica.checked;
}

async function load() {
  const settings = await browser.fluentTransparency.getSettings();
  light.checked = settings.light;
  mica.checked = settings.mica;
  backdrop.value = String(settings.backdrop);
  transparency.value = String(settings.transparency);
  showMicaOptions();
}

light.addEventListener("change", () => {
  browser.fluentTransparency.setLight(light.checked);
});

mica.addEventListener("change", () => {
  browser.fluentTransparency.setMica(mica.checked);
  showMicaOptions();
});

backdrop.addEventListener("change", () => {
  browser.fluentTransparency.setBackdrop(Number(backdrop.value));
});

/* input, not change: the window follows the slider as it is dragged, which is
 * the only way to pick a level by eye. Each step is one pref write and the
 * slider has five of them, so there is nothing here worth debouncing. */
transparency.addEventListener("input", () => {
  browser.fluentTransparency.setTransparency(Number(transparency.value));
});

load();
