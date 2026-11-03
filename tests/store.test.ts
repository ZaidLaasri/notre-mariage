import "@angular/compiler";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/app/core/store";
import { DEMO_WEDDING } from "../src/app/core/demo";
import type { SupabaseClient } from "@supabase/supabase-js";
Object.defineProperty(globalThis, "window", {
  value: { addEventListener: () => undefined },
  configurable: true,
});
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  },
  configurable: true,
});
test("demo edits survive explicit reopen and never contact Supabase", async () => {
  storage.clear();
  const s = new Store();
  await s.startDemo();
  const initial = s.data().providers.length;
  const p = await s.save("providers", {
    name: "Test",
    city: "Fès",
    phone: "",
    whatsapp: "",
    instagram: "",
    website: "",
    address: "",
    maps_url: "",
  });
  assert.equal(s.data().providers.length, initial + 1);
  const other = new Store();
  await other.startDemo();
  assert.equal(other.provider(p.id)?.city, "Fès");
  await other.decide("o00");
  assert.equal(other.requirement("lieu")?.selected_offer_id, "o00");
  await other.decide("o01");
  assert.equal(other.requirement("lieu")?.selected_offer_id, "o01");
  assert.equal(
    other.data().provider_offers.find((o) => o.id === "o00")?.status,
    "À comparer",
  );
  const before = other.total().paid;
  await other.book("o01");
  assert.equal(other.total().paid, before);
  await other.decide("o01");
  assert.equal(other.requirement("lieu")?.selected_offer_id, null);
  assert.ok(other.data().bookings.some((b) => b.offer_id === "o01"));
});
test("remote error does not mutate state or fall back to demo", async () => {
  const s = new Store();
  s.wedding.set(DEMO_WEDDING);
  const builder = {
    insert: () => builder,
    select: () => builder,
    single: async () => ({
      data: null,
      error: { message: "Network unavailable" },
    }),
  };
  s.client = { from: () => builder } as unknown as SupabaseClient;
  await assert.rejects(
    s.save("categories", { name: "Test", criteria: [] }),
    /Network unavailable/,
  );
  assert.equal(s.data().categories.length, 0);
  assert.equal(s.demo(), false);
});
test("export excludes session tokens and auth users", async () => {
  const s = new Store();
  await s.startDemo();
  let exported = "";
  s.download = (content) => {
    exported = String(content);
  };
  s.exportData();
  const value = JSON.parse(exported);
  assert.equal(value.schemaVersion, 1);
  assert.equal(value.demo, true);
  assert.equal(value.session, undefined);
  assert.equal(value.users, undefined);
  assert.ok(value.providers.length > 0);
});
