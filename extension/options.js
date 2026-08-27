"use strict";

const colorScheme = document.getElementById("color-scheme");
const mica = document.getElementById("mica");
const micaOptions = document.getElementById("mica-options");
const backdrop = document.getElementById("backdrop");
const transparency = document.getElementById("transparency");

function showMicaOptions() {
  micaOptions.hidden = !mica.checked;
}

async function load() {
  const settings = await browser.thunderbirdFluent.getSettings();
  colorScheme.value = settings.colorScheme;
  mica.checked = settings.mica;
  backdrop.value = String(settings.backdrop);
  transparency.value = String(settings.transparency);
  showMicaOptions();
}

colorScheme.addEventListener("change", () => {
  browser.thunderbirdFluent.setColorScheme(colorScheme.value);
});

mica.addEventListener("change", () => {
  browser.thunderbirdFluent.setMica(mica.checked);
  showMicaOptions();
});

backdrop.addEventListener("change", () => {
  browser.thunderbirdFluent.setBackdrop(Number(backdrop.value));
});

transparency.addEventListener("input", () => {
  browser.thunderbirdFluent.setTransparency(Number(transparency.value));
});

load();
