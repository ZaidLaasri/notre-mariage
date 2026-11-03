import "@angular/compiler";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/app/core/store";
import { demoData, DEMO_WEDDING } from "../src/app/core/demo";
Object.defineProperty(globalThis, "window", {
  value: { addEventListener: () => undefined },
  configurable: true,
});
const cache = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => cache.get(k) ?? null,
    setItem: (k: string, v: string) => cache.set(k, v),
    removeItem: (k: string) => cache.delete(k),
  },
  configurable: true,
});
function store() {
  const s = new Store();
  s.demo.set(true);
  s.wedding.set(DEMO_WEDDING);
  s.data.set(demoData());
  return s;
}
test("Jhaz create edit budget link and delete never count the item twice", async () => {
  const s = store();
  const before = s.total().engaged;
  const first = await s.engageTrousseau("jhaz-item", "khotoba");
  const second = await s.engageTrousseau("jhaz-item", "khotoba");
  assert.equal(first, second);
  assert.equal(s.total().engaged, before + 75000);
  assert.equal(s.total().paid, 500000);
  await s.save("trousseau_items", {
    id: "jhaz-item",
    name: "Changed",
    status: "Préparé",
    unit_minor: 90000,
  });
  assert.equal(s.total().engaged, before + 75000);
  await s.remove("trousseau_items", "jhaz-item");
  assert.ok(s.data().expenses.some((e) => e.id === first));
  assert.equal(s.total().engaged, before + 75000);
});
test("timeline CRUD providers and reordering remain separate from preparatory tasks", async () => {
  const s = store(),
    tasks = s.data().tasks.length;
  await s.saveTimeline(
    {
      ceremony_id: "sdak",
      title: "Coiffure",
      start_minute: 900,
      end_minute: 960,
      description: "Privé",
      public_note: "",
      location: "Riad",
      responsible: "Commun",
      logistics: "",
      status: "Prévu",
      position: 1,
      offer_id: "demo-hair-offer",
    },
    ["p20"],
  );
  const event = s.data().timeline_events.find((e) => e.title === "Coiffure")!;
  assert.equal(
    s.data().timeline_event_providers.filter((p) => p.event_id === event.id)
      .length,
    1,
  );
  await s.saveTimeline({ ...event, title: "Essai coiffure" }, ["p20", "p20"]);
  assert.equal(
    s.data().timeline_event_providers.filter((p) => p.event_id === event.id)
      .length,
    1,
  );
  const ids = s
    .data()
    .timeline_events.filter((e) => e.ceremony_id === "sdak")
    .map((e) => e.id)
    .reverse();
  await s.reorderTimeline("sdak", ids);
  assert.equal(
    s.data().timeline_events.find((e) => e.id === ids[0])?.position,
    0,
  );
  await assert.rejects(s.reorderTimeline("sdak", [ids[0], ids[0]]));
  assert.equal(s.data().tasks.length, tasks);
});
test("old demo data are upgraded without discarding saved providers or inspirations", async () => {
  cache.clear();
  const d = demoData();
  const legacy = Object.fromEntries(
    Object.entries(d).filter(
      ([key]) =>
        ![
          "trousseau_categories",
          "trousseau_sets",
          "trousseau_items",
          "moodboards",
          "inspiration_comments",
          "timeline_events",
          "timeline_event_providers",
        ].includes(key),
    ),
  );
  d.providers[0].name = "Saved custom vendor";
  legacy.providers = d.providers;
  cache.set(
    "notre-mariage-demo-v1",
    JSON.stringify({ version: 1, data: legacy, wedding: DEMO_WEDDING }),
  );
  const s = new Store();
  await s.startDemo();
  assert.equal(s.data().providers[0].name, "Saved custom vendor");
  assert.deepEqual(s.data().moodboards, []);
  assert.ok(s.data().inspirations.some((i) => i.id === "idea-beauty"));
  assert.ok(s.data().categories.some((c) => c.kind === "hair"));
});
test("Makeup and Hair reuse a provider while retaining different requirements and no expenses", () => {
  const d = demoData();
  const makeup = d.provider_offers.find((o) => o.id === "o20")!,
    hair = d.provider_offers.find((o) => o.id === "demo-hair-offer")!;
  assert.equal(makeup.provider_id, hair.provider_id);
  assert.notEqual(makeup.requirement_id, hair.requirement_id);
  assert.equal(makeup.package_reference, hair.package_reference);
  assert.ok(!d.expenses.some((e) => e.booking_id === hair.id));
});
