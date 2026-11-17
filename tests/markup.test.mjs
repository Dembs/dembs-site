import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const civiIcon = await readFile(new URL("../assets/icons/civi.png", import.meta.url));
const fontsCss = await readFile(new URL("../assets/css/fonts.css", import.meta.url), "utf8");
const pageRevealTagPattern = /(?:<aside\b(?=[^>]*\bid=["']campaign["'])|<section\b|<footer\b)[^>]*\sdata-reveal(?=\s|=|>)[^>]*>/g;

test("homepage contains the validated positioning and section contracts", () => {
  assert.doesNotMatch(html, /<section class="hero"[^>]*\bdata-reveal\b/);
  assert.match(html, /Développeur d’applications/);
  assert.match(html, /Je crée des apps\. Et je les mène jusqu’aux stores\./);
  assert.match(html, /Je partage le processus et j’accompagne ceux qui veulent lancer la leur\./);
  for (const id of ["site-menu", "motion-stack", "lab", "campaign", "journeys", "apps", "app-detail", "services", "resources", "recommendations"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("homepage reveal groups declare capped stagger indices", () => {
  const revealTags = [...html.matchAll(pageRevealTagPattern)].map(([tag]) => tag);
  const revealIndices = revealTags.map((tag) => Number(tag.match(/\bdata-reveal-index="(\d+)"/)?.[1]));
  assert.deepEqual(revealIndices, [0, 1, 2, 3, 4, 5, 6, 7]);
});

test("reveal group matching excludes stagger-index-only elements", () => {
  const fixture = '<section data-reveal-index="1"></section>';
  assert.equal([...fixture.matchAll(pageRevealTagPattern)].length, 0);
});

test("journey and service cards reset their reveal stagger within each group", () => {
  const journeyGroup = html.match(/<div class="journey-list">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const servicesSection = html.match(/<section id="services"[\s\S]*?<\/section>/)?.[0] ?? "";
  const serviceGroup = servicesSection.match(/<div class="card-grid">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const journeyIndices = [...journeyGroup.matchAll(/<a\b[^>]*\bdata-reveal-index="(\d+)"[^>]*>/g)].map((match) => Number(match[1]));
  const serviceIndices = [...serviceGroup.matchAll(/<(?:article|aside|a)\b[^>]*\bdata-reveal-index="(\d+)"[^>]*>/g)].map((match) => Number(match[1]));

  assert.deepEqual(journeyIndices, [0, 1, 2]);
  assert.deepEqual(serviceIndices, [0, 1]);
  assert.equal((journeyGroup.match(/\bdata-reveal(?=\s|=|>)/g) ?? []).length, 3);
  assert.equal((serviceGroup.match(/\bdata-reveal(?=\s|=|>)/g) ?? []).length, 2);
});

test("homepage preserves required external destinations", () => {
  for (const destination of [
    "https://klubizz.com/@dembs-lab",
    "https://ressources.dembs.fr/guide",
    "https://cal.com/dembs/cadrage-app",
    "https://www.tiktok.com/@dembstech",
    "https://www.instagram.com/iam_dembs",
    "https://www.youtube.com/@dembstv4129"
  ]) assert.ok(html.includes(destination), destination);
});

test("the video setup exposes every approved affiliate destination", () => {
  const recommendations = html.match(/<section id="recommendations"[\s\S]*?<\/section>/)?.[0] ?? "";
  const destinations = [
    "https://amzn.to/4A2Sdqw",
    "https://amzn.to/4xJ6QxE",
    "https://amzn.to/4ylg8j4",
    "https://amzn.to/4d0rtwO",
    "https://amzn.to/3UUNKWE",
    "https://amzn.to/4qT4QA4"
  ];

  assert.ok(recommendations, "recommendations section");
  assert.doesNotMatch(recommendations.match(/^<section\b[^>]*>/)?.[0] ?? "", /\bhidden\b/);
  assert.match(html, /<a href="#recommendations">Matériel<\/a>/);
  for (const destination of destinations) {
    assert.ok(recommendations.includes(`href="${destination}"`), destination);
  }
});

test("affiliate recommendations are transparent and safely qualified", () => {
  const recommendations = html.match(/<section id="recommendations"[\s\S]*?<\/section>/)?.[0] ?? "";
  const affiliateLinks = [...recommendations.matchAll(/<a\b[^>]*href="https:\/\/amzn\.to\/[^\"]+"[^>]*>/g)].map(([link]) => link);

  assert.equal(affiliateLinks.length, 6);
  for (const link of affiliateLinks) {
    assert.match(link, /\btarget="_blank"/);
    assert.match(link, /\brel="[^"]*\bsponsored\b[^"]*"/);
    assert.match(link, /\brel="[^"]*\bnoopener\b[^"]*"/);
  }
  assert.equal((recommendations.match(/Lien affilié/g) ?? []).length, 6);
  assert.doesNotMatch(recommendations, /Lien rémunéré par Amazon/);
  assert.match(recommendations, /En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises\./);
  assert.match(recommendations, /Modèle actuellement indisponible/);
});

test("the featured camera uses the supplied Osmo artwork", async () => {
  const recommendations = html.match(/<section id="recommendations"[\s\S]*?<\/section>/)?.[0] ?? "";
  const artwork = await readFile(new URL("../assets/images/osmo-pocket-3.png", import.meta.url));

  assert.equal(
    createHash("sha256").update(artwork).digest("hex"),
    "cd07891549d00f011c6f6fbb148107be238ee91163a2223bc942e9e71aa93c7d"
  );
  assert.match(recommendations, /<img class="gear-camera-product" src="assets\/images\/osmo-pocket-3\.png" alt="" width="360" height="360">/);
});

test("storage icons read as physical media instead of labelled placeholders", () => {
  const recommendations = html.match(/<section id="recommendations"[\s\S]*?<\/section>/)?.[0] ?? "";
  const microSd = recommendations.match(/<svg class="gear-icon gear-icon-microsd"[\s\S]*?<\/svg>/)?.[0] ?? "";
  const drive = recommendations.match(/<svg class="gear-icon gear-icon-drive"[\s\S]*?<\/svg>/)?.[0] ?? "";

  assert.match(microSd, /class="gear-card-contact"/);
  assert.doesNotMatch(microSd, /<text\b/);
  assert.match(drive, /class="gear-drive-face"/);
  assert.match(drive, /class="gear-drive-cable"/);
});

test("social destinations remain visible as accessible controls without JavaScript", () => {
  const socialLinks = html.match(/<div class="social-links">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const links = [...socialLinks.matchAll(/<a\b[\s\S]*?<\/a>/g)].map(([link]) => link);

  assert.equal(links.length, 3);
  for (const [index, name] of ["TikTok", "Instagram", "YouTube"].entries()) {
    assert.match(links[index], new RegExp(`class="social-link"[^>]*aria-label="${name}"`));
    assert.doesNotMatch(links[index], /\bdata-reveal\b/);
    assert.match(links[index], /<svg class="social-icon"[^>]*aria-hidden="true"/);
  }
});

test("the Lab is the homepage primary path instead of a generic link directory", () => {
  const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)?.[0] ?? "";
  const lab = html.match(/<section id="lab"[\s\S]*?<\/section>/)?.[0] ?? "";
  const menu = html.match(/<nav id="site-menu"[\s\S]*?<\/nav>/)?.[0] ?? "";

  assert.match(hero, /class="button primary lab-cta" href="https:\/\/klubizz\.com\/@dembs-lab"/);
  assert.match(lab, /Construire seul ne veut pas dire avancer seul\./);
  assert.match(lab, /Rejoindre gratuitement le Lab/);
  assert.match(menu, /<a href="#lab">Dembs Lab<\/a>/);
  assert.match(menu, /class="menu-cta" href="https:\/\/klubizz\.com\/@dembs-lab"/);
});

test("the Lab presentation stays editorial instead of using a pixel console", () => {
  const lab = html.match(/<section id="lab"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(lab, /class="lab-mark"/);
  assert.match(lab, /class="lab-mark-liquid"/);
  assert.doesNotMatch(lab, /lab-console|lab-flask|lab-bubble|BUILD|TEST|SHIP/);
});

test("the footer ends the mobile page with a Lab invitation and named social links", () => {
  const footer = html.match(/<footer id="site-footer"[\s\S]*?<\/footer>/)?.[0] ?? "";

  assert.match(footer, /Tu construis quelque chose \?/);
  assert.match(footer, /href="https:\/\/klubizz\.com\/@dembs-lab"/);
  for (const name of ["TikTok", "Instagram", "YouTube"]) assert.match(footer, new RegExp(`>${name}<`));
  assert.doesNotMatch(footer, /\bdata-reveal\b/);
});

test("interactive controls expose accessible state", () => {
  assert.match(html, /aria-controls=["']site-menu["']/);
  assert.match(html, /aria-expanded=["']false["']/);
  assert.match(html, /aria-live=["']polite["']/);
  assert.match(html, /href=["']mentions-legales\.html["']/);
});

test("the app picker is a static grid, never an autoplaying rail", () => {
  assert.match(html, /id=["']app-grid["']/);
  assert.doesNotMatch(html, /data-carousel-toggle/);
  assert.doesNotMatch(html, /id=["']app-rail["']/);
  const grid = html.match(/<div id=["']app-grid["'][\s\S]*?<\/div>/)?.[0] ?? "";
  const buttons = [...grid.matchAll(/<button\b[^>]*\bdata-app-id=["']([\w-]+)["'][^>]*>/g)].map((match) => match[1]);
  assert.deepEqual(buttons, ["streetpark", "civi", "last-rep", "bascule"]);
  // Every tile names the app it selects, so the target is legible before the tap.
  assert.equal((grid.match(/<span>/g) ?? []).length, buttons.length);
  assert.equal((grid.match(/aria-current=["']true["']/g) ?? []).length, 1);
});

test("the app counts match the four apps wherever the page states them", () => {
  assert.doesNotMatch(html, /cliptwist/i);
  const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(hero, /<strong>2 apps sur les stores<\/strong>, 4 au compteur, tout documenté en public\./);
  assert.equal((hero.match(/<span class="proof-icons"[\s\S]*?<\/span>/)?.[0].match(/<img\b/g) ?? []).length, 2);
  const apps = html.match(/<section id="apps"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(apps, /<p class="developer-path">Dans la data au quotidien, formé au développement, quatre apps au compteur\.<\/p>/);
  const about = html.match(/<section id="about"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(about, /Quatre apps au compteur, deux sur les stores\./);
});

test("visible copy never uses long or en dashes", () => {
  assert.doesNotMatch(html, /[—–]/);
});

test("the mobile action bar defaults to the Lab and keeps contextual service actions", () => {
  const bar = html.match(/<div class="action-bar"[^>]*>[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.ok(bar, "action bar");
  assert.match(bar, /data-action-bar data-variant="lab"/);
  assert.match(bar, /<span class="action-bar-text" data-variant-lab>/);
  assert.match(bar, /data-variant-lab href="https:\/\/klubizz\.com\/@dembs-lab"/);
  assert.match(bar, /<span class="action-bar-text" data-variant-cadrage hidden>/);
  assert.match(bar, /<span class="action-bar-text" data-variant-audit hidden>/);
  assert.match(bar, /data-variant-cadrage hidden href="https:\/\/cal\.com\/dembs\/cadrage-app"/);
  assert.match(bar, /data-variant-audit hidden href="https:\/\/cal\.com\/dembs\/audit-stores"/);
  assert.match(bar, /<span class="action-bar-text" data-variant-motion hidden><strong>Motion Stack<\/strong>/);
  assert.match(bar, /data-variant-motion hidden href="https:\/\/klubizz\.com\/@dembs-lab\/contenus" target="_blank" rel="noopener"/);
  assert.match(html, /<section id="services"[^>]*data-action="cadrage"/);
  assert.match(html, /<article id="audit"[^>]*data-action="audit"/);
  const motion = html.match(/<section id="motion-stack"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.ok((motion.match(/data-action="motion"/g) ?? []).length >= 1, "the course switches the bar while on screen");
});

test("web fonts are self-hosted and preloaded", () => {
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(html, /<link rel="stylesheet" href="assets\/css\/fonts\.css">/);
  assert.match(html, /<link rel="preload" as="font" type="font\/woff2" href="assets\/fonts\/bricolage-grotesque-400-800\.woff2" crossorigin>/);
  assert.doesNotMatch(fontsCss, /https?:\/\//);
  for (const family of ["Bricolage Grotesque", "IBM Plex Sans", "IBM Plex Mono"]) assert.match(fontsCss, new RegExp(`font-family: '${family}'`));
});

test.skip("web fonts load asynchronously and retain a no-JavaScript stylesheet fallback", () => {
  const fontUrlPattern = /https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/;
  const preload = html.match(new RegExp(`<link\\b(?=[^>]*\\brel=["']preload["'])(?=[^>]*\\bas=["']style["'])[^>]*\\bhref=["']${fontUrlPattern.source}["'][^>]*>`))?.[0];
  const asyncStylesheet = html.match(new RegExp(`<link\\b(?=[^>]*\\brel=["']stylesheet["'])(?=[^>]*\\bmedia=["']print["'])(?=[^>]*\\bonload=)[^>]*\\bhref=["']${fontUrlPattern.source}["'][^>]*>`))?.[0];
  const noScript = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";
  const scriptEnabledHtml = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  const fontStylesheets = [...scriptEnabledHtml.matchAll(new RegExp(`<link\\b(?=[^>]*\\brel=["']stylesheet["'])[^>]*\\bhref=["']${fontUrlPattern.source}["'][^>]*>`, "g"))].map(([link]) => link);

  assert.ok(preload, "font CSS is preloaded without blocking render");
  assert.ok(asyncStylesheet, "font CSS promotes to a stylesheet after loading");
  assert.equal(fontStylesheets.length, 1);
  assert.match(fontStylesheets[0], /\bmedia=["']print["']/);
  assert.match(noScript, new RegExp(`<link\\b(?=[^>]*\\brel=["']stylesheet["'])[^>]*\\bhref=["']${fontUrlPattern.source}["'][^>]*>`));
});

test("campaign keeps safe content slots hidden until a known focus is resolved", () => {
  const campaign = html.match(/<aside id=["']campaign["'][\s\S]*?<\/aside>/)?.[0];
  assert.ok(campaign, "campaign container");
  for (const slot of [
    "data-campaign-eyebrow",
    "data-campaign-title",
    "data-campaign-description",
    "data-campaign-link",
    "data-campaign-affiliate"
  ]) assert.match(campaign, new RegExp(slot));
  assert.match(campaign, /data-campaign-affiliate hidden/);
});

test("nothing that leads to the paid call is advertised as free", () => {
  // The cadrage call costs 49 €. The guide is the only genuinely free thing here.
  const blocks = [
    html.match(/<div class="action-bar"[^>]*>[\s\S]*?<\/div>\s*<\/body>/)?.[0] ?? "",
    ...[...html.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(([block]) => block)
  ].filter((block) => block.includes("cal.com/dembs"));

  assert.ok(blocks.length >= 2, "the call is offered in the action bar and in a card");
  for (const block of blocks) {
    assert.doesNotMatch(block, /gratuit/i, block.slice(0, 120));
  }
  assert.match(html, /<p class="meta">45 min · 49 € · visio<\/p>/);
  assert.match(html, /<span>Appel de cadrage · 45 min · 49 €<\/span>/);
  assert.doesNotMatch(html, /39 €/);
});

test("the two offers are real, priced, and each says what the client leaves with", () => {
  const services = html.match(/<section id="services"[\s\S]*?<\/section>/)?.[0] ?? "";
  const cadrage = services.match(/<article id="cadrage"[\s\S]*?<\/article>/)?.[0] ?? "";
  const audit = services.match(/<article id="audit"[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.ok(cadrage && audit, "both offer cards");
  assert.match(cadrage, /<p class="meta">45 min · 49 € · visio<\/p>/);
  assert.match(cadrage, /<p class="outcome"><strong>Tu repars avec<\/strong>/);
  assert.match(cadrage, /href="https:\/\/cal\.com\/dembs\/cadrage-app"/);
  assert.match(audit, /<p class="meta">60 min · 129 € · visio<\/p>/);
  assert.match(audit, /<h3>Audit avant les stores<\/h3>/);
  assert.match(audit, /<p class="outcome"><strong>Tu repars avec<\/strong>/);
  assert.match(audit, /href="https:\/\/cal\.com\/dembs\/audit-stores"/);
  assert.doesNotMatch(services, /À venir|Ouverture prochainement|upcoming-card/);
});

test("the hero carries the portrait and the store proof, and the page says who is talking", () => {
  const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(hero, /<figure class="hero-portrait">[\s\S]*?<img src="assets\/img\/demba\.jpg" alt="[^"]+" width="476" height="595"/);
  assert.match(hero, /<span class="proof-icons" aria-hidden="true"><img src="assets\/icons\/streetpark\.png"[^>]*><img src="assets\/icons\/civi\.png\?v=\d+"/);
  assert.match(hero, /<strong>2 apps sur les stores<\/strong>/);
  const about = html.match(/<section id="about"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(about, /<h2>Demba<\/h2>/);
  assert.match(about, /assets\/img\/demba-avatar\.jpg/);
  for (const network of ["tiktok.com", "instagram.com", "youtube.com"]) assert.ok(about.includes(network), network);
  assert.match(html, /<meta property="og:image" content="https:\/\/dembs\.fr\/assets\/img\/og-image\.jpg">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /href="mailto:contact@dembs\.fr"/);
});

test("analytics run cookie-free through Umami with the declared site id", () => {
  assert.match(html, /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="ec731288-9516-4e50-88cb-d014819a7fbc"><\/script>/);
  assert.doesNotMatch(html, /googletagmanager|google-analytics|gtag\(/);
});

test("every journey leads somewhere specific", () => {
  const journeys = html.match(/<div class="journey-list">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const hrefs = [...journeys.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, ["#cadrage", "#cadrage", "#audit"]);
});

test("the Civi tile ships the supplied application icon", () => {
  assert.equal(
    createHash("sha256").update(civiIcon).digest("hex"),
    "ec5ebb0188858eff31f9fb70ca15a6da65f326a4f69dd85f278de7d5ebceb329"
  );
  assert.match(html, /src="assets\/icons\/civi\.png\?v=20260903"/);
});

test("the menu carries the Lab action and a labelled toggle icon", () => {
  const menu = html.match(/<nav id="site-menu"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.match(menu, /class="menu-cta"[^>]*href="https:\/\/klubizz\.com\/@dembs-lab"/);
  // Three bars that CSS crosses into an X, rather than a bare glyph.
  assert.match(html, /<span class="menu-icon" aria-hidden="true"><span><\/span><span><\/span><span><\/span><\/span>/);
  assert.doesNotMatch(html, /☰/);
});

test("Motion Stack leads the homepage right after the hero, before the Lab and the journeys", () => {
  const heroIndex = html.indexOf('<section class="hero">');
  const motionIndex = html.indexOf('<section id="motion-stack"');
  const labIndex = html.indexOf('<section id="lab"');
  const journeysIndex = html.indexOf('<section id="journeys"');
  assert.ok(heroIndex > -1 && motionIndex > heroIndex && labIndex > motionIndex && journeysIndex > labIndex, "hero, then Motion Stack, then Lab, then journeys");
  // The menu opens on the course, and the hero points at it before anything else.
  const menu = html.match(/<nav id="site-menu"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.match(menu, /aria-label="Navigation principale" hidden>\s*<a href="#motion-stack">Montage vidéo<\/a>/);
  const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(hero, /<div class="hero-copy">\s*<a class="hero-news" href="#motion-stack"><span class="hero-news-tag">Nouveau<\/span><span class="hero-news-text">Motion Stack, la formation<\/span>/);
  const services = html.match(/<section id="services"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.doesNotMatch(services, /motion-stack|Motion Stack/);
});

test("the old waiting list is gone now that the course is out", () => {
  assert.doesNotMatch(html, /ressources\.dembs\.fr\/motion-stack/);
  assert.doesNotMatch(html, /liste d’attente/i);
  assert.doesNotMatch(html, /class="soon"|motion-clapper|motion-mascot-stage/);
  assert.doesNotMatch(html, /class="note"/);
});

test("the Motion Stack section sends to the course in the Lab and never shows a price", () => {
  const motion = html.match(/<section id="motion-stack"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.ok(motion, "Motion Stack section");
  assert.match(motion, /<a class="button ms-cta" href="https:\/\/klubizz\.com\/@dembs-lab\/contenus" target="_blank" rel="noopener">/);
  assert.match(motion, /Claude Code/);
  for (const promise of ["Mes skills Claude Code", "Tous mes prompts", "Le kit et les leçons", "Le module 3D", "Monde 0", "Monde 1", "Monde 2"]) {
    assert.ok(motion.includes(promise), promise);
  }
  for (const use of ["Montrer ton app en action", "Présenter un produit en 3D", "Donner du rythme à tes vidéos face caméra"]) {
    assert.ok(motion.includes(use), use);
  }
  assert.doesNotMatch(motion, /€|\bprix\b|gratuit/i);
  // No price, but no doubt either: the course is sold. The 3D module is sold like the rest (Demba's call, 17/11): never "en option".
  assert.match(motion, /<span class="ms-where">En vente dans l’onglet Contenus<\/span>/);
  assert.match(motion, /<strong>Le module 3D<\/strong><span>Objets en 3D, objets qui se matérialisent et effets spéciaux\.<\/span>/);
  assert.doesNotMatch(motion, /en option/i);
});

test("the course blocks reveal one by one, the section itself is always there", () => {
  const motion = html.match(/<section id="motion-stack"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.doesNotMatch(motion.match(/^<section\b[^>]*>/)?.[0] ?? "", /\bdata-reveal\b/);
  assert.match(motion, /<div class="ms-copy" data-reveal data-reveal-index="0">/);
  assert.match(motion, /<div class="ms-timeline" data-action="motion" data-reveal data-reveal-index="1">/);
  assert.match(motion, /<div class="ms-inside" data-action="motion" data-reveal data-reveal-index="0">/);
  assert.match(motion, /<div class="ms-run" data-action="motion" data-reveal data-reveal-index="0">/);
});

test("the three uses are clips on an edit timeline, readable as a plain list", () => {
  const motion = html.match(/<section id="motion-stack"[\s\S]*?<\/section>/)?.[0] ?? "";
  const timeline = motion.match(/<div class="ms-timeline"[\s\S]*?<span class="ms-playhead" aria-hidden="true"><i><\/i><\/span>/)?.[0] ?? "";
  assert.ok(timeline, "timeline with its playhead");
  const list = timeline.match(/<ul class="ms-uses" aria-label="Pour quoi faire">[\s\S]*?<\/ul>/)?.[0] ?? "";
  const uses = [...list.matchAll(/<span class="ms-clip">(?:<span class="ms-tc" aria-hidden="true">\d\d:\d\d<\/span>)?([^<]+)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(uses, ["Montrer ton app en action", "Présenter un produit en 3D", "Donner du rythme à tes vidéos face caméra"]);
  for (const track of ["Sous-titres", "Animations", "3D", "Vidéo"]) assert.match(timeline, new RegExp(`class="ms-track-name"[^>]*>${track}</span>`));
  // Decoration stays out of the accessible list: ruler, captions lane, ghosts and playhead.
  assert.match(timeline, /<div class="ms-ruler" aria-hidden="true">/);
  assert.match(timeline, /<div class="ms-track ms-track-subs" aria-hidden="true">/);
  assert.doesNotMatch(motion, /class="ms-uses"[^>]*>\s*<li>/);
});

test("one Kuts on the page: the pixel sprite running the course bar, no video", async () => {
  const motion = html.match(/<section id="motion-stack"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.equal((html.match(/class="ms-kuts"/g) ?? []).length, 1);
  assert.match(motion, /<div class="ms-course">\s*<span class="ms-kuts" aria-hidden="true"><\/span>\s*<div class="ms-bar" aria-hidden="true"><\/div>\s*<ol class="ms-path"/);
  assert.match(motion, /<\/ol>\s*<\/div>\s*<a class="button ms-cta" href="https:\/\/klubizz\.com\/@dembs-lab\/contenus" target="_blank" rel="noopener">Voir la formation dans le Lab<\/a>/);
  assert.doesNotMatch(html, /motion-mascot|motion-freddy|data-motion-face|data-motion-mascot|ms-paws|ms-chip|Moi, c’est Kuts/);
  assert.doesNotMatch(html, /<video\b|motion-stack-promo|motion-stack-poster/);
  const sprite = await stat(new URL("../assets/img/kuts-pixel.png", import.meta.url));
  assert.ok(sprite.size < 20 * 1024, `sprite is ${sprite.size} bytes`);
  await assert.rejects(stat(new URL("../assets/video", import.meta.url)));
  await assert.rejects(stat(new URL("../assets/icons/cliptwist.png", import.meta.url)));
});
