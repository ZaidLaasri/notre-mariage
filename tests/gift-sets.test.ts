import "@angular/compiler";
import "fake-indexeddb/auto";
import { Injector } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/app/core/store";
import { Photos } from "../src/app/core/photos";
import { GiftSets } from "../src/app/core/gift-sets";
import { Planning } from "../src/app/features/planning";
import { demoData, DEMO_WEDDING } from "../src/app/core/demo";
Object.defineProperty(globalThis, "window", {
  value: { addEventListener: () => undefined },
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: () => null, setItem: () => undefined },
  configurable: true,
});
function setup() {
  const s = new Store();
  s.demo.set(true);
  s.wedding.set(DEMO_WEDDING);
  s.data.set(demoData());
  const injector = Injector.create({
    providers: [
      { provide: Store, useValue: s },
      Photos,
      GiftSets,
      Planning,
      FormBuilder,
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { routeConfig: { path: "dfou3" } } },
      },
    ],
  });
  return {
    s,
    photos: injector.get(Photos),
    sets: injector.get(GiftSets),
    page: injector.get(Planning),
    injector,
  };
}
async function settled(s: Store) {
  while (s.busy()) await new Promise((r) => setTimeout(r, 0));
  assert.equal(s.error(), "");
}
test("editing set and tayfour keeps IDs, gallery relations, delivery and accounting", async () => {
  const { s, page, injector } = setup();
  try {
    const original = s.data().gift_sets[0],
      gift = s.data().gifts.find((g) => g.gift_set_id === original.id)!;
    const expenses = structuredClone(s.data().expenses),
      payments = structuredClone(s.data().payments);
    await s.save("gifts", {
      id: gift.id,
      provider_id: "p00",
      purchased_on: "2026-11-01",
      delivered: true,
      currency: "EUR",
    });
    page.editSet(original);
    page.setForm.patchValue({
      name: "Tayfour ivoire",
      color: "Ivoire",
      ceremony_id: "khotoba",
    });
    page.addSet();
    await settled(s);
    assert.equal(s.data().gift_sets.length, 2);
    assert.equal(
      s.data().gift_sets.find((x) => x.id === original.id)?.name,
      "Tayfour ivoire",
    );
    assert.equal(
      s.data().gifts.find((g) => g.id === gift.id)?.gift_set_id,
      original.id,
    );
    page.editGift(s.data().gifts.find((g) => g.id === gift.id)!);
    page.giftForm.patchValue({
      name: "Tayfour fleuri",
      amount: "12,50",
      quantity: 2,
      tyafer: "Plateau ivoire",
    });
    page.addGift();
    await settled(s);
    const updated = s.data().gifts.find((g) => g.id === gift.id)!;
    assert.equal(updated.amount_minor, 1250);
    assert.equal(updated.currency, "EUR");
    assert.equal(updated.provider_id, "p00");
    assert.equal(updated.purchased_on, "2026-11-01");
    assert.equal(updated.delivered, true);
    assert.equal(updated.tyafer, "Plateau ivoire");
    assert.deepEqual(s.data().expenses, expenses);
    assert.deepEqual(s.data().payments, payments);
  } finally {
    injector.destroy();
  }
});
test("opening and cancelling deletion changes no data", () => {
  const { s, page, injector } = setup();
  try {
    const before = JSON.stringify(s.data());
    page.askDeleteSet(s.data().gift_sets[0]);
    assert.ok(page.deletion());
    page.cancelDeletion();
    assert.equal(page.deletion(), null);
    assert.equal(JSON.stringify(s.data()), before);
  } finally {
    injector.destroy();
  }
});
test("set deletion removes its gifts and all associated photo Blobs, preserving other sets and budgets", async () => {
  const { s, photos, sets, injector } = setup();
  photos.resize = async () => new Blob(["test-image"], { type: "image/webp" });
  try {
    await photos.clearDemo();
    const set = s.data().gift_sets[0],
      gift = s.data().gifts.find((g) => g.gift_set_id === set.id)!;
    await photos.upload(
      new File(["x"], "set.jpg", { type: "image/jpeg" }),
      set.id,
      "gift_set",
    );
    await photos.upload(
      new File(["x"], "gift.jpg", { type: "image/jpeg" }),
      gift.id,
      "gift",
    );
    const request = sets.prepareSet(set.id),
      paths = request.photos.map((p) => p.path);
    assert.equal(request.photos.length, 2);
    const remaining = s.data().gifts.filter((g) => g.gift_set_id !== set.id);
    const expenses = structuredClone(s.data().expenses),
      payments = structuredClone(s.data().payments);
    await sets.remove(request);
    assert.ok(!s.data().gift_sets.some((x) => x.id === set.id));
    assert.deepEqual(s.data().gifts, remaining);
    assert.equal(s.data().attachments.length, 0);
    for (const path of paths) assert.equal(await photos.url(path), "");
    assert.deepEqual(s.data().expenses, expenses);
    assert.deepEqual(s.data().payments, payments);
    await photos.clearDemo();
  } finally {
    injector.destroy();
  }
});
test("article-only deletion keeps parent and siblings", async () => {
  const { s, sets, injector } = setup();
  try {
    const gift = s.data().gifts[0];
    const siblings = s.data().gifts.filter((g) => g.id !== gift.id);
    await sets.remove(sets.prepareGift(gift.id));
    assert.deepEqual(s.data().gifts, siblings);
    assert.ok(s.data().gift_sets.some((x) => x.id === gift.gift_set_id));
  } finally {
    injector.destroy();
  }
});
test("content changes since confirmation abort deletion before any files or rows are removed", async () => {
  const { s, sets, injector } = setup();
  try {
    const set = s.data().gift_sets[0],
      request = sets.prepareSet(set.id);
    await s.save("gift_sets", { id: set.id, color: "Nouvelle couleur" });
    const before = JSON.stringify(s.data());
    await assert.rejects(sets.remove(request), /contenu a changé/);
    assert.equal(JSON.stringify(s.data()), before);
  } finally {
    injector.destroy();
  }
});
test("photo deletion failure keeps gifts and set and reports incomplete operation", async () => {
  const { s, photos, sets, injector } = setup();
  try {
    await s.save("attachments", {
      gift_id: null,
      outfit_id: null,
      gift_set_id: "set1",
      inspiration_id: null,
      path: "demo-wedding/test.webp",
      thumbnail_path: null,
      caption: "Test",
      position: 0,
      is_cover: true,
      size_bytes: 1,
    });
    photos.remove = async () => {
      throw new Error("Storage unavailable");
    };
    const before = s.data().gifts.length;
    await assert.rejects(
      sets.remove(sets.prepareSet("set1")),
      /n’a pas pu être terminée/,
    );
    assert.equal(s.data().gifts.length, before);
    assert.ok(s.data().gift_sets.some((x) => x.id === "set1"));
  } finally {
    injector.destroy();
  }
});
