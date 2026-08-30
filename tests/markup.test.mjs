import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
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
  const serviceIndices = [...serviceGroup.matchAll(/<(?:article|aside)\b[^>]*\bdata-reveal-index="(\d+)"[^>]*>/g)].map((match) => Number(match[1]));

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
