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
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!items.length || reduced || !("IntersectionObserver" in window)) return;
  root.documentElement.classList.add("reveal-enabled");
  items.forEach((item) => item.style.setProperty("--reveal-delay", `${revealDelay(Number(item.dataset.revealIndex || 0))}ms`));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
  items.forEach((item) => observer.observe(item));
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
  const originals = [...rail.children];
  const originalCount = originals.length;
  if (!originalCount) return;

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
  const loopWidth = first && firstClone ? firstClone.offsetLeft - first.offsetLeft : 0;
  let position = wrapLoopPosition(rail.scrollLeft, loopWidth);
  let previousTime;
  let resumeTimer;
  const pauseReasons = new Set();
  let paused = false;
  let pointerStart;
  let pointerEnd;

  const clearResumeTimer = () => {
    if (resumeTimer !== undefined) view.clearTimeout(resumeTimer);
    resumeTimer = undefined;
  };
  const pause = (reason) => {
    clearResumeTimer();
    pauseReasons.add(reason);
    paused = true;
  };
  const resumeAfter = (reason) => {
    pauseReasons.delete(reason);
    clearResumeTimer();
    resumeTimer = view.setTimeout(() => {
      if (!pauseReasons.size) paused = false;
    }, 2000);
  };
  const pauseBriefly = (reason) => {
    pause(reason);
    resumeAfter(reason);
  };

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
  rail.addEventListener("touchend", () => {
    position = wrapLoopPosition(rail.scrollLeft, loopWidth);
    resumeAfter("touch");
  }, { passive: true });
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

  if (view.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const advance = (time) => {
    if (previousTime !== undefined) {
      const elapsedSeconds = (time - previousTime) / 1000;
      if (paused) {
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
    root.body.classList.remove("menu-open");
    button.focus();
  };
  const open = () => {
    panel.hidden = false;
    scrim.hidden = false;
    button.setAttribute("aria-expanded", "true");
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
