import { test } from "node:test";
import assert from "node:assert/strict";
import {
  timeMinute,
  formatTime,
  validateInterval,
  overlaps,
  reordered,
  publicProgram,
} from "../src/app/core/timeline";
import { demoData } from "../src/app/core/demo";
test("day J and overnight times validate without timezone conversion", () => {
  assert.equal(timeMinute("23:30"), 1410);
  assert.equal(timeMinute("00:30", 1), 1470);
  assert.equal(formatTime(1470), "00:30 (+1j)");
  assert.doesNotThrow(() => validateInterval(1410, 1470));
  assert.throws(() => validateInterval(1410, 30));
  for (const t of ["24:00", "9:00", "18:60", "NaN"])
    assert.throws(() => timeMinute(t));
});
test("overlaps ignore adjacent times cancelled steps and other ceremonies", () => {
  const base = demoData().timeline_events[0];
  const events = [
    { ...base, id: "a", start_minute: 900, end_minute: 960 },
    { ...base, id: "b", start_minute: 959, end_minute: 1000 },
    { ...base, id: "c", start_minute: 1000, end_minute: 1020 },
    {
      ...base,
      id: "d",
      start_minute: 900,
      end_minute: 1000,
      status: "Annulé" as const,
    },
    {
      ...base,
      id: "e",
      ceremony_id: "khotoba",
      start_minute: 900,
      end_minute: 1000,
    },
  ];
  assert.deepEqual([...overlaps(events)].sort(), ["a", "b"]);
});
test("drag ordering retains every step exactly once in both directions", () => {
  assert.deepEqual(reordered(["a", "b", "c"], "a", "c"), ["b", "a", "c"]);
  assert.deepEqual(reordered(["a", "b", "c"], "c", "a"), ["c", "a", "b"]);
  assert.deepEqual(reordered(["a", "b"], "a", "a"), ["a", "b"]);
  assert.throws(() => reordered(["a"], "missing", "a"));
});
test("provider document is an escaped whitelist excluding private data", () => {
  const e = {
    ...demoData().timeline_events[0],
    title: "<script>alert(1)</script>",
    description: "SECRET DESCRIPTION",
    logistics: "SECRET LOGISTICS",
    responsible: "SECRET CONTACT",
    public_note: "Accueil & entrée",
    location: "Riad <A>",
  };
  const html = publicProgram("Khotoba", "2027-04-17", [
    e,
    { ...e, id: "cancelled", title: "CANCELLED", status: "Annulé" },
  ]);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Accueil &amp; entrée"));
  for (const secret of [
    "SECRET DESCRIPTION",
    "SECRET LOGISTICS",
    "SECRET CONTACT",
    "CANCELLED",
    e.id,
    e.wedding_id,
    "supabase",
    "service_role",
  ])
    assert.ok(!html.includes(secret), secret);
  assert.ok(html.includes("default-src 'none'"));
});
