import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const civiIcon = await readFile(new URL("../assets/icons/civi.png", import.meta.url));
const pageRevealTagPattern = /(?:<aside\b(?=[^>]*\bid=["']campaign["'])|<section\b|<footer\b)[^>]*\sdata-reveal(?=\s|=|>)[^>]*>/g;

test("homepage contains the validated positioning and section contracts", () => {
  assert.doesNotMatch(html, /<section class="hero"[^>]*\bdata-reveal\b/);
  assert.match(html, /Développeur d’applications/);
  assert.match(html, /Je crée des apps\. Et je les mène jusqu’aux stores\./);
  assert.match(html, /Je partage le processus et j’accompagne ceux qui veulent lancer la leur\./);
  for (const id of ["site-menu", "campaign", "journeys", "apps", "app-detail", "services", "resources", "recommendations"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("homepage reveal groups declare capped stagger indices", () => {
  const revealTags = [...html.matchAll(pageRevealTagPattern)].map(([tag]) => tag);
  const revealIndices = revealTags.map((tag) => Number(tag.match(/\bdata-reveal-index="(\d+)"/)?.[1]));
  assert.deepEqual(revealIndices, [0, 1, 2, 3, 4, 5, 6]);
});

test("reveal group matching excludes stagger-index-only elements", () => {
  const fixture = '<section data-reveal-index="1"></section>';
  assert.equal([...fixture.matchAll(pageRevealTagPattern)].length, 0);
});

test("journey and service cards reset their reveal stagger within each group", () => {
  const journeyGroup = html.match(/<div class="journey-list">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const serviceGroup = html.match(/<div class="card-grid">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const journeyIndices = [...journeyGroup.matchAll(/<a\b[^>]*\bdata-reveal-index="(\d+)"[^>]*>/g)].map((match) => Number(match[1]));
  const serviceIndices = [...serviceGroup.matchAll(/<(?:article|aside|a)\b[^>]*\bdata-reveal-index="(\d+)"[^>]*>/g)].map((match) => Number(match[1]));

  assert.deepEqual(journeyIndices, [0, 1, 2]);
  assert.deepEqual(serviceIndices, [0, 1, 2]);
  assert.equal((journeyGroup.match(/\bdata-reveal(?=\s|=|>)/g) ?? []).length, 3);
  assert.equal((serviceGroup.match(/\bdata-reveal(?=\s|=|>)/g) ?? []).length, 3);
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

test("social destinations reveal as accessible icon controls", () => {
  const socialLinks = html.match(/<div class="social-links">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const links = [...socialLinks.matchAll(/<a\b[\s\S]*?<\/a>/g)].map(([link]) => link);

  assert.equal(links.length, 3);
  for (const [index, name] of ["TikTok", "Instagram", "YouTube"].entries()) {
    assert.match(links[index], new RegExp(`class="social-link"[^>]*aria-label="${name}"`));
    assert.match(links[index], new RegExp(`data-reveal-index="${index}"`));
    assert.match(links[index], /\bdata-reveal\b/);
    assert.match(links[index], /<svg class="social-icon"[^>]*aria-hidden="true"/);
  }
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

test("a permanent booking action stays reachable once the hero scrolls away", () => {
  const bar = html.match(/<div class="action-bar">[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.ok(bar, "action bar");
  assert.match(bar, /https:\/\/cal\.com\/dembs\/cadrage-app/);
});

test("web fonts load asynchronously and retain a no-JavaScript stylesheet fallback", () => {
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
    html.match(/<div class="action-bar">[\s\S]*?<\/div>\s*<\/body>/)?.[0] ?? "",
    ...[...html.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(([block]) => block)
  ].filter((block) => block.includes("cal.com/dembs"));

  assert.ok(blocks.length >= 2, "the call is offered in the action bar and in a card");
  for (const block of blocks) {
    assert.doesNotMatch(block, /gratuit/i, block.slice(0, 120));
  }
  assert.match(html, /<p class="meta">45 min · 49 €<\/p>/);
  assert.match(html, /<span>Appel de cadrage · 45 min · 49 €<\/span>/);
  assert.doesNotMatch(html, /39 €/);
});

test("the complete accompaniment is clearly upcoming and cannot be booked", () => {
  const services = html.match(/<section id="services"[\s\S]*?<\/section>/)?.[0] ?? "";
  const upcoming = services.match(/<aside class="upcoming-card"[\s\S]*?<h3>Accompagnement complet<\/h3>[\s\S]*?<\/aside>/)?.[0] ?? "";

  assert.ok(upcoming, "upcoming complete accompaniment card");
  assert.match(upcoming, /<p class="meta">À venir<\/p>/);
  assert.match(upcoming, /Un suivi de l’idée jusqu’à la publication\. Ouverture prochainement\./);
  assert.doesNotMatch(upcoming, /href=|cal\.com/);
});

test("the Civi tile ships the supplied application icon", () => {
  assert.equal(
    createHash("sha256").update(civiIcon).digest("hex"),
    "78846a033e2989ff208dae65b49b20628d911320499eed625d676d5c3e70a2f9"
  );
  assert.match(html, /src="assets\/icons\/civi\.png\?v=20260901"/);
});

test("the menu carries the booking action and a labelled toggle icon", () => {
  const menu = html.match(/<nav id="site-menu"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.match(menu, /class="menu-cta"[^>]*href="https:\/\/cal\.com\/dembs\/cadrage-app"/);
  // Three bars that CSS crosses into an X, rather than a bare glyph.
  assert.match(html, /<span class="menu-icon" aria-hidden="true"><span><\/span><span><\/span><span><\/span><\/span>/);
  assert.doesNotMatch(html, /☰/);
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
