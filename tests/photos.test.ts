import "@angular/compiler";
import "fake-indexeddb/auto";
import { Injector } from "@angular/core";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/app/core/store";
import { Photos } from "../src/app/core/photos";
import { demoData, DEMO_WEDDING } from "../src/app/core/demo";
Object.defineProperty(globalThis, "window", {
  value: { addEventListener: () => undefined },
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: { setItem: () => undefined, getItem: () => null },
  configurable: true,
});
function services() {
  const store = new Store();
  store.demo.set(true);
  store.wedding.set(DEMO_WEDDING);
  store.data.set(demoData());
  const injector = Injector.create({
    providers: [{ provide: Store, useValue: store }, Photos],
  });
  const photos = injector.get(Photos);
  return { store, photos, injector };
}
test("multiple Jhaz and moodboard photos use Blob storage and reusable galleries", async () => {
  const { store, photos, injector } = services();
  photos.resize = async (file) =>
    new Blob([await file.arrayBuffer()], { type: "image/webp" });
  try {
    await photos.clearDemo();
    for (const name of ["first", "second"])
      await photos.upload(
        new File(["image-binary"], name + ".jpg", { type: "image/jpeg" }),
        "idea-beauty",
        "inspiration",
      );
    await photos.upload(
      new File(["jhaz"], "jhaz.png", { type: "image/png" }),
      "jhaz-item",
      "trousseau_item",
    );
    assert.equal(photos.list("idea-beauty", "inspiration").length, 2);
    assert.equal(photos.list("jhaz-item", "trousseau_item").length, 1);
    const rows = photos.list("idea-beauty", "inspiration");
    assert.ok(rows[0].is_cover);
    assert.ok(!rows[1].is_cover);
    assert.ok(rows[0].path.startsWith("demo-wedding/inspiration/"));
    assert.ok(!JSON.stringify(store.data()).includes("base64"));
    assert.ok((await photos.url(rows[0].path)).startsWith("blob:"));
    await photos.save(rows[0], { caption: "Nouvelle légende" }, "inspiration");
    assert.equal(
      photos.list("idea-beauty", "inspiration")[0].caption,
      "Nouvelle légende",
    );
    await photos.cover(rows[1], "idea-beauty", "inspiration");
    assert.equal(
      photos.list("idea-beauty", "inspiration").filter((p) => p.is_cover)
        .length,
      1,
    );
    await photos.remove(rows[0], "inspiration");
    assert.equal(photos.list("idea-beauty", "inspiration").length, 1);
    assert.equal(store.data().attachments.length, 2);
    await photos.clearDemo();
  } finally {
    injector.destroy();
  }
});
test("failed metadata write cleans uploaded Blobs instead of creating orphan images", async () => {
  const { store, photos, injector } = services();
  photos.resize = async () => new Blob(["stub"], { type: "image/webp" });
  let attemptedPath = "";
  const original = store.save.bind(store);
  store.save = async (table, row) => {
    if (table === "attachments") {
      attemptedPath = String("path" in row ? row.path : "");
      throw new Error("Metadata unavailable");
    }
    return original(table, row);
  };
  try {
    await photos.clearDemo();
    await assert.rejects(
      photos.upload(
        new File(["data"], "photo.jpg", { type: "image/jpeg" }),
        "idea-beauty",
        "inspiration",
      ),
      /Metadata unavailable/,
    );
    assert.equal(store.data().attachments.length, 0);
    assert.equal(await photos.url(attemptedPath), "");
    await photos.clearDemo();
  } finally {
    injector.destroy();
  }
});
test("photo intake rejects unsupported formats and source sizes before decoding", async () => {
  const { photos, injector } = services();
  try {
    await assert.rejects(
      photos.resize(new File(["data"], "photo.heic", { type: "image/heic" })),
      /Formats acceptés/,
    );
    await assert.rejects(
      photos.resize(
        new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.jpg", {
          type: "image/jpeg",
        }),
      ),
      /20 Mo/,
    );
  } finally {
    injector.destroy();
  }
});
