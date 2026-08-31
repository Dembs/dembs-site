import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getMascotGaze, initAppPicker, initMenu, initReveals, initMotionMascot, revealDelay, selectApp } from "../assets/js/site.js";

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
    ["[data-play-store]", { href: "" }]
  ]);
  const properties = new Map();
  const detail = {
    classList: makeClassList(),
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

test("the Motion Stack mascot gaze is centred and clamped inside its face", () => {
  const face = { left: 100, top: 50, width: 80, height: 60 };

  assert.deepEqual(getMascotGaze(face, { clientX: 140, clientY: 80 }), { x: 0, y: 0 });
  assert.deepEqual(getMascotGaze(face, { clientX: 999, clientY: -999 }), { x: 8, y: -8 });
  assert.deepEqual(getMascotGaze(face, { clientX: -999, clientY: 999 }), { x: -8, y: 8 });
});

test("the Motion Stack mascot follows the pointer and recentres when it leaves", () => {
  const listeners = new Map();
  const properties = new Map();
  const face = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 80, height: 60 }) };
  const card = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector(selector) { return selector === "[data-motion-face]" ? face : null; },
    style: { setProperty(name, value) { properties.set(name, value); } }
  };
  const root = {
    defaultView: { matchMedia: () => ({ matches: false }) },
    querySelector(selector) { return selector === "[data-motion-mascot]" ? card : null; }
  };

  initMotionMascot(root);
  listeners.get("pointermove")({ clientX: 999, clientY: -999 });
  assert.equal(properties.get("--gaze-x"), "8px");
  assert.equal(properties.get("--gaze-y"), "-8px");

  listeners.get("pointerleave")();
  assert.equal(properties.get("--gaze-x"), "0px");
  assert.equal(properties.get("--gaze-y"), "0px");
});

test("the Motion Stack mascot does not track touch on coarse-pointer devices", () => {
  const listeners = new Map();
  const face = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 80, height: 60 }) };
  const card = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector(selector) { return selector === "[data-motion-face]" ? face : null; },
    style: { setProperty() {} }
  };
  const root = {
    defaultView: { matchMedia: (query) => ({ matches: query === "(pointer: coarse)" }) },
    querySelector(selector) { return selector === "[data-motion-mascot]" ? card : null; }
  };

  initMotionMascot(root);

  assert.equal(listeners.size, 0);
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
    assert.match(root.fields.get("[data-app-store]").href, /^https:\/\/apps\.apple\.com/);
    assert.match(root.fields.get("[data-play-store]").href, /^https:\/\/play\.google\.com/);

    selectApp("last-rep", root);
    assert.equal(root.fields.get("[data-app-stores]").hidden, true);
    assert.equal(root.fields.get("[data-app-status]").hidden, false);
    assert.equal(root.fields.get("[data-app-status]").textContent, "Bêta, bientôt sur les stores");
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

test("per-app tag and status text inherit the readable foreground color", () => {
  assert.match(
    css,
    /\.app-detail \[data-app-tag\],\s*\.app-detail \[data-app-status\]\s*\{\s*color:\s*inherit;/
  );
});

test("reduced motion removes animation and transition delays", () => {
  const reducedMotionBlock = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? "";
  assert.match(reducedMotionBlock, /animation-delay:\s*0(?:ms|s)\s*!important/);
  assert.match(reducedMotionBlock, /transition-delay:\s*0(?:ms|s)\s*!important/);
});

test("the Motion Stack clapper uses one restrained closing animation", () => {
  assert.match(css, /\.motion-clapper\s*\{[^}]*animation:\s*clapper-float/);
  assert.match(css, /\.motion-clapper-slate\s*\{[^}]*animation:\s*clapper-close 2\.8s/);
  assert.match(css, /@keyframes clapper-close/);
  assert.doesNotMatch(css, /scissors-(?:float|cut)/);
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
