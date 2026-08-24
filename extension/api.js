/* ============================================================================
 * Fluent 2 for Thunderbird -- TRANSPARENCY BRIDGE
 *
 * WHAT THIS DOES
 * Two things, and the first is the one it exists for.
 *
 *   1. It sets the attribute `transparent` on the <browser> of six content
 *      tabs, and a marker attribute on their documents so the theme's CSS
 *      knows it may drop those pages' backgrounds.
 *   2. It carries the theme's stylesheets inside itself and deploys them to
 *      the profile, so the whole theme ships as one .xpi.
 *
 * Nothing else. No network, no message access, no storage.
 *
 * The second job is packaging, not behaviour -- see DEPLOYING THE STYLESHEETS
 * further down for why it is here rather than in an install step, and why it
 * writes files rather than registering the sheets itself.
 *
 * WHY IT HAS TO EXIST AT ALL
 * Under a root content document Gecko composes an opaque backstop beneath the
 * root element's background, in PresShell::UpdateCanvasBackground. That is
 * below the cascade -- no user sheet can reach it, which is why three earlier
 * attempts at this concluded it was impossible. Dropping a content tab's
 * background in CSS alone does not expose the DWM backdrop, it exposes that
 * backstop (#1C1B22 in dark, = --color-gray-90).
 *
 * Gecko skips the compose when the embedder element carries a `transparent`
 * attribute. Stock Thunderbird uses it in three places on exactly this kind of
 * browser -- calendar-creation.js:601 ("Allow keeping dialog background color
 * without jumping through hoops"), preferences/compose.js:604 and
 * inline-options-browser.mjs:100. CSS cannot set an attribute. Hence an
 * add-on, and hence an Experiment API: no WebExtension API can touch chrome
 * DOM.
 *
 * WHY THE MARKER ATTRIBUTE
 * The CSS half and this half are useless apart, and worse than that: the CSS
 * half alone leaves the pages on the backstop, which looks worse than stock.
 * So every rule the theme adds for this is gated on a marker this script
 * sets -- `fluent-transparency` on the browser and on the content document's
 * root. Disable or remove this add-on and the pages go back to --fluent-base
 * with no other change needed. The gate is also what keeps the chrome-side
 * rules free of per-tab id lists: they key on :has(browser[transparent]).
 *
 * WHY document-element-inserted
 * The attribute has to land before the canvas colour is computed. A
 * MutationObserver on #tabpanelcontainer is too early in a different way --
 * at browser-insertion time currentURI is still about:blank, so there is
 * nothing to match the allowlist against. This notification fires with the
 * real URI known and before frame construction. If a page is ever seen to
 * come up on the backstop and then correct itself, this is the line to move.
 *
 * WHY AN ALLOWLIST AND NOT type="content"
 * The contentTab tab type is the same one Thunderbird uses for arbitrary web
 * pages (specialTabs.js:787). Stamping those would let any site that declares
 * no background paint the user's desktop.
 * ========================================================================== */

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

/* The content tabs the theme paints. Matched with startsWith, because these
 * carry fragments and queries in normal use (about:preferences#general,
 * about:addons?view=...).
 *
 * THIS LIST IS STAGED ON PURPOSE. Add a page here only once its CSS has
 * landed, never before. Stamping a page early is not harmless: suppressing
 * the backstop leaves whatever the page itself paints, and a page that paints
 * nothing on its root -- which is exactly what the backstop lets a page get
 * away with -- goes fully see-through, with no gate to stop it, because the
 * theme has no rule for that page yet to gate.
 *
 * about:addons was the one that would have done it. Its canvas is not painted
 * by this theme at all; it comes from the toolkit, :root against
 * --background-color-canvas (in-content/common-shared.css:54-57).
 *
 * about:import is the same case rather than the hazard: it takes the toolkit
 * root fill too, and the theme now paints :root itself in userContent.css's
 * about:import block, gated on the marker this sets. Its CSS landed first,
 * which is the order this list requires.
 *
 * Deliberately NOT here: the Settings sub-dialogs. They are nested browsers,
 * so they are not root content documents, so no backstop is composed for them
 * and there is nothing for this to switch off. They stay opaque, which is what
 * a dialog over a page should be.
 */
const TRANSPARENT_PAGES = [
  "about:addressbook",
  "about:accountsettings",
  "about:preferences",
  "about:config",
  "about:addons",
  "about:import",
];

const MARKER = "fluent-transparency";
const XUL_NS =
  "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/* ---------------------------------------------------------------------------
 * DEPLOYING THE STYLESHEETS
 *
 * The theme is CSS in the profile's chrome/ folder plus this add-on. Asking a
 * user to copy a folder AND install an .xpi is two ways to get it wrong, so
 * the .xpi carries the CSS and writes it out on first run. tools/chrome/ in
 * the archive is a build-time copy of the repo's chrome/; pack-extension.ps1
 * stages it, so chrome/ stays the single source of truth and the CSS is not
 * duplicated in git.
 *
 * WHY WRITE FILES RATHER THAN REGISTER THE SHEETS
 * nsIStyleSheetService.loadAndRegisterSheet(uri, USER_SHEET) would put these
 * at the same cascade level with no profile files and no legacy-stylesheets
 * pref at all. It was rejected, and the reason is scope: a registered sheet
 * applies to EVERY document, and StyleSheetService has no chrome/content
 * split. fluent-tokens.css:19, fluent-chrome.css:228 and fluent-layout.css:306
 * are bare `:root` and `body` rules, so they would start landing on rendered
 * HTML mail and on any page loaded in a content tab -- forcing color-scheme
 * and the token palette across the Tier 4 boundary the theme draws on purpose.
 * Closing that means @-moz-document-wrapping all eight chrome modules, and
 * @import cannot sit inside @-moz-document, so userChrome.css's import hub
 * would have to be rebuilt too. Writing files keeps the sheets exactly as they
 * are and exactly as scoped as they are.
 *
 * WHY THE DEPLOY IS VERSION-GATED
 * tools/sync.ps1 pushes CSS straight into the same folder during development.
 * An unconditional copy at every startup would silently revert every push the
 * next time Thunderbird started. So the deploy runs only when the add-on's own
 * version differs from what was last written, which makes a version bump the
 * one deliberate act that overwrites a working tree.
 *
 * WHY THE PREFS ARE SET HERE AND ONLY ON DEPLOY
 * They used to live in profile/user.js, which is re-applied at every startup
 * because prefs.js is rewritten on quit. Setting them on deploy instead puts
 * them in prefs.js once and leaves them alone afterwards, so a user who turns
 * the backdrop off in about:config keeps it off. The theme still renders
 * without the two Mica prefs; every transparent surface just degrades to its
 * opaque fallback. The third is not optional -- without it Gecko never reads
 * the profile's chrome/ folder at all.
 *
 * WHY THE DEPLOY RECORDS WHICH PREFS WERE ITS OWN
 * Uninstalling reverts them (see the uninstall watcher below), and reverting a
 * pref this add-on did not set would be a bug rather than tidiness. The Mica
 * pair is plausibly already set by the user for their own reasons, and
 * toolkit.legacyUserProfileCustomizations.stylesheets is the dangerous one:
 * anyone with their own userChrome.css turned it on first, and clearing it
 * would silently switch off THEIR sheets on the next launch. So the deploy
 * checks prefHasUserValue before each write and remembers only the prefs that
 * had no user value, and uninstall clears only that list.
 * ------------------------------------------------------------------------- */

const PREF_BRANCH = "extensions.fluent-transparency.";
const PREF_DEPLOYED_VERSION = PREF_BRANCH + "deployedVersion";
const PREF_DEPLOYED_FILES = PREF_BRANCH + "deployedFiles";
const PREF_OWNED_PREFS = PREF_BRANCH + "ownedPrefs";

/* deployedFiles and ownedPrefs are comma-joined lists. */
function readList(name) {
  return Services.prefs.getCharPref(name, "").split(",").filter(Boolean);
}

/* WIDGET.WINDOWS.MICA.POPUPS IS NOT HERE, and adding it back needs evidence
 * this list never had. It was carried from the user.js days as the boolean
 * `false`, to stop toolkit handing popups to the native path (menu.css:48-55,
 * "The mica backdrop takes care of our shadow, border, and border-radius")
 * where DWM paints a 1px rim outside the CSS box that --panel-border-color
 * cannot reach.
 *
 * The pref is an int, default 2. So setBoolPref threw NS_ERROR_UNEXPECTED on
 * every deploy this project ever ran, and the value never once landed: the rim
 * the entry existed to prevent was never observed, because the configuration
 * that was supposed to produce it was never applied. Measured at 0 and at 2
 * afterwards -- popups render identically. Nothing to fix, so nothing to set.
 *
 * toplevel-backdrop is DWM_SYSTEMBACKDROP_TYPE: 0 auto, 1 none, 2 Mica,
 * 3 Acrylic, 4 Tabbed. */
const THEME_PREFS = [
  ["toolkit.legacyUserProfileCustomizations.stylesheets", true],
  ["widget.windows.mica", true],
  ["widget.windows.mica.toplevel-backdrop", 2],
];

/* Each one in its own try, because a single bad pref must not take the deploy
 * with it. It did once, and it was the type mismatch on mica.popups described
 * above: the throw left the CSS written, widget.windows.mica set,
 * toplevel-backdrop unset and the version gate unrecorded -- so the theme came
 * back after a re-enable with a flat background instead of the backdrop, and
 * the next startup redeployed. That entry is gone now, but the guard stays:
 * the failure it turns into a logged line is otherwise a profile configured
 * half way with nothing said about it.
 *
 * The return value is ownership, not success: true only if the pref had no
 * user value before this wrote one, so uninstall knows what is safe to revert.
 * A pref that threw is not ours either way. */
function setPref([name, value]) {
  const ours = !Services.prefs.prefHasUserValue(name);
  try {
    if (typeof value === "boolean") {
      Services.prefs.setBoolPref(name, value);
    } else {
      Services.prefs.setIntPref(name, value);
    }
  } catch (error) {
    console.error(`fluent-transparency: could not set ${name}: ${error}`);
    return false;
  }
  return ours;
}

function clearPref(name) {
  try {
    Services.prefs.clearUserPref(name);
  } catch (error) {
    console.error(`fluent-transparency: could not clear ${name}: ${error}`);
  }
}

/* Read one file out of the .xpi.
 *
 * NOT fetch(). An Experiment API's parent script runs in a sandbox whose
 * globals are an explicit allowlist -- ExtensionCommon.sys.mjs:1820-1855, with
 * `wantGlobalProperties: ["ChromeUtils"]` and a hand-written Object.assign.
 * IOUtils and PathUtils are on that list; fetch is not, so the first version of
 * this deployed nothing and failed with `fetch is not defined`. NetUtil on a
 * rootURI-resolved path is what stock uses for the same job in
 * Extension.sys.mjs:1128-1145 (ExtensionData.readJSON), and Components is
 * reachable here too -- parent/ext-compose.js uses it in this same sandbox. */
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

/* The file list is generated at build time rather than hardcoded, so adding a
 * module to chrome/ needs no edit here. pack-extension.ps1 writes it. */
async function bundledFileNames(extension) {
  return JSON.parse(await readFromArchive(extension, "chrome-files.json"));
}

/* Copy the archive's CSS into <profile>/chrome/. */
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

  /* A redeploy (version bump, or re-enable after a disable) finds its own
   * values already in prefs.js, so prefHasUserValue says "not ours" for every
   * one of them. Carrying the previous list forward is what stops a bump from
   * quietly disowning the prefs this add-on set on first install. */
  const ownedBefore = new Set(readList(PREF_OWNED_PREFS));
  const owned = THEME_PREFS.filter(
    entry => setPref(entry) || ownedBefore.has(entry[0])
  ).map(([name]) => name);

  /* Written last, and only after every file landed: a half-finished deploy
   * that recorded itself as complete would never retry. */
  Services.prefs.setCharPref(PREF_OWNED_PREFS, owned.join(","));
  Services.prefs.setCharPref(PREF_DEPLOYED_FILES, names.join(","));
  Services.prefs.setCharPref(PREF_DEPLOYED_VERSION, version);

  /* Flushed rather than left to the usual write-on-quit. The gate above is the
   * only thing standing between a startup and an overwrite of the profile's
   * chrome/ folder, so it has to survive a crash: without this, a session that
   * ended badly would redeploy on the next launch and take any un-pushed
   * tools/sync.ps1 edit with it. */
  Services.prefs.savePrefFile(null);
}

/* Called from onShutdown for both disable and uninstall -- see the note there
 * for why it cannot be only one of the two. The names come from a pref rather
 * than from chrome-files.json because on the uninstall path the archive is
 * already gone by the time this runs. */
async function removeStylesheets(forGood) {
  const target = PathUtils.join(PathUtils.profileDir, "chrome");

  for (const name of readList(PREF_DEPLOYED_FILES)) {
    await IOUtils.remove(PathUtils.join(target, name), { ignoreAbsent: true });
  }

  /* The folder itself stays. It is the user's, it may hold their own sheets,
   * and an empty chrome/ costs nothing.
   *
   * THE THEME PREFS ONLY GO ON THE UNINSTALL PATH. On a disable they stay,
   * because clearing them there was tried and made the round trip worse than
   * the problem it solved: widget.windows.mica needs a RESTART to take effect,
   * so clearing it on disable and setting it again on enable leaves the
   * backdrop gone for the whole session after a re-enable and back only on the
   * launch after. Removing the CSS is what makes a disable visible; the
   * backdrop pref does not need to take part, and all three are inert with no
   * sheets to read anyway.
   *
   * On an uninstall there is no next session to protect, and leaving three
   * about:config entries behind for the user to find and revert by hand is not
   * a clean uninstall. Only the ones this add-on actually set are cleared --
   * see WHY THE DEPLOY RECORDS WHICH PREFS WERE ITS OWN above. */
  if (forGood) {
    readList(PREF_OWNED_PREFS).forEach(clearPref);
    clearPref(PREF_OWNED_PREFS);
  }

  clearPref(PREF_DEPLOYED_FILES);
  clearPref(PREF_DEPLOYED_VERSION);
  Services.prefs.savePrefFile(null);
}

/* Tells an uninstall apart from a disable, which onShutdown cannot do on its
 * own -- both reach it with isAppShutdown false.
 *
 * The order this depends on is in XPIInstall.sys.mjs:5066-5130
 * (XPIInstall.uninstallAddon): the onUninstalling listeners are called BEFORE
 * bootstrap.shutdown(ADDON_UNINSTALL), so this fires while the add-on is still
 * running and the flag is already set by the time onShutdown reads it. That is
 * the whole reason this works where `static onUninstall` did not -- see the
 * note in onShutdown for why that hook is never dispatched at all.
 *
 * Undo needs no handling. about:addons uninstalls with undo (addon.uninstall
 * (true), addon-card.mjs:396), and cancelling runs bootstrap.startup
 * (XPIInstall.sys.mjs:5168) -- so onStartup runs again, finds the version gate
 * cleared, and redeploys both the sheets and the prefs. The flag is reset
 * there rather than here because that restart is the only thing that can
 * follow it. */
const uninstallWatcher = {
  addonId: null,
  uninstalling: false,

  onUninstalling(addon) {
    if (addon.id === this.addonId) {
      this.uninstalling = true;
    }
  },
};

function isTargetPage(uri) {
  return TRANSPARENT_PAGES.some(page => uri.startsWith(page));
}

/* The <browser> a content document is embedded in, or null if the document is
 * not in one -- a top-level window, or a document we have no business in. */
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

/* Every browser this script has stamped, so shutdown can put them all back
 * without walking the whole UI looking for them. */
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
      console.error("fluent-transparency: " + error);
    }
  },
};

/* Tabs already open when this add-on was enabled mid-session. Their
 * document-element-inserted has long since fired, so the observer will never
 * see them, and reloading is the only way to get the canvas recomputed. That
 * is why the reload lives ONLY here and never in the observer path, where it
 * would throw away scroll position and form state on every page load. */
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

this.fluentTransparency = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {
    Services.obs.addObserver(documentObserver, "document-element-inserted");

    uninstallWatcher.addonId = this.extension.id;
    uninstallWatcher.uninstalling = false;
    AddonManager.addAddonListener(uninstallWatcher);

    sweepOpenTabs();

    /* Not awaited, and it does not need to be: nothing else here reads the
     * files, and Gecko only looks at the profile's chrome/ folder during
     * startup, so a deploy always takes effect at the NEXT launch. That is why
     * installing this add-on ends with a restart. */
    deployStylesheets(this.extension).catch(error => {
      console.error("fluent-transparency: stylesheet deploy failed: " + error);
    });
  }

  onShutdown(isAppShutdown) {
    Services.obs.removeObserver(documentObserver, "document-element-inserted");
    AddonManager.removeAddonListener(uninstallWatcher);
    if (isAppShutdown) {
      return;
    }
    for (const browser of stamped) {
      try {
        unstamp(browser);
      } catch (error) {
        console.error("fluent-transparency: " + error);
      }
    }
    stamped.clear();

    /* AND THE STYLESHEETS GO WITH IT.
     *
     * This was `static onUninstall` first, and it never ran. The static hooks
     * are dispatched only to modules in apiManager's eventModules registry
     * (ExtensionParent.sys.mjs:112-119 and :208-215), that registry is built
     * from the manifests of INSTALLED add-ons, and the module's url points
     * into the add-on being removed -- so by the time the hook would fire
     * there is nothing left to load it from. Measured: the theme stayed fully
     * applied after two uninstalls, and the console showed the load failing as
     * "module is not a constructor" at ExtensionCommon.sys.mjs:1679.
     *
     * onShutdown has no such problem: it is an instance method on a live
     * object, and the un-stamping above already depends on it working.
     *
     * What it cannot do on its own is tell a disable from an uninstall -- both
     * arrive here as isAppShutdown false. So disabling the add-on also removes
     * the sheets, which is coherent rather than merely tolerable: the add-on IS
     * the theme now. The round trip closes because removeStylesheets clears
     * the version gate, so re-enabling redeploys on the next startup. The one
     * thing that does need the distinction is the prefs, and uninstallWatcher
     * above supplies it.
     *
     * Not awaited -- the caller ignores the return value
     * (ExtensionCommon.sys.mjs:366-371) -- and it does not need to be. The
     * session keeps running, nothing else touches these files, and Gecko only
     * reads them at startup, so the removal lands long before it matters. */
    removeStylesheets(uninstallWatcher.uninstalling).catch(error => {
      console.error("fluent-transparency: stylesheet cleanup failed: " + error);
    });
  }

  getAPI() {
    return { fluentTransparency: {} };
  }
};
