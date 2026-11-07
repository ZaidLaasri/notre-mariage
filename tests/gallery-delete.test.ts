import "@angular/compiler";
import "fake-indexeddb/auto";
import { Injector, signal } from "@angular/core";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Gallery } from "../src/app/shared/gallery";
import { Store } from "../src/app/core/store";
import { Photos } from "../src/app/core/photos";
import { demoData, DEMO_WEDDING } from "../src/app/core/demo";
Object.defineProperty(globalThis, "window", {
  value: { addEventListener: () => undefined },
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: () => null, setItem: () => undefined },
  configurable: true,
});
async function setup(count: number) {
  const s = new Store();
  s.demo.set(true);
  s.wedding.set(DEMO_WEDDING);
  s.data.set(demoData());
  const injector = Injector.create({
    providers: [{ provide: Store, useValue: s }, Photos],
  });
  const photos = injector.get(Photos);
  await photos.clearDemo();
  photos.resize = async () => new Blob(["image"], { type: "image/webp" });
  for (let i = 0; i < count; i++)
    await photos.upload(
      new File(["image"], `photo${i}.jpg`, { type: "image/jpeg" }),
      "set1",
      "gift_set",
    );
  // Exercise the actual deletion handler with signal bindings, without a browser view.
  const gallery = Object.assign(Object.create(Gallery.prototype) as Gallery, {
    s,
    photos,
    offerId: () => "set1",
    kind: () => "gift_set",
    index: signal(count - 1),
    open: signal(true),
    largeUrl: signal("blob:previous"),
    remove: (p: Parameters<Photos["remove"]>[0]) =>
      photos.remove(p, "gift_set"),
  });
  return { s, photos, gallery, injector };
}
test("deleting the final Dfou3 photo closes its popup and removes stored metadata", async () => {
  const { photos, gallery, s, injector } = await setup(1);
  try {
    await gallery.deletePhoto(photos.list("set1", "gift_set")[0]);
    assert.equal(gallery.open(), false);
    assert.equal(gallery.index(), 0);
    assert.equal(gallery.largeUrl(), "");
    assert.equal(s.data().attachments.length, 0);
    assert.equal(s.error(), "");
  } finally {
    await photos.clearDemo();
    injector.destroy();
  }
});
test("deleting the last photo of several keeps the popup at a valid remaining index", async () => {
  const { photos, gallery, s, injector } = await setup(2);
  try {
    await gallery.deletePhoto(photos.list("set1", "gift_set")[1]);
    assert.equal(gallery.open(), true);
    assert.equal(gallery.index(), 0);
    assert.equal(photos.list("set1", "gift_set").length, 1);
    assert.equal(s.error(), "");
  } finally {
    await photos.clearDemo();
    injector.destroy();
  }
});
test("a failed deletion keeps the popup open with its selected photo", async () => {
  const { photos, gallery, s, injector } = await setup(1);
  try {
    gallery.remove = async () => {
      throw new Error("Storage unavailable");
    };
    await gallery.deletePhoto(photos.list("set1", "gift_set")[0]);
    assert.equal(gallery.open(), true);
    assert.equal(gallery.largeUrl(), "blob:previous");
    assert.equal(photos.list("set1", "gift_set").length, 1);
    assert.equal(s.error(), "Storage unavailable");
  } finally {
    await photos.clearDemo();
    injector.destroy();
  }
});
