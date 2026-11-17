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
  assert.ok(APPS.every((app) => !/cliptwist/i.test(JSON.stringify(app))), "no ClipTwist entry");
});

test("Civi uses the cache-busted application icon", () => {
  assert.equal(
    APPS.find((app) => app.id === "civi")?.icon,
    "assets/icons/civi.png?v=20260901"
  );
});

test("resolveCampaign returns only complete allow-listed campaigns", () => {
  assert.equal(resolveCampaign(null), null);
  assert.equal(resolveCampaign("unknown"), null);
  assert.equal(resolveCampaign("<img src=x onerror=alert(1)>"), null);
  assert.deepEqual(resolveCampaign("guide-stores"), CAMPAIGNS["guide-stores"]);
});

test("the Motion Stack campaign sends TikTok visitors straight to the course section", () => {
  const campaign = resolveCampaign("motion-stack");
  assert.ok(campaign, "motion-stack campaign");
  // No card of its own: it would repeat the section right under it, same promise, same button.
  assert.equal(campaign.section, "motion-stack");
  for (const field of ["eyebrow", "title", "description", "cta", "url"]) assert.equal(campaign[field], undefined, field);
});

test("a card campaign still needs every text field and an https destination", () => {
  for (const [focus, campaign] of Object.entries(CAMPAIGNS)) {
    if (campaign.section) continue;
    assert.deepEqual(resolveCampaign(focus), campaign);
    for (const field of ["eyebrow", "title", "description", "cta"]) assert.ok(campaign[field].trim(), `${focus}.${field}`);
    assert.equal(new URL(campaign.url).protocol, "https:");
  }
});

test("visible copy never uses long or en dashes", () => {
  const strings = [...APPS.flatMap((app) => [app.name, app.tag, app.description, app.statusLabel, app.webLabel ?? ""]),
    ...Object.values(CAMPAIGNS).flatMap((campaign) => [campaign.eyebrow, campaign.title, campaign.description, campaign.cta])]
    .filter((value) => typeof value === "string");
  assert.ok(strings.length > 0);
  for (const value of strings) assert.doesNotMatch(value, /[—–]/, value);
});
