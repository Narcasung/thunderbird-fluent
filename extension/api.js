/* ============================================================================
 * Fluent 2 for Thunderbird -- TRANSPARENCY BRIDGE
 *
 * WHAT THIS DOES, IN ONE SENTENCE
 * It sets the attribute `transparent` on the <browser> of five content tabs,
 * and a marker attribute on their documents so the theme's CSS knows it may
 * drop those pages' backgrounds. Nothing else. No network, no message access,
 * no storage.
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

/* The content tabs the theme has finished. Matched with startsWith, because
 * these carry fragments and queries in normal use (about:preferences#general,
 * about:addons?view=...).
 *
 * THIS LIST IS STAGED ON PURPOSE. Add a page here only once its CSS has
 * landed, never before. Stamping a page early is not harmless: suppressing
 * the backstop leaves whatever the page itself paints, and a page that
 * paints nothing on its root -- which is exactly what the backstop lets a
 * page get away with -- goes fully see-through, with no gate to stop it,
 * because the theme has no rule for that page yet to gate.
 *
 * Remaining, in the order they are being done:
 *   about:config           body is already the card; one surface
 *   about:preferences      plus its category sidebar
 *   about:addons           canvas comes through --background-color-canvas
 *   about:accountsettings  two documents, the am-* iframe is the second
 */
const TRANSPARENT_PAGES = ["about:addressbook"];

const MARKER = "fluent-transparency";
const XUL_NS =
  "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

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
    sweepOpenTabs();
  }

  onShutdown(isAppShutdown) {
    Services.obs.removeObserver(documentObserver, "document-element-inserted");
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
  }

  getAPI() {
    return { fluentTransparency: {} };
  }
};
