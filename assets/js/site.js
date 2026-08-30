import { APPS, resolveCampaign } from "./content.js";

export function isTapGesture(start, end, threshold = 8) {
  return Math.abs(end.x - start.x) <= threshold && Math.abs(end.y - start.y) <= threshold;
}

export function wrapLoopPosition(position, loopWidth) {
  if (loopWidth <= 0) return 0;
  return ((position % loopWidth) + loopWidth) % loopWidth;
}

export function revealDelay(index) {
  return Math.min(Math.max(index, 0), 4) * 70;
}

export function initReveals(root = document) {
  const items = [...root.querySelectorAll("[data-reveal]")];
  if (!items.length) return;

  const view = root.defaultView ?? window;
  const motionPreference = view.matchMedia("(prefers-reduced-motion: reduce)");
  const Observer = view.IntersectionObserver ?? window.IntersectionObserver;
  let observer;

  const showImmediately = () => {
    observer?.disconnect();
    observer = undefined;
    root.documentElement.classList.remove("reveal-enabled");
    items.forEach((item) => item.classList.add("is-visible"));
  };
  const enableReveals = () => {
    if (!Observer) {
      showImmediately();
      return;
    }
    root.documentElement.classList.add("reveal-enabled");
    items.forEach((item) => item.style.setProperty("--reveal-delay", `${revealDelay(Number(item.dataset.revealIndex || 0))}ms`));
    observer?.disconnect();
    observer = new Observer((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
    items.filter((item) => !item.classList.contains("is-visible")).forEach((item) => observer.observe(item));
  };
  const applyMotionPreference = ({ matches } = motionPreference) => matches ? showImmediately() : enableReveals();

  if (motionPreference.addEventListener) motionPreference.addEventListener("change", applyMotionPreference);
  else motionPreference.addListener?.(applyMotionPreference);
  applyMotionPreference();
}

export function selectApp(id, root = document) {
  const app = APPS.find((item) => item.id === id);
  const detail = root.querySelector("#app-detail");
  if (!app || !detail) return;

  const icon = detail.querySelector("[data-app-icon]");
  icon.src = app.icon;
  icon.classList.toggle("pixel", app.pixel);
  detail.querySelector("[data-app-name]").textContent = app.name;
  detail.querySelector("[data-app-tag]").textContent = app.tag;
  detail.querySelector("[data-app-description]").textContent = app.description;
  detail.style.setProperty("--app-background", app.background);
  detail.style.setProperty("--app-foreground", app.foreground);

  const stores = detail.querySelector("[data-app-stores]");
  const status = detail.querySelector("[data-app-status]");
  const published = app.status === "published";
  stores.hidden = !published;
  status.hidden = published;
  status.textContent = app.statusLabel;
  if (published) {
    detail.querySelector("[data-app-store]").href = app.appStore;
    detail.querySelector("[data-play-store]").href = app.playStore;
  }
  root.querySelectorAll("[data-app-id]").forEach((button) => {
    button.setAttribute("aria-current", String(button.dataset.appId === id));
  });
  detail.classList.remove("is-entering");
  requestAnimationFrame(() => detail.classList.add("is-entering"));
}

export function initCarousel(root = document) {
  const rail = root.querySelector("#app-rail");
  if (!rail) return;

  const view = root.defaultView ?? window;
  const toggle = root.querySelector("[data-carousel-toggle]");
  const originals = [...rail.children];
  const originalCount = originals.length;
  if (!originalCount) return;

  let loopWidth = 0;
  let position = 0;
  let previousTime;
  let resizeTimer;
  const resumeTimers = new Map();
  const pauseReasons = new Set();
  let pointerStart;
  let pointerEnd;

  const rebuildRail = () => {
    const previousLoopWidth = loopWidth;
    const progress = previousLoopWidth > 0
      ? wrapLoopPosition(rail.scrollLeft, previousLoopWidth) / previousLoopWidth
      : 0;

    [...rail.children].slice(originalCount).forEach((clone) => clone.remove());
    let cloneIndex = 0;
    const targetWidth = rail.clientWidth * 3;
    while (rail.scrollWidth < targetWidth || rail.children.length === originalCount) {
      const clone = originals[cloneIndex % originalCount].cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("tabindex", "-1");
      rail.append(clone);
      cloneIndex += 1;
    }

    const first = rail.children[0];
    const firstClone = rail.children[originalCount];
    loopWidth = first && firstClone ? firstClone.offsetLeft - first.offsetLeft : 0;
    position = previousLoopWidth > 0
      ? progress * loopWidth
      : wrapLoopPosition(rail.scrollLeft, loopWidth);
    rail.scrollLeft = position;
  };
  const scheduleRailRebuild = () => {
    if (resizeTimer !== undefined) view.clearTimeout(resizeTimer);
    resizeTimer = view.setTimeout(() => {
      resizeTimer = undefined;
      rebuildRail();
    }, 120);
  };
  rebuildRail();
  view.addEventListener?.("resize", scheduleRailRebuild);

  const clearResumeTimer = (reason) => {
    const timer = resumeTimers.get(reason);
    if (timer !== undefined) view.clearTimeout(timer);
    resumeTimers.delete(reason);
  };
  const pause = (reason) => {
    clearResumeTimer(reason);
    pauseReasons.add(reason);
  };
  const resumeAfter = (reason) => {
    clearResumeTimer(reason);
    const timer = view.setTimeout(() => {
      pauseReasons.delete(reason);
      resumeTimers.delete(reason);
    }, 2000);
    resumeTimers.set(reason, timer);
  };
  const pauseBriefly = (reason) => {
    pause(reason);
    resumeAfter(reason);
  };
  const updateToggle = () => {
    if (!toggle) return;
    const persistentlyPaused = pauseReasons.has("manual") || pauseReasons.has("motion");
    toggle.hidden = false;
    toggle.textContent = persistentlyPaused ? "Lecture" : "Pause";
    toggle.setAttribute("aria-pressed", String(persistentlyPaused));
  };

  const motionPreference = view.matchMedia("(prefers-reduced-motion: reduce)");
  if (motionPreference.matches) pauseReasons.add("motion");
  const applyMotionPreference = ({ matches }) => {
    clearResumeTimer("motion");
    if (matches) pauseReasons.add("motion");
    else pauseReasons.delete("motion");
    updateToggle();
  };
  if (motionPreference.addEventListener) motionPreference.addEventListener("change", applyMotionPreference);
  else motionPreference.addListener?.(applyMotionPreference);
  toggle?.addEventListener("click", () => {
    const persistentlyPaused = pauseReasons.has("manual") || pauseReasons.has("motion");
    clearResumeTimer("manual");
    clearResumeTimer("motion");
    pauseReasons.delete("motion");
    if (persistentlyPaused) pauseReasons.delete("manual");
    else pauseReasons.add("manual");
    updateToggle();
  });
  updateToggle();

  rail.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    pointerEnd = pointerStart;
    rail.setPointerCapture?.(event.pointerId);
    pause("pointer");
  });
  rail.addEventListener("pointermove", (event) => {
    if (!pointerStart) return;
    pointerEnd = { x: event.clientX, y: event.clientY };
  });
  rail.addEventListener("pointerup", (event) => {
    pointerEnd = { x: event.clientX, y: event.clientY };
    position = wrapLoopPosition(rail.scrollLeft, loopWidth);
    if (rail.hasPointerCapture?.(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    resumeAfter("pointer");
  });
  rail.addEventListener("pointercancel", (event) => {
    pointerStart = undefined;
    pointerEnd = undefined;
    if (rail.hasPointerCapture?.(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    resumeAfter("pointer");
  });
  rail.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (touch && !pointerStart) {
      pointerStart = { x: touch.clientX, y: touch.clientY };
      pointerEnd = pointerStart;
    }
    pause("touch");
  }, { passive: true });
  rail.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (touch) pointerEnd = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  const finishTouch = (event) => {
    position = wrapLoopPosition(rail.scrollLeft, loopWidth);
    if (event.type === "touchcancel") {
      pointerStart = undefined;
      pointerEnd = undefined;
    }
    resumeAfter("touch");
  };
  rail.addEventListener("touchend", finishTouch, { passive: true });
  rail.addEventListener("touchcancel", finishTouch, { passive: true });
  rail.addEventListener("wheel", () => {
    position = wrapLoopPosition(rail.scrollLeft, loopWidth);
    pauseBriefly("wheel");
  }, { passive: true });
  rail.addEventListener("pointerenter", () => pause("hover"));
  rail.addEventListener("pointerleave", () => resumeAfter("hover"));
  rail.addEventListener("mouseenter", () => pause("hover"));
  rail.addEventListener("mouseleave", () => resumeAfter("hover"));
  rail.addEventListener("focusin", () => pause("focus"));
  rail.addEventListener("focusout", (event) => {
    if (!rail.contains(event.relatedTarget)) resumeAfter("focus");
  });
  rail.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const button = event.target.closest("[data-app-id]");
    if (!button || button.getAttribute("aria-hidden") === "true") return;
    event.preventDefault();
    selectApp(button.dataset.appId, root);
  });
  rail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-app-id]");
    if (!button || button.getAttribute("aria-hidden") === "true") return;
    const tap = !pointerStart || (pointerEnd && isTapGesture(pointerStart, pointerEnd));
    pointerStart = undefined;
    pointerEnd = undefined;
    if (tap) selectApp(button.dataset.appId, root);
  });

  const advance = (time) => {
    if (previousTime !== undefined) {
      const elapsedSeconds = (time - previousTime) / 1000;
      if (pauseReasons.size) {
        position = wrapLoopPosition(rail.scrollLeft, loopWidth);
      } else {
        position = wrapLoopPosition(position + 30 * elapsedSeconds, loopWidth);
        rail.scrollLeft = position;
      }
    }
    previousTime = time;
    view.requestAnimationFrame(advance);
  };
  view.requestAnimationFrame(advance);
}

export function initMenu(root = document) {
  const button = root.querySelector("[data-menu-toggle]");
  const panel = root.querySelector("#site-menu");
  const scrim = root.querySelector("[data-menu-close]");
  if (!button || !panel || !scrim) return;

  const close = () => {
    panel.hidden = true;
    scrim.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Ouvrir le menu");
    root.body.classList.remove("menu-open");
    button.focus();
  };
  const open = () => {
    panel.hidden = false;
    scrim.hidden = false;
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", "Fermer le menu");
    root.body.classList.add("menu-open");
    panel.querySelector("a")?.focus();
  };

  button.addEventListener("click", () => panel.hidden ? open() : close());
  scrim.addEventListener("click", close);
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) close();
    if (event.key !== "Tab" || panel.hidden) return;
    const links = [...panel.querySelectorAll("a[href]")];
    const first = links[0];
    const last = links.at(-1);
    if (event.shiftKey && root.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && root.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

export function renderFocusCampaign(root = document, search = location.search) {
  const container = root.querySelector("#campaign");
  if (!container) return;
  const campaign = resolveCampaign(new URLSearchParams(search).get("focus"));
  if (!campaign) {
    container.hidden = true;
    return;
  }
  container.querySelector("[data-campaign-eyebrow]").textContent = campaign.eyebrow;
  container.querySelector("[data-campaign-title]").textContent = campaign.title;
  container.querySelector("[data-campaign-description]").textContent = campaign.description;
  const link = container.querySelector("[data-campaign-link]");
  link.textContent = campaign.cta;
  link.href = campaign.url;
  container.querySelector("[data-campaign-affiliate]").hidden = !campaign.affiliate;
  container.hidden = false;
}

if (typeof document !== "undefined") {
  initMenu();
  renderFocusCampaign();
  initCarousel();
  initReveals();
}
