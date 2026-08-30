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
