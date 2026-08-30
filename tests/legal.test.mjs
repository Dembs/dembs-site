import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../mentions-legales.html", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");

test("the declared host matches where the site is actually deployed", () => {
  // LCEN art. 6 III requires naming the real host. The site moved to GitHub Pages,
  // so any leftover OVH declaration would be a false statement.
  assert.match(workflow, /actions\/deploy-pages|github-pages/);
  assert.match(html, /GitHub, Inc\./);
  assert.match(html, /88 Colin P\. Kelly Jr\. Street, San Francisco, CA 94107/);
  assert.doesNotMatch(html, /OVH/i);
  assert.doesNotMatch(html, /2 rue Kellermann/);
});

test("the mandatory publisher identifications are present", () => {
  for (const value of [
    "Demba SY",
    "979 848 819",
    "979 848 819 00020",
    "58.29C",
    "contact@dembs.fr"
  ]) assert.ok(html.includes(value), value);
  assert.match(html, /directeur de la publication/i);
});

test("the legal page shares the site stylesheet instead of its own theme", () => {
  assert.match(html, /<link rel="stylesheet" href="assets\/css\/site\.css">/);
  assert.doesNotMatch(html, /<style>/);
  assert.doesNotMatch(html, /Space\+Grotesk/);
  assert.match(html, /Bricolage\+Grotesque/);
  assert.match(html, /assets\/symbole-dembs\.svg/);
});

test("third-party disclosures cover every service the pages actually load", () => {
  for (const service of ["GitHub Pages", "Cal.com", "Google Fonts", "ressources.dembs.fr"]) {
    assert.ok(html.includes(service), service);
  }
  assert.match(html, /transfert de données de connexion hors de l’Union européenne/);
});

test("the page stays reachable and dated", () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/dembs\.fr\/mentions-legales\.html">/);
  assert.match(html, /Dernière mise à jour(&nbsp;| ): 30 août 2026/);
  assert.match(html, /class="skip-link"/);
});
