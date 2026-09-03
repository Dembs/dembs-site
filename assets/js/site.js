import { APPS, resolveCampaign } from "./content.js";

export function revealDelay(index) {
  return Math.min(Math.max(index, 0), 4) * 70;
}

export function getMascotGaze(face, pointer) {
  const centreX = face.left + face.width / 2;
  const centreY = face.top + face.height / 2;
  const normalise = (value, radius, limit) => Math.max(-limit, Math.min(limit, Math.round((value / radius) * limit)));
  return {
    x: normalise(pointer.clientX - centreX, face.width / 2, 8),
    y: normalise(pointer.clientY - centreY, face.height / 2, 8)
  };
}

export function initMotionMascot(root = document) {
  const card = root.querySelector("[data-motion-mascot]");
  const face = card?.querySelector("[data-motion-face]");
  if (!card || !face) return;

  const view = root.defaultView ?? window;
  if (view.matchMedia("(prefers-reduced-motion: reduce)").matches || view.matchMedia("(pointer: coarse)").matches) return;

  const setGaze = ({ x, y }) => {
    card.style.setProperty("--gaze-x", `${x}px`);
    card.style.setProperty("--gaze-y", `${y}px`);
  };
  card.addEventListener("pointermove", (event) => setGaze(getMascotGaze(face.getBoundingClientRect(), event)));
  card.addEventListener("pointerleave", () => setGaze({ x: 0, y: 0 }));
}

export function initReveals(root = document) {
  const items = [...root.querySelectorAll("[data-reveal]")];
  if (!items.length) return;

  const view = root.defaultView ?? window;
  const motionPreference = view.matchMedia("(prefers-reduced-motion: reduce)");
  const Observer = view.IntersectionObserver ?? window.IntersectionObserver;
  let observer;
  let safetyTimer;
  let delivered = false;

  const showImmediately = () => {
    view.clearTimeout?.(safetyTimer);
    observer?.disconnect();
    observer = undefined;
    root.documentElement.classList.remove("reveal-enabled");
    // Snap rather than transition: a paused compositor (hidden tab) would
    // otherwise leave the content frozen part-way through the fade.
    root.documentElement.classList.add("reveal-disabled");
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
    delivered = false;
    observer = new Observer((entries) => {
      delivered = true;
      for (const entry of entries) {
        // Delivery can be deferred, so an entry may arrive once its block has
        // already scrolled past the top. It will never intersect again, so
        // reveal it rather than leaving it stuck at opacity 0.
        const scrolledPast = entry.boundingClientRect?.bottom <= 0;
        if (!entry.isIntersecting && !scrolledPast) continue;
        const revealTargets = [entry.target, ...(entry.target.querySelectorAll?.("[data-reveal]") ?? [])];
        for (const target of revealTargets) {
          target.classList.add("is-visible");
          observer.unobserve(target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -8%" });

    // Whatever is already on screen is revealed without waiting for a callback,
    // so the first screenful is readable even when delivery is deferred.
    const fold = view.innerHeight ?? 0;
    items.forEach((item) => {
      const top = item.getBoundingClientRect?.().top;
      if (typeof top === "number" && top < fold) item.classList.add("is-visible");
    });
    items.filter((item) => !item.classList.contains("is-visible")).forEach((item) => observer.observe(item));

    // A working observer always delivers an initial callback. If none arrives,
    // the effect is not running (a backgrounded tab defers delivery, for one),
    // and content must never stay invisible because of a decoration.
    view.clearTimeout?.(safetyTimer);
    safetyTimer = view.setTimeout?.(() => { if (!delivered) showImmediately(); }, 2500);
  };
  const applyMotionPreference = ({ matches } = motionPreference) => matches ? showImmediately() : enableReveals();

  if (motionPreference.addEventListener) motionPreference.addEventListener("change", applyMotionPreference);
  else motionPreference.addListener?.(applyMotionPreference);
  applyMotionPreference();
}

export function selectApp(id, root = document, { animate = true } = {}) {
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
  detail.style.setProperty("--app-badge-background", app.badgeBackground);
  detail.style.setProperty("--app-badge-foreground", app.badgeForeground);

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
  // The entrance animation fills both ways, so it must only ever run in response
  // to a tap. On load it could be throttled and hold the card at opacity 0.
  if (!animate) return;
  const view = root.defaultView ?? (typeof window === "undefined" ? undefined : window);
  const paint = view?.requestAnimationFrame?.bind(view);
  if (paint) paint(() => detail.classList.add("is-entering"));
  else detail.classList.add("is-entering");
}

// The four apps all fit on one mobile screen, so the picker is a static grid:
// no autoplay, no clones, and every tap target stays where the thumb left it.
export function initAppPicker(root = document) {
  const grid = root.querySelector("#app-grid");
  if (!grid) return;
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-app-id]");
    if (button) selectApp(button.dataset.appId, root);
  });
  // The markup ships one tile pre-selected; render its colours straight away so
  // the card does not sit neutral until the first tap.
  const current = grid.querySelector('[data-app-id][aria-current="true"]');
  if (current) selectApp(current.dataset.appId, root, { animate: false });
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

// The fixed bar sells the cadrage call by default and switches to the audit while
// the audit card is on screen, so the visible offer and the button always agree.
export function setActionBarVariant(bar, variant) {
  if (!bar) return;
  bar.dataset.variant = variant;
  bar.querySelectorAll("[data-variant-cadrage]").forEach((node) => { node.hidden = variant !== "cadrage"; });
  bar.querySelectorAll("[data-variant-audit]").forEach((node) => { node.hidden = variant !== "audit"; });
}

export function initActionBar(root = document) {
  const bar = root.querySelector("[data-action-bar]");
  const targets = [...root.querySelectorAll('[data-action="audit"]')];
  if (!bar || !targets.length) return;
  const view = root.defaultView ?? window;
  const Observer = view.IntersectionObserver ?? window.IntersectionObserver;
  if (!Observer) return;
  const visible = new Set();
  const observer = new Observer((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    setActionBarVariant(bar, visible.size ? "audit" : "cadrage");
  }, { threshold: 0.35 });
  targets.forEach((target) => observer.observe(target));
}

if (typeof document !== "undefined") {
  initMenu();
  initActionBar();
  renderFocusCampaign();
  initAppPicker();
  initReveals();
  initMotionMascot();
}
