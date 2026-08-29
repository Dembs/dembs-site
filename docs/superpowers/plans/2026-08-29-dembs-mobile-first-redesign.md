# Dembs Mobile-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild dembs.fr as a fast, accessible mobile-first showcase that presents Dembs as an app developer, guides TikTok visitors to the right help, and supports configurable campaign highlights.

**Architecture:** Keep the site static and dependency-free at runtime. Move presentation and behavior out of the current monolithic `index.html`, keep essential content in semantic HTML, store app and campaign data in an ES module, and progressively enhance navigation, campaign selection, the app carousel, and scroll reveals.

**Tech Stack:** HTML5, CSS custom properties, native ES modules, DOM APIs, IntersectionObserver, Node.js 22 built-in test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-29-dembs-mobile-first-redesign-design.md`

## Global Constraints

- No framework, runtime dependency, build step, CMS, payment system, or analytics dashboard.
- Keep the validated hero copy exactly: “Développeur d’applications”, “Je crée des apps. Et je les mène jusqu’aux stores.”, “Je partage le processus et j’accompagne ceux qui veulent lancer la leur.”
- Keep the four existing apps, their current icons, descriptions, statuses, and verified store URLs.
- Keep the current guide, Cal.com, TikTok, Instagram, YouTube, legal-page, canonical-domain, and CNAME destinations.
- Use `#F4F7FB` cloud, `#10233F` ink, `#2864DC` cobalt, `#DCE7FF` mist, and `#53647A` slate as the core palette.
- Use Bricolage Grotesque for display, IBM Plex Sans for body, and IBM Plex Mono for utility labels, with system fallbacks.
- Reveal motion is opacity `0 → 1`, vertical translation `16px → 0`, `420ms`, with `70ms` card staggering and one execution per element.
- App-detail reveal is approximately `280ms`, with the second store destination delayed by `70ms`.
- All non-essential motion and carousel autoplay stop under `prefers-reduced-motion: reduce`.
- Core content must remain visible and usable when JavaScript is unavailable.
- Touch targets are at least `44px`; keyboard focus is visible; the menu closes with Escape and restores focus.
- Verify widths `360px`, `390px`, and `430px`, then tablet and desktop.
- Affiliate recommendations stay hidden until real approved content and a destination URL exist.
- The montage-video offer remains a secondary “En préparation” item without a dead CTA.

## File Map

- Modify `index.html`: semantic homepage, static fallback content, metadata, menu, campaign slot, app controls, service/resource sections, footer.
- Create `assets/css/site.css`: tokens, typography, layout, responsive rules, component states, motion, reduced-motion behavior.
- Create `assets/js/content.js`: immutable app and campaign records plus campaign validation/resolution.
- Create `assets/js/site.js`: menu, focus campaign, app carousel, store reveal, and scroll-reveal initialization.
- Create `tests/content.test.mjs`: unit tests for content records and focus-campaign safety.
- Create `tests/markup.test.mjs`: contract checks for essential HTML, accessibility attributes, and external destinations.
- Create `tests/behavior.test.mjs`: unit tests for gesture, loop-position, and reveal-delay helpers.
- Create `package.json`: dependency-free Node test command.
- Modify `README.md`: new file structure, local verification, and exact campaign-editing instructions.
- Keep `mentions-legales.html`, `CNAME`, `robots.txt`, and `sitemap.xml` functionally unchanged.

---

### Task 1: Content model and dependency-free test harness

**Files:**
- Create: `package.json`
- Create: `assets/js/content.js`
- Create: `tests/content.test.mjs`

**Interfaces:**
- Produces: `APPS: readonly AppRecord[]`, `CAMPAIGNS: Readonly<Record<string, CampaignRecord>>`, and `resolveCampaign(focus: string | null): CampaignRecord | null`.
- `AppRecord` fields: `id`, `name`, `tag`, `description`, `icon`, `pixel`, `background`, `foreground`, `badgeBackground`, `badgeForeground`, `status`, `statusLabel`, `appStore`, `playStore`.
- `CampaignRecord` fields: `eyebrow`, `title`, `description`, `cta`, `url`, `affiliate`.

- [ ] **Step 1: Create the package script and failing content tests**

Create `package.json`:

```json
{
  "name": "dembs-site",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

Create `tests/content.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { APPS, CAMPAIGNS, resolveCampaign } from "../assets/js/content.js";

test("the four current apps keep stable ids and valid destinations", () => {
  assert.deepEqual(APPS.map((app) => app.id), ["streetpark", "civi", "last-rep", "bascule"]);
  assert.equal(APPS.filter((app) => app.status === "published").length, 2);
  for (const app of APPS.filter((item) => item.status === "published")) {
    assert.equal(new URL(app.appStore).protocol, "https:");
    assert.equal(new URL(app.playStore).protocol, "https:");
  }
});

test("resolveCampaign returns only complete allow-listed campaigns", () => {
  assert.equal(resolveCampaign(null), null);
  assert.equal(resolveCampaign("unknown"), null);
  assert.equal(resolveCampaign("<img src=x onerror=alert(1)>"), null);
  assert.deepEqual(resolveCampaign("guide-stores"), CAMPAIGNS["guide-stores"]);
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `assets/js/content.js`.

- [ ] **Step 3: Implement the immutable app and campaign records**

Create `assets/js/content.js` with these records. Use `null` for unavailable store URLs and the literal statuses `published`, `beta`, and `development`:

```js
export const APPS = Object.freeze([
  {
    id: "streetpark", name: "StreetPark", tag: "street workout",
    description: "La carte des spots de street workout, notés par ceux qui s’y entraînent.",
    icon: "assets/icons/streetpark.png", pixel: false,
    background: "#B6B3FF", foreground: "#17142B",
    badgeBackground: "#17142B", badgeForeground: "#EAFF54",
    status: "published", statusLabel: "Disponible",
    appStore: "https://apps.apple.com/fr/app/streetpark-street-workout/id6760240703",
    playStore: "https://play.google.com/store/apps/details?id=com.streetpark.app"
  },
  {
    id: "civi", name: "Civi", tag: "examen civique 2026",
    description: "L’examen civique révisé sans panique, un quiz par jour jusqu’au jour J.",
    icon: "assets/icons/civi.png", pixel: false,
    background: "#1B2A4A", foreground: "#F2F0EA",
    badgeBackground: "#C5A55A", badgeForeground: "#1B2A4A",
    status: "published", statusLabel: "Disponible",
    appStore: "https://apps.apple.com/fr/app/civi-examen-civique-2026/id6772965126",
    playStore: "https://play.google.com/store/apps/details?id=fr.civiapp.app"
  },
  {
    id: "last-rep", name: "Last Rep", tag: "jeu d’arcade pixel",
    description: "Annonce ton contrat de tractions, puis sécurise ou risque tout.",
    icon: "assets/icons/last-rep.png", pixel: true,
    background: "#0B0F14", foreground: "#F2F0EA",
    badgeBackground: "#F5B82E", badgeForeground: "#0B0F14",
    status: "beta", statusLabel: "Bêta, bientôt sur les stores",
    appStore: null, playStore: null
  },
  {
    id: "bascule", name: "Bascule", tag: "jeu narratif",
    description: "Vis ta première année à ton compte en France, une décision au swipe.",
    icon: "assets/icons/bascule.png", pixel: true,
    background: "#1A1524", foreground: "#F2F0EA",
    badgeBackground: "#E8A24B", badgeForeground: "#1A1524",
    status: "development", statusLabel: "En développement",
    appStore: null, playStore: null
  }
].map(Object.freeze));

export const CAMPAIGNS = Object.freeze({
  "guide-stores": Object.freeze({
    eyebrow: "Vu dans ma dernière vidéo",
    title: "Publier sans se faire recaler",
    description: "Les erreurs qui coûtent des semaines sur l’App Store et Google Play.",
    cta: "Lire le guide gratuit",
    url: "https://ressources.dembs.fr/guide",
    affiliate: false
  })
});

function isCompleteCampaign(value) {
  if (!value || typeof value !== "object") return false;
  const textFields = ["eyebrow", "title", "description", "cta"];
  if (!textFields.every((key) => typeof value[key] === "string" && value[key].trim())) return false;
  try {
    return new URL(value.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveCampaign(focus) {
  if (typeof focus !== "string" || !Object.hasOwn(CAMPAIGNS, focus)) return null;
  const campaign = CAMPAIGNS[focus];
  return isCompleteCampaign(campaign) ? campaign : null;
}
```

- [ ] **Step 4: Run the content tests**

Run: `npm test`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the content contract**

```bash
git add package.json assets/js/content.js tests/content.test.mjs
git commit -m "test: define homepage content contract"
```

### Task 2: Semantic mobile-first page and Source claire visual system

**Files:**
- Modify: `index.html`
- Create: `assets/css/site.css`
- Create: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: stable app ids from Task 1 as `data-app-id` values.
- Produces: `#site-menu`, `#campaign`, `#journeys`, `#apps`, `#services`, `#resources`, `#recommendations`, `#app-detail`, and `[data-reveal]` hooks used by Tasks 3–5.

- [ ] **Step 1: Add failing semantic and destination checks**

Create `tests/markup.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("homepage contains the validated positioning and section contracts", () => {
  assert.match(html, /Développeur d’applications/);
  assert.match(html, /Je crée des apps\. Et je les mène jusqu’aux stores\./);
  assert.match(html, /Je partage le processus et j’accompagne ceux qui veulent lancer la leur\./);
  for (const id of ["site-menu", "campaign", "journeys", "apps", "app-detail", "services", "resources", "recommendations"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("homepage preserves required external destinations", () => {
  for (const destination of [
    "https://ressources.dembs.fr/guide",
    "https://cal.com/dembs/cadrage-app",
    "https://www.tiktok.com/@dembstech",
    "https://www.instagram.com/iam_dembs",
    "https://www.youtube.com/@dembstv4129"
  ]) assert.ok(html.includes(destination), destination);
});

test("interactive controls expose accessible state", () => {
  assert.match(html, /aria-controls=["']site-menu["']/);
  assert.match(html, /aria-expanded=["']false["']/);
  assert.match(html, /aria-live=["']polite["']/);
  assert.match(html, /href=["']mentions-legales\.html["']/);
});
```

- [ ] **Step 2: Run only the markup contract and confirm it fails**

Run: `node --test tests/markup.test.mjs`

Expected: FAIL because the validated hero and new section ids are absent.

- [ ] **Step 3: Replace `index.html` with the semantic page**

Keep the existing metadata destinations, icon links, app URLs, guide URL, Cal.com URL, and social URLs. Remove all inline CSS and the current inline script. Link the new files using:

```html
<link rel="stylesheet" href="assets/css/site.css">
<script type="module" src="assets/js/site.js"></script>
```

Build the body with this exact semantic contract and real launch copy. Preserve the existing SVG logo and platform icons where they improve recognition:

```html
<header class="site-header">
  <a class="brand" href="/" aria-label="Dembs, accueil">dembs.</a>
  <button class="menu-toggle" type="button" data-menu-toggle aria-controls="site-menu" aria-expanded="false" aria-label="Ouvrir le menu"><span aria-hidden="true">☰</span></button>
</header>
<div class="menu-scrim" data-menu-close hidden></div>
<nav id="site-menu" class="menu-panel" aria-label="Navigation principale" hidden>
  <a href="#apps">Applications</a><a href="#services">Accompagnements</a><a href="#resources">Ressources</a><a href="#socials">Réseaux</a>
</nav>
<main>
  <section class="hero"><p class="eyebrow">Développeur d’applications</p><h1>Je crée des apps. Et je les mène jusqu’aux stores.</h1><p>Je partage le processus et j’accompagne ceux qui veulent lancer la leur.</p><div class="proofs"><span>4 apps créées</span><span>2 sur les stores</span><span>Build in public</span></div><a class="button primary" href="#journeys">Trouver l’aide qu’il me faut</a><a class="text-link" href="#apps">Voir mes applications</a></section>
  <aside id="campaign" class="campaign" hidden><p data-campaign-eyebrow></p><h2 data-campaign-title></h2><p data-campaign-description></p><p data-campaign-affiliate hidden>Lien affilié</p><a data-campaign-link target="_blank" rel="noopener"></a></aside>
  <section id="journeys"><p class="eyebrow">Ton point de départ</p><h2>Tu en es où ?</h2><div class="journey-grid"><a href="#services"><strong>J’ai une idée d’app</strong><span>Cadrer avant de construire</span></a><a href="#services"><strong>Je construis mais je bloque</strong><span>Débloquer un point précis</span></a><a href="https://ressources.dembs.fr/guide"><strong>Je veux passer les stores</strong><span>Éviter les refus et les semaines perdues</span></a></div></section>
  <section id="apps"><p class="eyebrow">La preuve par les produits</p><h2>Les apps</h2><p>Le code et les stores, je ne les connais pas qu’en théorie.</p><p class="developer-path">Formé au développement · Première app créée sans IA · 4 apps au compteur</p><div id="app-rail" class="app-rail"><button type="button" data-app-id="streetpark" aria-current="true"><img src="assets/icons/streetpark.png" alt="StreetPark" width="68" height="68"></button><button type="button" data-app-id="civi" aria-current="false"><img src="assets/icons/civi.png" alt="Civi" width="68" height="68"></button><button type="button" data-app-id="last-rep" aria-current="false"><img src="assets/icons/last-rep.png" alt="Last Rep" width="68" height="68"></button><button type="button" data-app-id="bascule" aria-current="false"><img src="assets/icons/bascule.png" alt="Bascule" width="68" height="68"></button></div><article id="app-detail" class="app-detail" aria-live="polite"><img data-app-icon src="assets/icons/streetpark.png" alt="" width="56" height="56"><h3 data-app-name>StreetPark</h3><p data-app-tag>street workout</p><p data-app-description>La carte des spots de street workout, notés par ceux qui s’y entraînent.</p><div data-app-stores><a data-app-store href="https://apps.apple.com/fr/app/streetpark-street-workout/id6760240703">App Store</a><a data-play-store href="https://play.google.com/store/apps/details?id=com.streetpark.app">Google Play</a></div><p data-app-status hidden></p></article></section>
  <section id="services"><p class="eyebrow">Accompagnements</p><h2>Un format pour avancer</h2><article><p>45 minutes</p><h3>Appel de cadrage</h3><p>Clarifier l’idée, le périmètre et la prochaine étape.</p><a href="https://cal.com/dembs/cadrage-app">Réserver un créneau</a></article><article><p>Accompagnement</p><h3>De l’idée jusqu’aux stores</h3><p>Un suivi personnalisé pour construire et publier ton application.</p><a href="https://cal.com/dembs/cadrage-app">Parler de mon projet</a></article><aside><h3>Montage vidéo accéléré par l’IA</h3><p>En préparation</p></aside></section>
  <section id="resources"><p class="eyebrow">Ressources gratuites</p><h2>Pour avancer seul</h2><article><p>Gratuit</p><h3>Publier sans se faire recaler</h3><p>Les erreurs qui coûtent des semaines sur l’App Store et Google Play.</p><a href="https://ressources.dembs.fr/guide">Lire le guide</a></article></section>
  <section id="recommendations" hidden><p class="eyebrow">Recommandations</p><h2>Les outils que j’utilise</h2><div data-recommendation-list></div></section>
</main>
<footer id="socials"><p>Je documente tout en public.</p><a href="https://www.tiktok.com/@dembstech">TikTok</a><a href="https://www.instagram.com/iam_dembs">Instagram</a><a href="https://www.youtube.com/@dembstv4129">YouTube</a><a href="mentions-legales.html">Mentions légales</a></footer>
```

The fallback `#app-detail` must show StreetPark’s real description and both real store links. Use real `<button>` elements for app selectors and retain explicit image `width` and `height` attributes.

- [ ] **Step 4: Create the complete Source claire CSS system**

Create `assets/css/site.css` with the palette and font variables:

```css
:root {
  --cloud: #f4f7fb;
  --ink: #10233f;
  --cobalt: #2864dc;
  --mist: #dce7ff;
  --slate: #53647a;
  --line: #d7e1ed;
  --white: #fff;
  --display: "Bricolage Grotesque", system-ui, sans-serif;
  --body: "IBM Plex Sans", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
  --page-pad: clamp(1rem, 5vw, 4rem);
  --content: 72rem;
}
```

Implement the approved light layout, 44px minimum controls, visible `:focus-visible`, a sticky header, restrained rounded cards, horizontal app rail, app-detail surface, two-column store destinations, and desktop layout at `min-width: 760px`. Do not hide `[data-reveal]` yet; Task 5 owns reveal states.

- [ ] **Step 5: Run markup and full tests**

Run: `npm test`

Expected: all 5 tests PASS.

- [ ] **Step 6: Serve and inspect the static baseline without JavaScript**

Run: `python -m http.server 8777`

Open `http://127.0.0.1:8777/` with JavaScript disabled. Expected: hero, three journeys, all four app controls, StreetPark fallback detail, services, guide, and footer remain readable; the hidden campaign and recommendation shells leave no blank gaps.

- [ ] **Step 7: Commit the semantic visual baseline**

```bash
git add index.html assets/css/site.css tests/markup.test.mjs
git commit -m "feat: rebuild mobile-first homepage"
```

### Task 3: Accessible menu and safe TikTok focus campaigns

**Files:**
- Create: `assets/js/site.js`
- Modify: `assets/css/site.css`
- Modify: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: `resolveCampaign(focus)` from Task 1 and the menu/campaign DOM hooks from Task 2.
- Produces: `initMenu(root: Document): void`, `renderFocusCampaign(root: Document, search: string): void`, and the initialized menu/campaign states.

- [ ] **Step 1: Extend markup tests for safe campaign slots**

Add assertions that `#campaign` contains elements with `[data-campaign-eyebrow]`, `[data-campaign-title]`, `[data-campaign-description]`, `[data-campaign-link]`, and `[data-campaign-affiliate]`, and that the last element begins hidden.

- [ ] **Step 2: Run the focused test and confirm missing-slot failures if needed**

Run: `node --test tests/markup.test.mjs`

Expected: FAIL until every campaign hook exists in `index.html`.

- [ ] **Step 3: Add exact campaign hooks to the HTML**

Use empty elements whose content will be assigned with `textContent`; never insert campaign content through `innerHTML`.

- [ ] **Step 4: Implement menu and campaign initialization**

Create `assets/js/site.js` beginning with:

```js
import { APPS, resolveCampaign } from "./content.js";

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
  panel.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
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
  if (!campaign) { container.hidden = true; return; }
  container.querySelector("[data-campaign-eyebrow]").textContent = campaign.eyebrow;
  container.querySelector("[data-campaign-title]").textContent = campaign.title;
  container.querySelector("[data-campaign-description]").textContent = campaign.description;
  const link = container.querySelector("[data-campaign-link]");
  link.textContent = campaign.cta;
  link.href = campaign.url;
  container.querySelector("[data-campaign-affiliate]").hidden = !campaign.affiliate;
  container.hidden = false;
}
```

Initialize browser behavior behind a Node-safe guard so the module remains unit-testable:

```js
if (typeof document !== "undefined") {
  initMenu();
  renderFocusCampaign();
}
```

Add menu-panel, scrim, body-lock, and open-state CSS matching the hooks above.

- [ ] **Step 5: Run tests and manually verify the two URL states**

Run: `npm test`

Open:

- `http://127.0.0.1:8777/` — campaign absent with no gap.
- `http://127.0.0.1:8777/?focus=guide-stores` — guide campaign visible immediately after the hero.
- `http://127.0.0.1:8777/?focus=unknown` — campaign absent with no console error.

For the menu, verify click, scrim click, Escape, Tab loop, focus restoration, body scroll lock, and link activation.

- [ ] **Step 6: Commit navigation and focus behavior**

```bash
git add index.html assets/css/site.css assets/js/site.js tests/markup.test.mjs
git commit -m "feat: add menu and contextual campaign"
```

### Task 4: App carousel and staggered store reveal

**Files:**
- Modify: `assets/js/site.js`
- Modify: `assets/css/site.css`
- Create: `tests/behavior.test.mjs`

**Interfaces:**
- Consumes: `APPS` from Task 1, `[data-app-id]`, `#app-rail`, and `#app-detail` from Task 2.
- Produces: `isTapGesture(start, end, threshold?): boolean`, `wrapLoopPosition(position, loopWidth): number`, `selectApp(id: string, root?: Document): void`, and `initCarousel(root?: Document): void`.

- [ ] **Step 1: Write failing pure behavior tests**

Create `tests/behavior.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { isTapGesture, wrapLoopPosition } from "../assets/js/site.js";

test("tap detection separates a touch from a drag", () => {
  assert.equal(isTapGesture({ x: 10, y: 10 }, { x: 16, y: 15 }), true);
  assert.equal(isTapGesture({ x: 10, y: 10 }, { x: 25, y: 10 }), false);
});

test("loop position remains inside one repeated app set", () => {
  assert.equal(wrapLoopPosition(410, 400), 10);
  assert.equal(wrapLoopPosition(-10, 400), 390);
  assert.equal(wrapLoopPosition(25, 0), 0);
});
```

- [ ] **Step 2: Run behavior tests and confirm export failures**

Run: `node --test tests/behavior.test.mjs`

Expected: FAIL because the helpers are not exported.

- [ ] **Step 3: Implement pure helpers**

Replace the existing import at the top of `tests/behavior.test.mjs` with:

```js
export function isTapGesture(start, end, threshold = 8) {
  return Math.abs(end.x - start.x) <= threshold && Math.abs(end.y - start.y) <= threshold;
}

export function wrapLoopPosition(position, loopWidth) {
  if (loopWidth <= 0) return 0;
  return ((position % loopWidth) + loopWidth) % loopWidth;
}
```

- [ ] **Step 4: Implement `selectApp` with explicit published and unpublished states**

Implement the state change without inserting HTML:

```js
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
```

- [ ] **Step 5: Implement looping and interaction**

Clone only enough inert app buttons to cover three viewport widths. Clones receive `aria-hidden="true"` and `tabindex="-1"`. Use this measurement rule rather than total `scrollWidth`:

```js
const first = rail.children[0];
const firstClone = rail.children[originalCount];
loopWidth = first && firstClone ? firstClone.offsetLeft - first.offsetLeft : 0;
```

Keep floating-point `position`, advance it by `30 * elapsedSeconds`, and assign `scroller.scrollLeft = wrapLoopPosition(position, loopWidth)`. Pause on pointer down, touch, wheel, hover, or focus, and resume two seconds after direct interaction. Record `{x, y}` on pointer down; on click call `selectApp(button.dataset.appId)` only when `isTapGesture(start, end)` is true. Under reduced motion, do not start the animation frame loop.

Replace the browser initialization guard with:

```js
if (typeof document !== "undefined") {
  initMenu();
  renderFocusCampaign();
  initCarousel();
}
```

- [ ] **Step 6: Add the selected, entry, and stagger CSS states**

Use:

```css
.app-detail.is-entering { animation: detail-in 280ms ease-out both; }
.app-detail.is-entering .store-link { animation: store-in 280ms ease-out both; }
.app-detail.is-entering .store-link:nth-child(2) { animation-delay: 70ms; }
@keyframes detail-in { from { opacity: 0; transform: translateY(10px); } }
@keyframes store-in { from { opacity: 0; transform: translateY(8px); } }
```

Keep destination labels readable and platform names explicit instead of displaying raw URLs or icon-only buttons.

- [ ] **Step 7: Run automated and interaction checks**

Run: `npm test`

Expected: all tests PASS.

At 360px and 430px, verify tap versus drag, infinite wrapping, temporary pause, keyboard selection, published links, unpublished status, and no accidental horizontal page overflow.

- [ ] **Step 8: Commit the carousel**

```bash
git add assets/js/site.js assets/css/site.css tests/behavior.test.mjs
git commit -m "feat: refine application carousel"
```

### Task 5: Progressive scroll reveals and reduced-motion behavior

**Files:**
- Modify: `assets/js/site.js`
- Modify: `assets/css/site.css`
- Modify: `tests/behavior.test.mjs`

**Interfaces:**
- Consumes: `[data-reveal]` groups from Task 2.
- Produces: `revealDelay(index: number): number` and `initReveals(root: Document): void`.

- [ ] **Step 1: Add the failing reveal-delay test**

Add:

```js
import { isTapGesture, revealDelay, wrapLoopPosition } from "../assets/js/site.js";

test("reveal staggering is capped to keep the page responsive", () => {
  assert.equal(revealDelay(0), 0);
  assert.equal(revealDelay(2), 140);
  assert.equal(revealDelay(9), 280);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests/behavior.test.mjs`

Expected: FAIL because `revealDelay` is not exported.

- [ ] **Step 3: Implement the capped delay and observer**

Add:

```js
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
```

- [ ] **Step 4: Add reveal and reduced-motion CSS**

```css
.reveal-enabled [data-reveal] {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 420ms ease-out var(--reveal-delay, 0ms), transform 420ms ease-out var(--reveal-delay, 0ms);
}
.reveal-enabled [data-reveal].is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
```

Replace the browser initialization guard from Task 3 with the complete order below so dynamically shown campaign content receives the correct initial state. Do not add `data-reveal` to the hero.

```js
if (typeof document !== "undefined") {
  initMenu();
  renderFocusCampaign();
  initCarousel();
  initReveals();
}
```

- [ ] **Step 5: Run tests and verify both motion preferences**

Run: `npm test`

Expected: all tests PASS.

With normal motion, scroll from top to bottom and verify one-time reveals with subtle group staggering. With reduced motion enabled, verify all content is immediately present, the app rail does not autoplay, and app/store changes do not visibly animate.

- [ ] **Step 6: Commit progressive motion**

```bash
git add assets/js/site.js assets/css/site.css tests/behavior.test.mjs
git commit -m "feat: add accessible scroll reveals"
```

### Task 6: Documentation, responsive audit, and release verification

**Files:**
- Modify: `README.md`
- Modify: `index.html` if audit fixes are necessary
- Modify: `assets/css/site.css` if audit fixes are necessary
- Modify: `assets/js/site.js` if audit fixes are necessary
- Modify: `tests/*.test.mjs` only when a discovered regression needs permanent coverage

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: documented campaign workflow and a verified release candidate.

- [ ] **Step 1: Update project documentation**

Document the new file map and retain the existing GitHub Pages, CNAME, DNS, and local-server instructions. Add this campaign procedure:

```md
## Mettre un contenu TikTok en avant

1. Ajouter une entrée complète dans `CAMPAIGNS` dans `assets/js/content.js`.
2. Tester `http://127.0.0.1:8777/?focus=<identifiant>`.
3. Placer `https://dembs.fr/?focus=<identifiant>` dans la bio.
4. Signaler `affiliate: true` pour tout lien affilié.
5. Supprimer ou désactiver l’entrée lorsque la campagne n’est plus utilisée.
```

Replace the obsolete README note saying the tools section is commented inside `index.html` with the new data/configuration behavior.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: all tests PASS with zero skipped or failing tests.

- [ ] **Step 3: Run static integrity checks**

Run:

```bash
git diff --check
rg -n "TO[D]O|TB[D]|href=\"#\"|console\.log|innerHTML" index.html assets README.md tests
```

Expected: `git diff --check` exits 0. The search returns no placeholder link, debug logging, unsafe campaign injection, or unfinished marker.

- [ ] **Step 4: Verify mobile and desktop layouts**

Serve with `python -m http.server 8777` and inspect at 360×800, 390×844, 430×932, 768×1024, and 1440×900.

At each width confirm: no page-level horizontal overflow; hero and primary action appear without scrolling on common phone heights; menu does not exceed the viewport; journey cards are legible; app rail alone scrolls horizontally; app details and store links fit; service/resource cards stack cleanly; footer links remain reachable.

- [ ] **Step 5: Verify keyboard, touch, resilience, and destinations**

Verify Tab order, visible focus, menu focus loop, Escape close, focus restoration, carousel buttons, touch drag, and 44px targets. Reload with JavaScript disabled and confirm core content. Open every real external destination in a separate tab and confirm the expected domain. Test no focus parameter, `guide-stores`, and an unknown focus value.

- [ ] **Step 6: Review final screenshots and remove one unnecessary visual accessory**

Capture one 390px mobile view and one 1440px desktop view. Compare against the “Source claire” direction and the spec. Remove any border, badge, shadow, or animation that does not improve hierarchy or comprehension. Re-run `npm test` after the change.

- [ ] **Step 7: Commit documentation and audit fixes**

```bash
git add README.md index.html assets tests package.json
git commit -m "docs: document and verify homepage redesign"
```

- [ ] **Step 8: Confirm the final worktree state**

Run: `git status --short`

Expected: no output. Do not push or deploy without a separate explicit instruction.
