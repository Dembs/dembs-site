import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initActionBar, initAppPicker, initMenu, initReveals, pickActionVariant, renderFocusCampaign, revealDelay, selectApp, setActionBarVariant } from "../assets/js/site.js";

const css = await readFile(new URL("../assets/css/site.css", import.meta.url), "utf8");

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle: (name, force) => force ? values.add(name) : values.delete(name),
    contains: (name) => values.has(name)
  };
}

function makeMediaQuery(matches = false) {
  const listeners = new Set();
  return {
    matches,
    addEventListener(type, listener) {
      if (type === "change") listeners.add(listener);
    },
    dispatch(nextMatches) {
      this.matches = nextMatches;
      for (const listener of listeners) listener({ matches: nextMatches });
    }
  };
}

function makeDetailRoot() {
  const fields = new Map([
    ["[data-app-icon]", { src: "", classList: makeClassList() }],
    ["[data-app-name]", { textContent: "" }],
    ["[data-app-tag]", { textContent: "" }],
    ["[data-app-description]", { textContent: "" }],
    ["[data-app-stores]", { hidden: false }],
    ["[data-app-status]", { hidden: true, textContent: "" }],
    ["[data-app-store]", { href: "" }],
    ["[data-play-store]", { href: "" }],
    ["[data-app-web]", { hidden: true, href: "", textContent: "" }]
  ]);
  const properties = new Map();
  const detail = {
    classList: makeClassList(),
    dataset: {},
    querySelector: (selector) => fields.get(selector),
    style: { setProperty: (name, value) => properties.set(name, value) }
  };
  const buttons = ["streetpark", "last-rep"].map((appId) => ({
    dataset: { appId },
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); }
  }));
  return {
    buttons,
    detail,
    fields,
    properties,
    querySelector: (selector) => selector === "#app-detail" ? detail : null,
    querySelectorAll: (selector) => selector === "[data-app-id]" ? buttons : []
  };
}

function makeRevealRoot(mediaQuery = makeMediaQuery(false)) {
  const items = [2, 9].map((revealIndex) => {
    const properties = new Map();
    return {
      dataset: { revealIndex: String(revealIndex) },
      classList: makeClassList(),
      style: { setProperty: (name, value) => properties.set(name, value) },
      properties
    };
  });
  return {
    defaultView: { matchMedia: () => mediaQuery },
    documentElement: { classList: makeClassList() },
    items,
    mediaQuery,
    querySelectorAll: (selector) => selector === "[data-reveal]" ? items : []
  };
}

function makeMenuRoot() {
  const buttonListeners = new Map();
  const panelListeners = new Map();
  const scrimListeners = new Map();
  const rootListeners = new Map();
  const firstLink = { focus() {} };
  const button = {
    attributes: new Map([["aria-expanded", "false"], ["aria-label", "Ouvrir le menu"]]),
    addEventListener(type, listener) { buttonListeners.set(type, listener); },
    focus() {},
    getAttribute(name) { return this.attributes.get(name) ?? null; },
    setAttribute(name, value) { this.attributes.set(name, value); }
  };
  const panel = {
    hidden: true,
    addEventListener(type, listener) { panelListeners.set(type, listener); },
    querySelector: () => firstLink,
    querySelectorAll: () => [firstLink]
  };
  const scrim = {
    hidden: true,
    addEventListener(type, listener) { scrimListeners.set(type, listener); }
  };
  const root = {
    activeElement: null,
    body: { classList: makeClassList() },
    addEventListener(type, listener) { rootListeners.set(type, listener); },
    querySelector(selector) {
      if (selector === "[data-menu-toggle]") return button;
      if (selector === "#site-menu") return panel;
      if (selector === "[data-menu-close]") return scrim;
      return null;
    }
  };
  return { button, buttonListeners, panel, root };
}

test("reveal staggering is capped to keep the page responsive", () => {
  assert.equal(revealDelay(0), 0);
  assert.equal(revealDelay(2), 140);
  assert.equal(revealDelay(9), 280);
});

test("reveals assign capped delays and become visible only once observed", () => {
  const root = makeRevealRoot();
  const previousWindow = globalThis.window;
  const previousMatchMedia = globalThis.matchMedia;
  const previousIntersectionObserver = globalThis.IntersectionObserver;
  let observer;
  globalThis.window = globalThis;
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(item) { (this.items ??= []).push(item); }
    unobserve(item) { (this.unobserved ??= []).push(item); }
  };
  try {
    initReveals(root);
    assert.equal(root.documentElement.classList.contains("reveal-enabled"), true);
    assert.equal(root.items[0].properties.get("--reveal-delay"), "140ms");
    assert.equal(root.items[1].properties.get("--reveal-delay"), "280ms");
    observer.callback([{ isIntersecting: true, target: root.items[0] }]);
    assert.equal(root.items[0].classList.contains("is-visible"), true);
    assert.deepEqual(observer.unobserved, [root.items[0]]);
  } finally {
    globalThis.window = previousWindow;
    globalThis.matchMedia = previousMatchMedia;
    globalThis.IntersectionObserver = previousIntersectionObserver;
  }
});

test("revealing a group also reveals its nested staggered items", () => {
  const root = makeRevealRoot();
  const [group, nestedItem] = root.items;
  group.querySelectorAll = (selector) => selector === "[data-reveal]" ? [nestedItem] : [];
  nestedItem.querySelectorAll = () => [];
  const previousWindow = globalThis.window;
  const previousMatchMedia = globalThis.matchMedia;
  const previousIntersectionObserver = globalThis.IntersectionObserver;
  let observer;
  globalThis.window = globalThis;
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(item) { (this.items ??= []).push(item); }
    unobserve(item) { (this.unobserved ??= []).push(item); }
  };
  try {
    initReveals(root);
    observer.callback([{ isIntersecting: true, target: group }]);

    assert.equal(group.classList.contains("is-visible"), true);
    assert.equal(nestedItem.classList.contains("is-visible"), true);
    assert.deepEqual(observer.unobserved, [group, nestedItem]);
  } finally {
    globalThis.window = previousWindow;
    globalThis.matchMedia = previousMatchMedia;
    globalThis.IntersectionObserver = previousIntersectionObserver;
  }
});

test("reduced motion leaves reveal content immediately available", () => {
  const mediaQuery = makeMediaQuery(true);
  const root = makeRevealRoot(mediaQuery);
  const previousWindow = globalThis.window;
  const previousMatchMedia = globalThis.matchMedia;
  const previousIntersectionObserver = globalThis.IntersectionObserver;
  let observers = 0;
  globalThis.window = globalThis;
  globalThis.matchMedia = () => mediaQuery;
  globalThis.IntersectionObserver = class { constructor() { observers += 1; } };
  try {
    initReveals(root);
    assert.equal(root.documentElement.classList.contains("reveal-enabled"), false);
    assert.equal(observers, 0);
  } finally {
    globalThis.window = previousWindow;
    globalThis.matchMedia = previousMatchMedia;
    globalThis.IntersectionObserver = previousIntersectionObserver;
  }
});

test("reveals become immediately visible when reduced motion changes live", () => {
  const mediaQuery = makeMediaQuery(false);
  const root = makeRevealRoot(mediaQuery);
  const previousWindow = globalThis.window;
  const previousMatchMedia = globalThis.matchMedia;
  const previousIntersectionObserver = globalThis.IntersectionObserver;
  let observer;
  globalThis.window = globalThis;
  globalThis.matchMedia = () => mediaQuery;
  globalThis.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    disconnect() { this.disconnected = true; }
    observe(item) { (this.items ??= []).push(item); }
    unobserve() {}
  };
  try {
    initReveals(root);
    assert.equal(root.documentElement.classList.contains("reveal-enabled"), true);

    mediaQuery.dispatch(true);

    assert.equal(root.documentElement.classList.contains("reveal-enabled"), false);
    assert.equal(observer.disconnected, true);
    assert.equal(root.items.every((item) => item.classList.contains("is-visible")), true);
  } finally {
    globalThis.window = previousWindow;
    globalThis.matchMedia = previousMatchMedia;
    globalThis.IntersectionObserver = previousIntersectionObserver;
  }
});

test("app selection reveals store links or an explicit unpublished status", () => {
  const root = makeDetailRoot();
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    selectApp("streetpark", root);
    assert.equal(root.fields.get("[data-app-stores]").hidden, false);
    assert.equal(root.fields.get("[data-app-status]").hidden, true);
    assert.equal(root.fields.get("[data-app-web]").hidden, true);
    assert.match(root.fields.get("[data-app-store]").href, /^https:\/\/apps\.apple\.com/);
    assert.match(root.fields.get("[data-play-store]").href, /^https:\/\/play\.google\.com/);

    selectApp("last-rep", root);
    assert.equal(root.fields.get("[data-app-stores]").hidden, true);
    assert.equal(root.fields.get("[data-app-status]").hidden, false);
    assert.equal(root.fields.get("[data-app-status]").textContent, "Bêta, bientôt sur les stores");
    // No app has a site of its own: the optional web link never shows.
    assert.equal(root.fields.get("[data-app-web]").hidden, true);
    assert.equal(root.buttons[0].attributes.get("aria-current"), "false");
    assert.equal(root.buttons[1].attributes.get("aria-current"), "true");
    assert.equal(root.detail.classList.contains("is-entering"), true);
  } finally {
    globalThis.requestAnimationFrame = previousAnimationFrame;
  }
});

test("menu toggle names the action that matches its expanded state", () => {
  const { button, buttonListeners, root } = makeMenuRoot();
  initMenu(root);

  buttonListeners.get("click")();
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(button.getAttribute("aria-label"), "Fermer le menu");

  buttonListeners.get("click")();
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(button.getAttribute("aria-label"), "Ouvrir le menu");
});

test("the app card keeps the site palette and only tints itself with the app colour", () => {
  assert.match(css, /\.app-detail \{[^}]*background: color-mix\(in srgb, var\(--app-background, var\(--mist\)\) 14%, var\(--ground\)\)[^}]*color: var\(--ink\)/);
  assert.match(css, /\.app-detail \[data-app-stores\] a \{[^}]*background: var\(--cobalt\); color: var\(--ground\)/);
  assert.match(css, /\.app-detail \[data-app-status\] \{[^}]*color: var\(--slate\)/);
});

test("the action bar switches between the Lab, Motion Stack, cadrage and audit paths", () => {
  const nodes = {
    lab: [{ hidden: false }, { hidden: false }],
    motion: [{ hidden: true }, { hidden: true }],
    cadrage: [{ hidden: false }, { hidden: false }],
    audit: [{ hidden: true }, { hidden: true }]
  };
  const bar = {
    dataset: {},
    querySelectorAll: (selector) => nodes[selector.match(/data-variant-(\w+)/)?.[1]] ?? []
  };
  setActionBarVariant(bar, "audit");
  assert.equal(bar.dataset.variant, "audit");
  assert.deepEqual(nodes.lab.map((n) => n.hidden), [true, true]);
  assert.deepEqual(nodes.cadrage.map((n) => n.hidden), [true, true]);
  assert.deepEqual(nodes.audit.map((n) => n.hidden), [false, false]);
  setActionBarVariant(bar, "cadrage");
  assert.deepEqual(nodes.lab.map((n) => n.hidden), [true, true]);
  assert.deepEqual(nodes.cadrage.map((n) => n.hidden), [false, false]);
  assert.deepEqual(nodes.audit.map((n) => n.hidden), [true, true]);
  assert.deepEqual(nodes.motion.map((n) => n.hidden), [true, true]);
  setActionBarVariant(bar, "motion");
  assert.equal(bar.dataset.variant, "motion");
  assert.deepEqual(nodes.motion.map((n) => n.hidden), [false, false]);
  assert.deepEqual(nodes.lab.map((n) => n.hidden), [true, true]);
  assert.deepEqual(nodes.cadrage.map((n) => n.hidden), [true, true]);
  setActionBarVariant(bar, "lab");
  assert.deepEqual(nodes.lab.map((n) => n.hidden), [false, false]);
  assert.deepEqual(nodes.motion.map((n) => n.hidden), [true, true]);
  assert.deepEqual(nodes.cadrage.map((n) => n.hidden), [true, true]);
  assert.deepEqual(nodes.audit.map((n) => n.hidden), [true, true]);
});

test("the action bar prefers the most specific offer on screen", () => {
  assert.equal(pickActionVariant([]), "lab");
  assert.equal(pickActionVariant(["motion"]), "motion");
  assert.equal(pickActionVariant(["motion", "motion"]), "motion");
  assert.equal(pickActionVariant(["motion", "cadrage"]), "cadrage");
  assert.equal(pickActionVariant(["cadrage", "audit", "motion"]), "audit");
  assert.equal(pickActionVariant(["unknown"]), "lab");
});

test("the action bar follows services and returns to the Lab outside them", () => {
  let callback;
  const observed = [];
  class FakeObserver {
    constructor(cb) { callback = cb; }
    observe(target) { observed.push(target); }
  }
  const stage = { dataset: { action: "motion" } };
  const contents = { dataset: { action: "motion" } };
  const services = { dataset: { action: "cadrage" } };
  const audit = { dataset: { action: "audit" } };
  const nodes = { lab: [{ hidden: false }], motion: [{ hidden: true }], cadrage: [{ hidden: true }], audit: [{ hidden: true }] };
  const bar = { dataset: {}, querySelectorAll: (selector) => nodes[selector.match(/data-variant-(\w+)/)?.[1]] ?? [] };
  const root = {
    defaultView: { IntersectionObserver: FakeObserver },
    querySelector: (selector) => selector === "[data-action-bar]" ? bar : null,
    querySelectorAll: (selector) => selector === "[data-action]" ? [stage, contents, services, audit] : []
  };
  initActionBar(root);
  assert.deepEqual(observed, [stage, contents, services, audit]);
  // The course has two targets (the phone, then its contents); the bar stays on it
  // while either one is on screen.
  callback([{ target: stage, isIntersecting: true }]);
  assert.equal(bar.dataset.variant, "motion");
  assert.equal(nodes.motion[0].hidden, false);
  callback([{ target: contents, isIntersecting: true }, { target: stage, isIntersecting: false }]);
  assert.equal(bar.dataset.variant, "motion");
  callback([{ target: contents, isIntersecting: false }]);
  assert.equal(bar.dataset.variant, "lab");
  callback([{ target: services, isIntersecting: true }]);
  assert.equal(bar.dataset.variant, "cadrage");
  callback([{ target: audit, isIntersecting: true }]);
  assert.equal(bar.dataset.variant, "audit");
  callback([{ target: audit, isIntersecting: false }]);
  assert.equal(bar.dataset.variant, "cadrage");
  callback([{ target: services, isIntersecting: false }]);
  assert.equal(bar.dataset.variant, "lab");
});

test("reduced motion removes animation and transition delays", () => {
  const reducedMotionBlock = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? "";
  assert.match(reducedMotionBlock, /animation-delay:\s*0(?:ms|s)\s*!important/);
  assert.match(reducedMotionBlock, /transition-delay:\s*0(?:ms|s)\s*!important/);
});

test("the main Lab action uses one restrained four-second attention cycle", () => {
  assert.match(css, /\.lab-cta\s*\{[^}]*animation:\s*lab-cta-nudge 4s/);
  const keyframes = css.match(/@keyframes lab-cta-nudge\s*\{([^}]*(?:\}[^@]*)?)\}/)?.[1] ?? "";
  assert.match(keyframes, /0%,\s*78%,\s*100%/);
});

test("decorative artwork cannot create horizontal scrolling on mobile", () => {
  assert.match(css, /html\s*\{[^}]*overflow-x:\s*clip/);
});

test("the Lab section uses the quiet page palette with cobalt reserved for emphasis", () => {
  assert.match(css, /\.lab-portal \{ color: var\(--ink\); \}/);
  assert.match(css, /\.lab-portal::before \{[^}]*var\(--band\)/);
  assert.doesNotMatch(css, /\.lab-console|\.lab-bubble|\.lab-readout/);
});

test("the Lab comes alive once with a six-second liquid accent and staggered benefits", () => {
  assert.match(css, /\.lab-portal\.is-visible \.lab-mark-liquid\s*\{[^}]*animation:\s*lab-liquid-fill/);
  assert.match(css, /\.lab-portal\.is-visible \.lab-liquid-group\s*\{[^}]*animation:\s*lab-liquid-sway 6s/);
  assert.match(css, /\.lab-portal\.is-visible \.lab-benefits li\s*\{[^}]*animation:\s*lab-benefit-in/);
  assert.match(css, /\.lab-benefits li:nth-child\(3\)\s*\{[^}]*animation-delay:/);
});

test("Kuts is a pixel sprite, drawn at a whole multiple of its 60 x 53 frames", () => {
  // 2x: 120 x 106, eight frames on one strip, never smoothed.
  assert.match(css, /\.ms-run \{[^}]*--kw: 120px; --kh: 106px;/);
  const kuts = css.match(/\.ms-kuts \{[^}]*\}/)?.[0] ?? "";
  assert.match(kuts, /url\("\.\.\/img\/kuts-pixel\.png"\)/);
  assert.match(kuts, /calc\(var\(--kw\) \* 8\) var\(--kh\)/);
  assert.match(kuts, /image-rendering: pixelated/);
});

test("Kuts runs the loading bar once, in steps, and rests on its final pose", () => {
  assert.match(css, /\.reveal-enabled \.ms-run\.is-visible \.ms-kuts \{ animation: kuts-pose 6s step-end [^;]*kuts-travel 3\.6s steps\(18, end\)[^;]*kuts-hop \.45s step-end 1\.7s 8/);
  assert.match(css, /\.reveal-enabled \.ms-run\.is-visible \.ms-bar::before \{ animation: bar-fill 3\.6s steps\(18, end\)/);
  for (const name of ["kuts-pose", "kuts-travel", "kuts-hop", "kuts-idle", "bar-fill"]) assert.match(css, new RegExp(`@keyframes ${name} `));
  // Without the animation (reduced motion, no reveals) Kuts already stands at the end of the bar.
  assert.match(css, /\.ms-kuts \{[^}]*left: calc\(100% - var\(--kw\)\)/);
  // It points at the button only where the button stands beside the bar.
  assert.match(css, /\.ms-run \{[^}]*--end: 0;/);
  const tablet = css.match(/@media \(min-width: 760px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(tablet, /\.ms-run \{ --end: 7; grid-template-columns:/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{[^}]*animation-duration: 0\.01ms !important/);
});

test("the old vector mascot, its bubble and the promo video are gone", () => {
  assert.doesNotMatch(css, /motion-mascot|motion-freddy|ms-paws|ms-chip|ms-stage|ms-phone|ms-video|kuts-peek|is-playing/);
  assert.doesNotMatch(css, /\.card-grid \.soon|motion-clapper|motion-mascot-stage|clapper-close/);
});

test("Motion Stack is a glow on the light page, never a slab with hard edges", () => {
  const ms = css.match(/\.ms \{[^}]*\}/)?.[0] ?? "";
  const glow = css.match(/\.ms::before \{[^}]*\}/)?.[0] ?? "";
  assert.doesNotMatch(ms, /background/);
  assert.match(glow, /radial-gradient/);
  assert.doesNotMatch(glow, /linear-gradient\(180deg, var\(--marine\)|var\(--night\)/);
  assert.match(glow, /mask-image: linear-gradient\(180deg, transparent, #000 16%, #000 84%, transparent\)/);
  // Grey bands fade in and out from white instead of starting on a hard line.
  assert.match(css, /\.band::before, \.lab-portal::before \{[^}]*linear-gradient\(180deg, rgb\(247 249 252 \/ 0\), var\(--band\)/);
  assert.doesNotMatch(css, /box-shadow: 0 0 0 100vmax/);
  // The closing invite is a rounded card in the column, not a full-width dark floor.
  assert.match(css, /\.footer-invite \{[^}]*border-radius: 1\.5rem/);
  assert.doesNotMatch(css, /\.footer-invite::before/);
});

test("the edit timeline sweeps one playhead and holds still under reduced motion", () => {
  assert.match(css, /\.ms-playhead i \{[^}]*left: 46%;[^}]*animation: ms-sweep 18s linear infinite/);
  assert.match(css, /@keyframes ms-sweep \{ from \{ left: 0; \} to \{ left: 100%; \} \}/);
});

test("the headline keeps \"Claude Code\" on one slab and only goes two columns with room", () => {
  assert.match(css, /\.ms h2 em \{[^}]*white-space: nowrap/);
  // Between 760 and 1000 px a side-by-side layout squeezed the title onto 7 lines.
  const tablet = css.match(/@media \(min-width: 760px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(tablet, /\.ms-top \{/);
  assert.match(css, /@media \(min-width: 1000px\) \{\s*\.ms-top \{ grid-template-columns:/);
});

test("revealing cards keep their own hover lift and easing", () => {
  // The reveal sets transform and transition; hover moves with translate instead.
  for (const selector of [/\.ms-cards li:hover \{[^}]*translate: 0 -3px/, /\.card-grid article:hover \{[^}]*translate: 0 -2px/, /\.gear-feature:hover \{[^}]*translate: 0 -2px/]) {
    assert.match(css, selector);
  }
  assert.match(css, /\.ms-cards li\[data-reveal\], \.card-grid article\[data-reveal\], \.gear-feature\[data-reveal\] \{ transition:[^}]*translate 180ms/);
});

test("focus keeps the site-wide cobalt ring and every anchor clears the header", () => {
  assert.match(css, /^:focus-visible \{ outline: 3px solid var\(--cobalt\); outline-offset: 3px; \}/m);
  assert.doesNotMatch(css, /\.ms :focus-visible/);
  assert.match(css, /main > section\[id\] \{ scroll-margin-top: var\(--header-h\); \}/);
});

function makeCampaignRoot() {
  const slots = new Map(["[data-campaign-eyebrow]", "[data-campaign-title]", "[data-campaign-description]", "[data-campaign-link]", "[data-campaign-affiliate]"]
    .map((selector) => [selector, { textContent: "", href: "", hidden: true }]));
  const container = { hidden: true, querySelector: (selector) => slots.get(selector) };
  const scrolls = [];
  const section = { scrollIntoView: (options) => scrolls.push(options) };
  let fontsReady;
  const view = { scrollY: 1130 };
  const root = {
    defaultView: view,
    fonts: { ready: new Promise((resolve) => { fontsReady = resolve; }) },
    querySelector: (selector) => selector === "#campaign" ? container : null,
    getElementById: (id) => id === "motion-stack" ? section : null
  };
  return { container, root, scrolls, slots, view, fontsReady: () => fontsReady() };
}

test("the Motion Stack campaign lands on the section instead of repeating it in a card", async () => {
  const { container, root, scrolls, fontsReady } = makeCampaignRoot();
  renderFocusCampaign(root, "?focus=motion-stack");
  assert.equal(container.hidden, true);
  assert.deepEqual(scrolls, [{ block: "start", behavior: "instant" }]);
  // Once the web fonts have swapped in, it lands again in case the section moved.
  fontsReady();
  await root.fonts.ready;
  assert.equal(scrolls.length, 2);
});

test("a visitor who already scrolled is not pulled back when the fonts arrive", async () => {
  const { root, scrolls, view, fontsReady } = makeCampaignRoot();
  renderFocusCampaign(root, "?focus=motion-stack");
  view.scrollY = 1600;
  fontsReady();
  await root.fonts.ready;
  assert.equal(scrolls.length, 1);
});

test("a card campaign still fills and shows its card without scrolling anywhere", () => {
  const { container, root, scrolls, slots } = makeCampaignRoot();
  renderFocusCampaign(root, "?focus=guide-stores");
  assert.equal(container.hidden, false);
  assert.equal(slots.get("[data-campaign-title]").textContent, "Publier sans se faire recaler");
  assert.equal(slots.get("[data-campaign-link]").href, "https://ressources.dembs.fr/guide");
  assert.deepEqual(scrolls, []);
  renderFocusCampaign(root, "?focus=unknown");
  assert.equal(container.hidden, true);
  assert.deepEqual(scrolls, []);
});

function withObserverStub(run) {
  const previousWindow = globalThis.window;
  const previousMatchMedia = globalThis.matchMedia;
  const previousIntersectionObserver = globalThis.IntersectionObserver;
  let observer;
  globalThis.window = globalThis;
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    disconnect() {}
    observe(item) { (this.items ??= []).push(item); }
    unobserve(item) { (this.unobserved ??= []).push(item); }
  };
  try {
    return run(() => observer);
  } finally {
    globalThis.window = previousWindow;
    globalThis.matchMedia = previousMatchMedia;
    globalThis.IntersectionObserver = previousIntersectionObserver;
  }
}

test("a block flicked past the top still reveals instead of staying invisible", () => {
  const root = makeRevealRoot();
  withObserverStub((getObserver) => {
    initReveals(root);
    // A fast scroll batches callbacks: the entry lands after the block already
    // left the viewport upwards, so it reports isIntersecting false and would
    // never intersect again.
    getObserver().callback([{
      isIntersecting: false,
      boundingClientRect: { top: -900, bottom: -120 },
      target: root.items[0]
    }]);
    assert.equal(root.items[0].classList.contains("is-visible"), true);
    assert.deepEqual(getObserver().unobserved, [root.items[0]]);
  });
});

test("a block still below the fold stays hidden until it is reached", () => {
  const root = makeRevealRoot();
  withObserverStub((getObserver) => {
    initReveals(root);
    getObserver().callback([{
      isIntersecting: false,
      boundingClientRect: { top: 1400, bottom: 2100 },
      target: root.items[1]
    }]);
    assert.equal(root.items[1].classList.contains("is-visible"), false);
    assert.equal(getObserver().unobserved, undefined);
  });
});

function makePickerRoot(preselected = null) {
  const detailRoot = makeDetailRoot();
  const gridListeners = new Map();
  const grid = {
    addEventListener: (type, listener) => gridListeners.set(type, listener),
    querySelector: () => preselected
  };
  const root = {
    ...detailRoot,
    querySelector: (selector) => selector === "#app-grid" ? grid : detailRoot.querySelector(selector)
  };
  return { detailRoot, gridListeners, root };
}

test("the app picker renders the pre-selected tile on load", () => {
  const { detailRoot, root } = makePickerRoot({ dataset: { appId: "streetpark" } });
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    initAppPicker(root);
    assert.equal(detailRoot.fields.get("[data-app-name]").textContent, "StreetPark");
    assert.equal(detailRoot.properties.get("--app-background"), "#B6B3FF");
    assert.equal(detailRoot.properties.get("--app-badge-background"), "#17142B");
  } finally {
    globalThis.requestAnimationFrame = previousAnimationFrame;
  }
});

test("the app picker selects on tap without any autoplay machinery", () => {
  const { detailRoot, gridListeners, root } = makePickerRoot();
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    initAppPicker(root);
    assert.deepEqual([...gridListeners.keys()], ["click"]);

    const button = { dataset: { appId: "last-rep" }, closest: (selector) => selector === "[data-app-id]" ? button : null };
    gridListeners.get("click")({ target: button });

    assert.equal(detailRoot.fields.get("[data-app-name]").textContent, "Last Rep");
    assert.equal(detailRoot.fields.get("[data-app-status]").hidden, false);
    assert.equal(detailRoot.buttons[1].attributes.get("aria-current"), "true");
  } finally {
    globalThis.requestAnimationFrame = previousAnimationFrame;
  }
});

test("a tap that lands outside any tile changes nothing", () => {
  const { detailRoot, gridListeners, root } = makePickerRoot();
  initAppPicker(root);
  gridListeners.get("click")({ target: { closest: () => null } });
  assert.equal(detailRoot.fields.get("[data-app-name]").textContent, "");
});

function makeViewportRevealRoot({ tops = [100, 2000], innerHeight = 800 } = {}) {
  const mediaQuery = makeMediaQuery(false);
  const timeouts = [];
  const items = tops.map((top, index) => {
    const properties = new Map();
    return {
      dataset: { revealIndex: String(index) },
      classList: makeClassList(),
      style: { setProperty: (name, value) => properties.set(name, value) },
      getBoundingClientRect: () => ({ top, bottom: top + 300 }),
      properties
    };
  });
  return {
    defaultView: {
      innerHeight,
      matchMedia: () => mediaQuery,
      clearTimeout: () => {},
      setTimeout: (callback) => { timeouts.push(callback); return timeouts.length; }
    },
    documentElement: { classList: makeClassList() },
    items,
    timeouts,
    querySelectorAll: (selector) => selector === "[data-reveal]" ? items : []
  };
}

test("whatever is already on screen reveals without waiting for a callback", () => {
  const root = makeViewportRevealRoot();
  withObserverStub((getObserver) => {
    initReveals(root);
    // Above the fold: readable immediately, and never handed to the observer.
    assert.equal(root.items[0].classList.contains("is-visible"), true);
    assert.equal(root.items[1].classList.contains("is-visible"), false);
    assert.deepEqual(getObserver().items, [root.items[1]]);
  });
});

test("content never stays invisible when the observer delivers nothing", () => {
  const root = makeViewportRevealRoot();
  withObserverStub(() => {
    initReveals(root);
    assert.equal(root.items[1].classList.contains("is-visible"), false);
    assert.equal(root.timeouts.length, 1);

    // A backgrounded tab defers delivery; the decoration must give way to the content.
    root.timeouts[0]();

    assert.equal(root.documentElement.classList.contains("reveal-enabled"), false);
    assert.equal(root.items.every((item) => item.classList.contains("is-visible")), true);
  });
});

test("the safety net stands down once the observer has delivered", () => {
  const root = makeViewportRevealRoot();
  withObserverStub((getObserver) => {
    initReveals(root);
    getObserver().callback([{ isIntersecting: true, boundingClientRect: { bottom: 400 }, target: root.items[1] }]);

    root.timeouts[0]();

    // Delivery worked, so the reveal effect survives for the rest of the visit.
    assert.equal(root.documentElement.classList.contains("reveal-enabled"), true);
  });
});

test("the pre-selected card renders without the entrance animation", () => {
  const { detailRoot, root } = makePickerRoot({ dataset: { appId: "streetpark" } });
  initAppPicker(root);
  // is-entering fills both ways, so on load it would hold the card at opacity 0
  // wherever the animation is throttled.
  assert.equal(detailRoot.detail.classList.contains("is-entering"), false);
  assert.equal(detailRoot.fields.get("[data-app-name]").textContent, "StreetPark");
});
