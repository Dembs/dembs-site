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
