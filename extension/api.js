/* Fluent 2 for Thunderbird -- the theme's only privileged code.
 *
 * Two jobs: it sets the `transparent` attribute on the browsers of a few
 * content tabs so Gecko skips the opaque canvas backstop no stylesheet can
 * reach, and it deploys the theme's CSS and icons into the profile. CSS cannot
 * set an attribute and no WebExtension API can touch chrome DOM, which is why
 * this is an Experiment API. No network, no message access, no storage.
 *
 * The sandbox this runs in has an allowlisted set of globals -- notably NO
 * fetch. Read CLAUDE.md before changing anything here; most of what looks
 * arbitrary is load-bearing and was measured.
 */

"use strict";

var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);

var { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);

var { AddonManager } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);

/* STAGED ON PURPOSE: add a page only after its CSS has landed. Suppressing
 * the backstop on a page the theme has no rule for makes it see-through. */
const TRANSPARENT_PAGES = [
  "about:addressbook",
  "about:accountsettings",
  "about:preferences",
  "about:config",
  "about:addons",
  "about:import",
  "about:downloads",
];

const MARKER = "thunderbird-fluent";
const XUL_NS =
  "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const PREF_BRANCH = "extensions.thunderbird-fluent.";
const PREF_DEPLOYED_VERSION = PREF_BRANCH + "deployedVersion";
const PREF_DEPLOYED_FILES = PREF_BRANCH + "deployedFiles";
const PREF_DEPLOYED_ICONS = PREF_BRANCH + "deployedIcons";
const PREF_OWNED_PREFS = PREF_BRANCH + "ownedPrefs";

const PREF_COLOR_SCHEME = PREF_BRANCH + "colorScheme";
const PREF_MICA = PREF_BRANCH + "mica";
const PREF_WIDGET_MICA = "widget.windows.mica";

const PREF_BACKDROP = PREF_BRANCH + "backdrop";
const PREF_TRANSPARENCY = PREF_BRANCH + "transparency";
const PREF_TOPLEVEL_BACKDROP = "widget.windows.mica.toplevel-backdrop";

const BACKDROPS = [2, 3];

const TRANSPARENCIES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function backdropValue() {
  const stored = Services.prefs.getIntPref(PREF_BACKDROP, 2);
  return BACKDROPS.includes(stored) ? stored : 2;
}

const COLOR_SCHEMES = ["system", "light", "dark"];
const THEMES = {
  system: "default-theme@mozilla.org",
  light: "thunderbird-compact-light@mozilla.org",
  dark: "thunderbird-compact-dark@mozilla.org",
};
const PREF_PREVIOUS_THEME = PREF_BRANCH + "previousTheme";

function colorSchemeValue() {
  const stored = Services.prefs.getCharPref(PREF_COLOR_SCHEME, "system");
  return COLOR_SCHEMES.includes(stored) ? stored : "system";
}

async function enableTheme(id) {
  const theme = await AddonManager.getAddonByID(id);
  if (!theme) {
    console.error(`thunderbird-fluent: no built-in theme ${id}`);
    return;
  }
  await theme.enable();
}

async function applyBuiltInTheme(scheme) {
  if (!Services.prefs.prefHasUserValue(PREF_PREVIOUS_THEME)) {
    const themes = await AddonManager.getAddonsByTypes(["theme"]);
    const active = themes.find(theme => theme.isActive);
    Services.prefs.setCharPref(PREF_PREVIOUS_THEME, active ? active.id : "");
  }
  await enableTheme(THEMES[scheme]);
}

function readList(name) {
  return Services.prefs.getCharPref(name, "").split(",").filter(Boolean);
}

function themePrefs() {
  return [
    ["toolkit.legacyUserProfileCustomizations.stylesheets", true],
    [PREF_WIDGET_MICA, Services.prefs.getBoolPref(PREF_MICA, true)],
    [PREF_TOPLEVEL_BACKDROP, backdropValue()],
  ];
}

function setPref([name, value]) {
  const ours = !Services.prefs.prefHasUserValue(name);
  try {
    if (typeof value === "boolean") {
      Services.prefs.setBoolPref(name, value);
    } else {
      Services.prefs.setIntPref(name, value);
    }
  } catch (error) {
    console.error(`thunderbird-fluent: could not set ${name}: ${error}`);
    return false;
  }
  return ours;
}

function clearPref(name) {
  try {
    Services.prefs.clearUserPref(name);
  } catch (error) {
    console.error(`thunderbird-fluent: could not clear ${name}: ${error}`);
  }
}

/* NOT fetch() -- it is not in this sandbox's globals. NetUtil on a
 * rootURI-resolved path is what stock uses for the same job. */
function readFromArchive(extension, path) {
  return new Promise((resolve, reject) => {
    const uri = extension.rootURI.resolve(`./${path}`);
    NetUtil.asyncFetch(
      { uri, loadUsingSystemPrincipal: true },
      (stream, status) => {
        if (!Components.isSuccessCode(status)) {
          reject(new Error(`${path} is not in the archive`));
          return;
        }
        try {
          resolve(
            NetUtil.readInputStreamToString(stream, stream.available(), {
              charset: "UTF-8",
            })
          );
        } catch (error) {
          reject(error);
        } finally {
          stream.close();
        }
      }
    );
  });
}

async function bundledFileNames(extension) {
  return JSON.parse(await readFromArchive(extension, "chrome-files.json"));
}

async function bundledIconNames(extension) {
  return JSON.parse(await readFromArchive(extension, "icon-files.json"));
}

const RESOURCE_HOST = "thunderbird-fluent";

function iconDirectory() {
  return PathUtils.join(PathUtils.profileDir, "chrome", "icons");
}

function substitutingProtocol() {
  return Services.io
    .getProtocolHandler("resource")
    .QueryInterface(Components.interfaces.nsISubstitutingProtocolHandler);
}

/* The icons must be real files behind a privileged URL: Gecko refuses
 * context-paint to a data: URI and the glyphs come out black. The trailing
 * slash on the substitution root is load-bearing. */
async function registerIconRoot() {
  try {
    const dir = iconDirectory();
    if (!(await IOUtils.exists(dir))) {
      return;
    }
    substitutingProtocol().setSubstitution(
      RESOURCE_HOST,
      Services.io.newURI(PathUtils.toFileURI(dir) + "/")
    );
  } catch (error) {
    console.error("thunderbird-fluent: icon root registration failed: " + error);
  }
}

function unregisterIconRoot() {
  try {
    substitutingProtocol().setSubstitution(RESOURCE_HOST, null);
  } catch (error) {
    console.error("thunderbird-fluent: icon root removal failed: " + error);
  }
}

async function deployIcons(extension) {
  const names = await bundledIconNames(extension);
  if (!names.length) {
    return;
  }

  const target = iconDirectory();
  await IOUtils.makeDirectory(target, { ignoreExisting: true });

  for (const name of names) {
    const svg = await readFromArchive(extension, `icons/${name}`);
    await IOUtils.writeUTF8(PathUtils.join(target, name), svg);
  }

  Services.prefs.setCharPref(PREF_DEPLOYED_ICONS, names.join(","));
}

/* VERSION-GATED so sync.ps1 pushes are not reverted at every startup -- which
 * also means any chrome/ or icons/ change needs a manifest version bump to
 * reach a profile. Gecko reads chrome/ during startup, so a deploy lands at
 * the NEXT launch. */
async function deployStylesheets(extension) {
  const version = extension.version;
  if (Services.prefs.getCharPref(PREF_DEPLOYED_VERSION, "") === version) {
    return;
  }

  const names = await bundledFileNames(extension);
  const target = PathUtils.join(PathUtils.profileDir, "chrome");
  await IOUtils.makeDirectory(target, { ignoreExisting: true });

  for (const name of names) {
    const css = await readFromArchive(extension, `chrome/${name}`);
    await IOUtils.writeUTF8(PathUtils.join(target, name), css);
  }

  await deployIcons(extension);

  const firstColorScheme = !Services.prefs.prefHasUserValue(PREF_COLOR_SCHEME);
  if (firstColorScheme) {
    Services.prefs.setCharPref(PREF_COLOR_SCHEME, "system");
  }
  if (!Services.prefs.prefHasUserValue(PREF_MICA)) {
    Services.prefs.setBoolPref(PREF_MICA, true);
  }
  if (!Services.prefs.prefHasUserValue(PREF_BACKDROP)) {
    Services.prefs.setIntPref(PREF_BACKDROP, 2);
  }
  if (!Services.prefs.prefHasUserValue(PREF_TRANSPARENCY)) {
    Services.prefs.setIntPref(PREF_TRANSPARENCY, 100);
  }

  clearPref(PREF_BRANCH + "veil");

  const ownedBefore = new Set(readList(PREF_OWNED_PREFS));
  const owned = themePrefs()
    .filter(entry => setPref(entry) || ownedBefore.has(entry[0]))
    .map(([name]) => name);

  Services.prefs.setCharPref(PREF_OWNED_PREFS, owned.join(","));
  Services.prefs.setCharPref(PREF_DEPLOYED_FILES, names.join(","));
  Services.prefs.setCharPref(PREF_DEPLOYED_VERSION, version);

  Services.prefs.savePrefFile(null);

  if (firstColorScheme) {
    await applyBuiltInTheme("system");
  }
}

async function removeStylesheets(forGood) {
  const target = PathUtils.join(PathUtils.profileDir, "chrome");

  for (const name of readList(PREF_DEPLOYED_FILES)) {
    await IOUtils.remove(PathUtils.join(target, name), { ignoreAbsent: true });
  }

  const iconTarget = iconDirectory();
  for (const name of readList(PREF_DEPLOYED_ICONS)) {
    await IOUtils.remove(PathUtils.join(iconTarget, name), {
      ignoreAbsent: true,
    });
  }
  await IOUtils.remove(iconTarget, { ignoreAbsent: true, recursive: false });

  readList(PREF_OWNED_PREFS).forEach(clearPref);

  if (forGood) {
    clearPref(PREF_OWNED_PREFS);
    clearPref(PREF_COLOR_SCHEME);
    clearPref(PREF_MICA);
    clearPref(PREF_BACKDROP);
    clearPref(PREF_TRANSPARENCY);
    clearPref(PREF_PREVIOUS_THEME);
  }

  clearPref(PREF_DEPLOYED_FILES);
  clearPref(PREF_DEPLOYED_ICONS);
  clearPref(PREF_DEPLOYED_VERSION);
  Services.prefs.savePrefFile(null);
}

const addonWatcher = {
  addonId: null,
  uninstalling: false,
  upgrading: false,

  /* An upgrade must NOT take the stylesheets with it: install-over is a
   * shutdown then a startup, and the deploy runs after Gecko has already
   * read chrome/. onInstalling fires early enough to skip the removal. */
  onInstalling(addon) {
    if (addon.id === this.addonId) {
      this.upgrading = true;
    }
  },

  onUninstalling(addon) {
    if (addon.id !== this.addonId) {
      return;
    }
    this.uninstalling = true;

    const previous = Services.prefs.getCharPref(PREF_PREVIOUS_THEME, "");
    if (previous) {
      enableTheme(previous).catch(error => {
        console.error("thunderbird-fluent: theme restore failed: " + error);
      });
    }
  },
};

function isTargetPage(uri) {
  return TRANSPARENT_PAGES.some(page => uri.startsWith(page));
}

function embedderBrowser(win) {
  const element = win?.browsingContext?.embedderElement;
  if (!element) {
    return null;
  }
  if (element.namespaceURI !== XUL_NS || element.localName !== "browser") {
    return null;
  }
  return element;
}

function stamp(browser, doc) {
  browser.setAttribute("transparent", "true");
  browser.setAttribute(MARKER, "");
  doc.documentElement?.setAttribute(MARKER, "");
}

function unstamp(browser) {
  browser.removeAttribute("transparent");
  browser.removeAttribute(MARKER);
  const doc = browser.contentDocument;
  doc?.documentElement?.removeAttribute(MARKER);
}

const stamped = new Set();

const documentObserver = {
  observe(doc) {
    try {
      const uri = doc?.documentURI;
      if (!uri || !isTargetPage(uri)) {
        return;
      }
      const browser = embedderBrowser(doc.defaultView);
      if (!browser) {
        return;
      }
      stamp(browser, doc);
      stamped.add(browser);
    } catch (error) {
      console.error("thunderbird-fluent: " + error);
    }
  },
};

function sweepOpenTabs() {
  for (const window of Services.wm.getEnumerator("mail:3pane")) {
    const container = window.document.getElementById("tabpanelcontainer");
    if (!container) {
      continue;
    }
    const browsers = container.querySelectorAll('browser[type="content"]');
    for (const browser of browsers) {
      const uri = browser.currentURI?.spec;
      if (!uri || !isTargetPage(uri) || stamped.has(browser)) {
        continue;
      }
      browser.setAttribute("transparent", "true");
      browser.setAttribute(MARKER, "");
      stamped.add(browser);
      browser.reload();
    }
  }
}

this.thunderbirdFluent = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {
    Services.obs.addObserver(documentObserver, "document-element-inserted");

    addonWatcher.addonId = this.extension.id;
    addonWatcher.uninstalling = false;
    addonWatcher.upgrading = false;
    AddonManager.addAddonListener(addonWatcher);

    sweepOpenTabs();

    deployStylesheets(this.extension)
      .then(registerIconRoot)
      .catch(error => {
        console.error("thunderbird-fluent: stylesheet deploy failed: " + error);
      });
  }

  /* `static onUninstall` is never dispatched to the add-on being removed --
   * measured. This plus onUninstalling is the working pair; onShutdown alone
   * cannot tell a disable from an uninstall. */
  onShutdown(isAppShutdown) {
    Services.obs.removeObserver(documentObserver, "document-element-inserted");
    AddonManager.removeAddonListener(addonWatcher);

    unregisterIconRoot();

    if (isAppShutdown) {
      return;
    }
    for (const browser of stamped) {
      try {
        unstamp(browser);
      } catch (error) {
        console.error("thunderbird-fluent: " + error);
      }
    }
    stamped.clear();

    if (addonWatcher.upgrading) {
      return;
    }

    removeStylesheets(addonWatcher.uninstalling).catch(error => {
      console.error("thunderbird-fluent: stylesheet cleanup failed: " + error);
    });
  }

  /* Needs BOTH `events` and `paths` in the manifest. With only `events` the
   * add-on starts fine and answers no calls at all. */
  getAPI() {
    return {
      thunderbirdFluent: {
        async getSettings() {
          return {
            colorScheme: colorSchemeValue(),
            mica: Services.prefs.getBoolPref(PREF_MICA, true),
            backdrop: backdropValue(),
            transparency: Services.prefs.getIntPref(PREF_TRANSPARENCY, 100),
          };
        },

        async setColorScheme(value) {
          if (!COLOR_SCHEMES.includes(value)) {
            throw new Error(`thunderbird-fluent: bad colour scheme ${value}`);
          }
          Services.prefs.setCharPref(PREF_COLOR_SCHEME, value);
          Services.prefs.savePrefFile(null);
          await applyBuiltInTheme(value);
        },

        async setMica(enabled) {
          Services.prefs.setBoolPref(PREF_MICA, enabled);
          Services.prefs.setBoolPref(PREF_WIDGET_MICA, enabled);
          Services.prefs.savePrefFile(null);
        },

        async setBackdrop(value) {
          if (!BACKDROPS.includes(value)) {
            throw new Error(`unknown backdrop ${value}`);
          }
          Services.prefs.setIntPref(PREF_BACKDROP, value);
          Services.prefs.setIntPref(PREF_TOPLEVEL_BACKDROP, value);
          Services.prefs.savePrefFile(null);
        },

        async setTransparency(value) {
          if (!TRANSPARENCIES.includes(value)) {
            throw new Error(`unknown transparency ${value}`);
          }
          Services.prefs.setIntPref(PREF_TRANSPARENCY, value);
          Services.prefs.savePrefFile(null);
        },
      },
    };
  }
};
