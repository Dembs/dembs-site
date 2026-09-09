import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const civiIcon = await readFile(new URL("../assets/icons/civi.png", import.meta.url));
const fontsCss = await readFile(new URL("../assets/css/fonts.css", import.meta.url), "utf8");
const pageRevealTagPattern = /(?:<aside\b(?=[^>]*\bid=["']campaign["'])|<section\b|<footer\b)[^>]*\sdata-reveal(?=\s|=|>)[^>]*>/g;

test("homepage contains the validated positioning and section contracts", () => {
  assert.doesNotMatch(html, /<section class="hero"[^>]*\bdata-reveal\b/);
  assert.match(html, /Développeur d’applications/);
  assert.match(html, /Je crée des apps\. Et je les mène jusqu’aux stores\./);
  assert.match(html, /Je partage le processus et j’accompagne ceux qui veulent lancer la leur\./);
  for (const id of ["site-menu", "lab", "campaign", "journeys", "apps", "app-detail", "services", "resources", "recommendations"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("homepage reveal groups declare capped stagger indices", () => {
  const revealTags = [...html.matchAll(pageRevealTagPattern)].map(([tag]) => tag);
  const revealIndices = revealTags.map((tag) => Number(tag.match(/\bdata-reveal-index="(\d+)"/)?.[1]));
  assert.deepEqual(revealIndices, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
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
  assert.match(html, /<section id="services"[^>]*data-action="cadrage"/);
  assert.match(html, /<article id="audit"[^>]*data-action="audit"/);
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

test("the Lab leads the homepage sections before Motion Stack and the journeys", () => {
  const heroIndex = html.indexOf('<section class="hero">');
  const labIndex = html.indexOf('<section id="lab"');
  const motionIndex = html.indexOf('<section id="motion-stack"');
  const journeysIndex = html.indexOf('<section id="journeys"');
  assert.ok(heroIndex > -1 && labIndex > heroIndex && motionIndex > labIndex && journeysIndex > motionIndex, "hero, then Lab, then Motion Stack, then journeys");
  const motion = html.match(/<section id="motion-stack"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(motion, /<div class="card-grid">\s*<a class="soon"/);
  assert.match(motion, /liste d’attente est ouverte/);
  assert.match(html, /<nav id="site-menu"[\s\S]*?<a href="#motion-stack">Montage vidéo<\/a>/);
  const services = html.match(/<section id="services"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.doesNotMatch(services, /class="soon"/);
});

test("the upcoming service links to the Motion Stack waiting list", () => {
  const soon = html.match(/<a class="soon"[\s\S]*?<\/a>/)?.[0] ?? "";
  assert.ok(soon, "Motion Stack service card");
  assert.match(soon, /href="https:\/\/ressources\.dembs\.fr\/motion-stack"/);
  assert.match(soon, /<p class="meta">Liste d’attente ouverte<\/p>/);
  assert.match(soon, /<h3>Montage vidéo accéléré par l’IA<\/h3>/);
  assert.match(soon, /Découvrir Motion Stack/);
  assert.match(soon, /data-motion-mascot/);
  assert.match(soon, /class="motion-mascot-stage" aria-hidden="true"/);
  assert.match(soon, /data-motion-face/);
  assert.match(soon, /class="motion-freddy-body"/);
  assert.match(soon, /class="motion-wave"/);
  assert.match(soon, /class="motion-spark"/);
  assert.match(soon, /class="motion-frame"/);
  assert.match(soon, /class="motion-clapper"/);
  assert.match(soon, /class="motion-clapper-slate"/);
  assert.doesNotMatch(soon, /motion-(?:scissors|cut-line)/);
  assert.doesNotMatch(soon, /motion-(?:timeline|track|playhead)/);
  assert.doesNotMatch(soon, /motion-(?:leg|shoe|torso|arm|cap|mouth)/);
  assert.doesNotMatch(html, /class="note"/);
});
