import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initCarousel, initReveals, isTapGesture, revealDelay, selectApp, wrapLoopPosition } from "../assets/js/site.js";

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

function makeCarouselRoot(reducedMotion = true) {
  const listeners = new Map();
  const makeButton = (appId) => ({
    dataset: { appId },
    attributes: new Map(),
    cloneNode() { return makeButton(appId); },
    closest(selector) { return selector === "[data-app-id]" ? this : null; },
    getAttribute(name) { return this.attributes.get(name) ?? null; },
    setAttribute(name, value) { this.attributes.set(name, value); }
  });
  const rail = {
    capturedPointers: new Set(),
    children: ["streetpark", "civi", "last-rep", "bascule"].map(makeButton),
    clientWidth: 300,
    scrollLeft: 0,
    get scrollWidth() { return this.children.length * 100; },
    append(child) {
      this.children.push(child);
      Object.defineProperty(child, "offsetLeft", { get: () => this.children.indexOf(child) * 100 });
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    hasPointerCapture(pointerId) { return this.capturedPointers.has(pointerId); },
    releasePointerCapture(pointerId) { this.capturedPointers.delete(pointerId); },
    setPointerCapture(pointerId) { this.capturedPointers.add(pointerId); }
  };
  rail.children.forEach((button, index) => {
    Object.defineProperty(button, "offsetLeft", { get: () => rail.children.indexOf(button) * 100 });
  });
  const view = {
    animationFrames: 0,
    animationFrameCallbacks: [],
    timeoutCallbacks: [],
    clearTimeout() {},
    matchMedia: () => ({ matches: reducedMotion }),
    requestAnimationFrame(callback) {
      this.animationFrames += 1;
      this.animationFrameCallbacks.push(callback);
    },
    setTimeout(callback) {
      this.timeoutCallbacks.push(callback);
      return this.timeoutCallbacks.length;
    }
  };
  return {
    defaultView: view,
    listeners,
    querySelector: (selector) => selector === "#app-rail" ? rail : null,
    rail,
    view
  };
}

function makeRevealRoot() {
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
    documentElement: { classList: makeClassList() },
    items,
    querySelectorAll: (selector) => selector === "[data-reveal]" ? items : []
  };
}

test("tap detection separates a touch from a drag", () => {
  assert.equal(isTapGesture({ x: 10, y: 10 }, { x: 16, y: 15 }), true);
  assert.equal(isTapGesture({ x: 10, y: 10 }, { x: 25, y: 10 }), false);
});

test("loop position remains inside one repeated app set", () => {
  assert.equal(wrapLoopPosition(410, 400), 10);
  assert.equal(wrapLoopPosition(-10, 400), 390);
  assert.equal(wrapLoopPosition(25, 0), 0);
});

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

test("reduced motion leaves reveal content immediately available", () => {
  const root = makeRevealRoot();
  const previousWindow = globalThis.window;
  const previousMatchMedia = globalThis.matchMedia;
  const previousIntersectionObserver = globalThis.IntersectionObserver;
  let observers = 0;
  globalThis.window = globalThis;
  globalThis.matchMedia = () => ({ matches: true });
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

test("carousel clones only enough inert apps and respects reduced motion", () => {
  const root = makeCarouselRoot();
  initCarousel(root);

  assert.equal(root.rail.children.length, 9);
  assert.equal(root.rail.scrollWidth, root.rail.clientWidth * 3);
  for (const clone of root.rail.children.slice(4)) {
    assert.equal(clone.attributes.get("aria-hidden"), "true");
    assert.equal(clone.attributes.get("tabindex"), "-1");
  }
  assert.equal(root.view.animationFrames, 0);
});

test("carousel accepts keyboard activation when no pointer gesture was recorded", () => {
  const carousel = makeCarouselRoot();
  const detail = makeDetailRoot();
  const root = {
    defaultView: carousel.defaultView,
    querySelector: (selector) => selector === "#app-rail" ? carousel.rail : detail.querySelector(selector),
    querySelectorAll: detail.querySelectorAll
  };
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    initCarousel(root);
    carousel.listeners.get("click")({ target: carousel.rail.children[3], detail: 1 });
    assert.equal(detail.fields.get("[data-app-name]").textContent, "Bascule");
  } finally {
    globalThis.requestAnimationFrame = previousAnimationFrame;
  }
});

test("carousel selects the focused app with Enter", () => {
  const carousel = makeCarouselRoot();
  const detail = makeDetailRoot();
  const root = {
    defaultView: carousel.defaultView,
    querySelector: (selector) => selector === "#app-rail" ? carousel.rail : detail.querySelector(selector),
    querySelectorAll: detail.querySelectorAll
  };
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    initCarousel(root);
    const keydown = carousel.listeners.get("keydown");
    assert.equal(typeof keydown, "function");
    keydown({
      key: "Enter",
      preventDefault() {},
      target: carousel.rail.children[3]
    });
    assert.equal(detail.fields.get("[data-app-name]").textContent, "Bascule");
  } finally {
    globalThis.requestAnimationFrame = previousAnimationFrame;
  }
});

test("carousel pauses on mouse hover and resumes after the delay", () => {
  const root = makeCarouselRoot(false);
  initCarousel(root);

  root.view.animationFrameCallbacks.shift()(0);
  root.view.animationFrameCallbacks.shift()(1000);
  assert.equal(root.rail.scrollLeft, 30);

  const mouseenter = root.listeners.get("mouseenter");
  const mouseleave = root.listeners.get("mouseleave");
  assert.equal(typeof mouseenter, "function");
  assert.equal(typeof mouseleave, "function");
  mouseenter();
  root.view.animationFrameCallbacks.shift()(2000);
  assert.equal(root.rail.scrollLeft, 30);

  mouseleave();
  root.view.timeoutCallbacks.at(-1)();
  root.view.animationFrameCallbacks.shift()(3000);
  assert.equal(root.rail.scrollLeft, 60);
});

test("pointer capture recovers after an outside release without bypassing other pause reasons", () => {
  const root = makeCarouselRoot(false);
  initCarousel(root);

  root.view.animationFrameCallbacks.shift()(0);
  root.view.animationFrameCallbacks.shift()(1000);
  assert.equal(root.rail.scrollLeft, 30);

  root.listeners.get("mouseenter")();
  root.listeners.get("pointerdown")({ clientX: 20, clientY: 20, pointerId: 7 });
  assert.equal(root.rail.hasPointerCapture(7), true);

  root.listeners.get("mouseleave")();
  root.view.timeoutCallbacks.at(-1)();
  root.view.animationFrameCallbacks.shift()(2000);
  assert.equal(root.rail.scrollLeft, 30, "pointer pause remains after hover ends");

  root.listeners.get("pointerup")({ clientX: 120, clientY: 20, pointerId: 7 });
  assert.equal(root.rail.hasPointerCapture(7), false);
  root.view.timeoutCallbacks.at(-1)();
  root.view.animationFrameCallbacks.shift()(3000);
  assert.equal(root.rail.scrollLeft, 60, "outside release resumes after the delay");
});

test("per-app tag and status text inherit the readable foreground color", () => {
  assert.match(
    css,
    /\.app-detail \[data-app-tag\],\s*\.app-detail \[data-app-status\]\s*\{\s*color:\s*inherit;/
  );
});
