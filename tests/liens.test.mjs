import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../liens/index.html", import.meta.url), "utf8");
const home = await readFile(new URL("../index.html", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");

const body = html.match(/<body[\s\S]*<\/body>/)?.[0] ?? "";
const anchors = [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attrs, inner]) => ({
  href: attrs.match(/\bhref="([^"]+)"/)?.[1],
  event: attrs.match(/\bdata-umami-event="([^"]+)"/)?.[1],
  attrs,
  text: inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}));
const homeFooter = home.match(/<nav class="footer-socials"[\s\S]*?<\/nav>/)?.[0] ?? "";
const homeSocials = [...homeFooter.matchAll(/href="([^"]+)"/g)].map(([, href]) => href);

test("the links come in the agreed order: formation, Lab, site, then the footer socials", () => {
  const tracked = anchors.filter((a) => a.event).map((a) => a.href);
  assert.ok(homeSocials.length >= 3, "the homepage footer still lists its socials");
  assert.deepEqual(tracked, [
    "https://klubizz.com/@dembs-lab/contenus",
    "https://klubizz.com/@dembs-lab",
    "https://dembs.fr/",
    ...homeSocials
  ]);
});

test("the course card is the first link and leads to the Lab content tab", () => {
  const first = anchors[0];
  assert.equal(first.href, "https://klubizz.com/@dembs-lab/contenus");
  assert.match(first.text, /Motion Stack, la formation/);
  assert.match(first.text, /Nouveau/);
  assert.match(first.text, /Tes vidéos, montées par Claude Code/);
  assert.match(first.attrs, /target="_blank"/);
  assert.match(first.attrs, /rel="noopener"/);
  assert.equal(first.event, "lien-formation");
});

test("the free Lab and the site are labelled as asked", () => {
  const lab = anchors.find((a) => a.href === "https://klubizz.com/@dembs-lab");
  const site = anchors.find((a) => a.href === "https://dembs.fr/");
  assert.match(lab.text, /Le Dembs Lab/);
  assert.match(lab.text, /gratuite/);
  assert.match(site.text, /Le site/);
});

test("every outbound link is tracked by Umami with a distinct event", () => {
  const external = anchors.filter((a) => /^https:/.test(a.href));
  assert.ok(external.length >= 6);
  for (const a of external) assert.match(a.event ?? "", /^lien-[a-z-]+$/, a.href);
  const events = external.map((a) => a.event);
  assert.equal(new Set(events).size, events.length);
});

test("the page loads the same Umami site as the homepage and nothing else external", () => {
  const umami = /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="([^"]+)"><\/script>/;
  assert.equal(html.match(umami)?.[1], home.match(umami)?.[1]);
  const externalAssets = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(https?:[^"]+)"/g)]
    .map(([, url]) => url)
    .filter((url) => !url.startsWith("https://dembs.fr/"));
  assert.deepEqual(externalAssets, ["https://cloud.umami.is/script.js"]);
});

test("no price and no long or en dash anywhere on the page", () => {
  assert.doesNotMatch(html, /€|&euro;|\beuros?\b|\d\s*EUR\b/i);
  assert.doesNotMatch(html, /[–—]|&mdash;|&ndash;/);
});

test("the page declares its meta, canonical and social preview", () => {
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/dembs\.fr\/liens\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/dembs\.fr\/liens\/">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/dembs\.fr\/assets\/img\/og-image\.jpg">/);
  assert.match(html, /<meta name="theme-color" content="#[0-9a-f]{6}">/i);
});

test("the deployment publishes the liens folder", () => {
  const rsync = workflow.match(/rsync[\s\S]*?site\//)?.[0] ?? "";
  assert.ok(rsync, "the workflow copies the repository with rsync");
  assert.doesNotMatch(rsync, /--exclude '?liens/);
});
