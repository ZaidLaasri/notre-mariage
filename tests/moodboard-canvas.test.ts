import "@angular/compiler";
import { Injector, signal } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  itemPoint,
  movedPoint,
  zoomAt,
  fitCanvas,
} from "../src/app/core/moodboard-canvas";
import { MoodboardCanvas } from "../src/app/shared/moodboard-canvas";
import { Moodboards } from "../src/app/features/moodboards";
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

test("canvas preserves negative and zero coordinates, with legacy layout fallback", () => {
  assert.deepEqual(itemPoint({ id: "a", canvas_x: -430, canvas_y: 0 }, 99), {
    x: -430,
    y: 0,
  });
  assert.deepEqual(itemPoint({ id: "b" }, 5), { x: 280, y: 310 });
});
test("drag distance accounts for zoom in every direction", () => {
  assert.deepEqual(movedPoint({ x: 10, y: 20 }, -80, 120, 0.5), {
    x: -150,
    y: 260,
  });
  assert.deepEqual(movedPoint({ x: 10, y: 20 }, 80, -120, 2), {
    x: 50,
    y: -40,
  });
});
test("zoom keeps the point under the cursor stationary", () => {
  const pan = { x: -200, y: 150 },
    cursor = { x: 320, y: 240 };
  const next = zoomAt(pan, cursor, 0.5, 1.25);
  assert.equal((cursor.x - next.x) / 1.25, (cursor.x - pan.x) / 0.5);
  assert.equal((cursor.y - next.y) / 1.25, (cursor.y - pan.y) / 0.5);
});
test("fit includes photos with negative coordinates on a phone viewport", () => {
  const points = [
    { x: -500, y: -300 },
    { x: 1200, y: 800 },
  ];
  const view = fitCanvas(points, 360, 480);
  for (const p of points) {
    assert.ok(p.x * view.zoom + view.pan.x >= 0);
    assert.ok(p.y * view.zoom + view.pan.y >= 0);
    assert.ok((p.x + 240) * view.zoom + view.pan.x <= 360);
    assert.ok((p.y + 270) * view.zoom + view.pan.y <= 480);
  }
  assert.equal(fitCanvas([], 360, 480).zoom, 1);
});
function canvas() {
  const changes: unknown[] = [];
  const opened: string[] = [];
  const page = Object.assign(
    Object.create(MoodboardCanvas.prototype) as MoodboardCanvas,
    {
      zoom: signal(0.5),
      pan: signal({ x: 40, y: 40 }),
      draft: signal(null),
      gesture: signal(null),
      busy: () => false,
      positioned: { emit: (value: unknown) => changes.push(value) },
      inspect: { emit: (id: string) => opened.push(id) },
      viewport: {
        nativeElement: {
          setPointerCapture: () => undefined,
          hasPointerCapture: () => false,
        },
      },
    },
  );
  const event = (x: number, y: number, pointerId = 1) =>
    ({
      clientX: x,
      clientY: y,
      pointerId,
      button: 0,
      preventDefault() {},
      stopPropagation() {},
    }) as PointerEvent;
  return { page, changes, opened, event };
}
test("tapping a photo opens its details while dragging it saves its position", () => {
  const { page, changes, opened, event } = canvas();
  const item = { ...demoData().inspirations[0], canvas_x: 0, canvas_y: 0 };
  page.startPhoto(event(100, 100), item, 0, true);
  page.move(event(101, 101));
  page.end(event(101, 101));
  assert.deepEqual(opened, [item.id]);
  assert.equal(changes.length, 0);
  page.startPhoto(event(100, 100), item, 0, true);
  page.move(event(180, 50));
  page.end(event(180, 50));
  assert.equal(opened.length, 1);
  assert.deepEqual(changes, [{ id: item.id, x: 160, y: -100 }]);
});
test("pointer photo movement saves once on release and ignores other pointers", () => {
  const { page, changes, event } = canvas();
  page.startPhoto(
    event(100, 100),
    { id: "photo", canvas_x: 0, canvas_y: 0 } as never,
    0,
  );
  page.move(event(300, 300, 2));
  assert.equal(page.draft(), null);
  page.move(event(50, 150));
  assert.deepEqual(page.draft()?.point, { x: -100, y: 100 });
  assert.equal(changes.length, 0);
  page.end(event(50, 150));
  assert.deepEqual(changes, [{ id: "photo", x: -100, y: 100 }]);
});
test("panning and cancelled drags never write photo coordinates", () => {
  const { page, changes, event } = canvas();
  page.startPan(event(0, 0));
  page.move(event(-20, 60));
  page.end(event(-20, 60));
  assert.deepEqual(page.pan(), { x: 20, y: 100 });
  page.startPhoto(event(0, 0), { id: "photo" } as never, 0);
  page.move(event(50, 50));
  page.cancel();
  page.end(event(50, 50));
  assert.equal(changes.length, 0);
});
test("new offscreen photos are framed automatically without changing saved positions", () => {
  const { page } = canvas();
  const first = { ...demoData().inspirations[0], canvas_x: 0, canvas_y: 0 };
  const items = signal([first]);
  Object.assign(page, {
    items,
    scope: () => "board",
    visibleIds: new Set(),
    viewScope: undefined,
    viewport: { nativeElement: { clientWidth: 360, clientHeight: 480 } },
  });
  page.syncView();
  items.set([
    first,
    { ...first, id: "new-photo", canvas_x: -500, canvas_y: 1800 },
  ]);
  page.syncView();
  for (const photo of items()) {
    const x = photo.canvas_x * page.zoom() + page.pan().x;
    const y = photo.canvas_y * page.zoom() + page.pan().y;
    assert.ok(x >= 0 && x + 240 * page.zoom() <= 360);
    assert.ok(y >= 0 && y + 270 * page.zoom() <= 480);
  }
  assert.equal(items()[1].canvas_y, 1800);
  page.pan.set({ x: -777, y: 99 });
  items.update((rows) => rows.map((i) => ({ ...i, name: "Updated title" })));
  page.syncView();
  assert.deepEqual(page.pan(), { x: -777, y: 99 });
});
function setup() {
  const s = new Store();
  s.demo.set(true);
  s.wedding.set(DEMO_WEDDING);
  s.data.set(demoData());
  const injector = Injector.create({
    providers: [
      { provide: Store, useValue: s },
      FormBuilder,
      Photos,
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: { get: () => null } } },
      },
      Moodboards,
    ],
  });
  return { s, page: injector.get(Moodboards), injector };
}
async function settled(s: Store) {
  while (s.busy()) await new Promise((r) => setTimeout(r, 0));
}
test("successful photo import clears filters hiding the newly added inspiration", async () => {
  const { s, page, injector } = setup();
  try {
    const board = s.data().moodboards[0];
    page.board.set(board.id);
    page.query.set("no-match");
    page.theme.set("unrelated");
    page.ceremony.set("other");
    const photos = injector.get(Photos);
    photos.upload = async (_file, id) => {
      await s.save("attachments", {
        inspiration_id: id,
        path: "test/photo.webp",
        thumbnail_path: "test/thumb.webp",
        caption: "Test",
        position: 0,
        is_cover: true,
        size_bytes: 10,
      });
    };
    const input = {
      files: [
        new File(["photo"], "nouvelle-photo.jpg", { type: "image/jpeg" }),
      ],
      value: "file",
    };
    await page.importImages({ target: input } as unknown as Event);
    assert.equal(s.error(), "");
    assert.equal(page.query(), "");
    assert.equal(page.theme(), "");
    assert.equal(page.ceremony(), "");
    assert.ok(page.canvasIdeas().some((i) => i.name === "nouvelle-photo"));
    assert.equal(input.value, "");
  } finally {
    injector.destroy();
  }
});
test("saving a position preserves all metadata, comments and photos; filtering does not move it", async () => {
  const { s, page, injector } = setup();
  try {
    const idea = s.data().inspirations[0];
    const before = structuredClone(idea),
      photos = structuredClone(s.data().attachments),
      comments = structuredClone(s.data().inspiration_comments);
    page.positionPhoto({ id: idea.id, x: -280, y: 640 });
    await settled(s);
    const after = s.data().inspirations.find((i) => i.id === idea.id)!;
    assert.equal(after.canvas_x, -280);
    assert.equal(after.canvas_y, 640);
    for (const key of ["name", "tags", "moodboard_id", "favorite"] as const)
      assert.deepEqual(after[key], before[key]);
    assert.deepEqual(s.data().attachments, photos);
    assert.deepEqual(s.data().inspiration_comments, comments);
    page.query.set(idea.name);
    assert.deepEqual(page.canvasPosition(after), { x: -280, y: 640 });
  } finally {
    injector.destroy();
  }
});
test("failed remote position save keeps the old layout and reports the error", async () => {
  const { s, page, injector } = setup();
  try {
    const idea = s.data().inspirations[0],
      before = structuredClone(idea);
    s.save = async () => {
      throw new Error("Connection unavailable");
    };
    page.positionPhoto({ id: idea.id, x: 700, y: 800 });
    await settled(s);
    assert.deepEqual(
      s.data().inspirations.find((i) => i.id === idea.id),
      before,
    );
    assert.match(s.error(), /Connection unavailable/);
  } finally {
    injector.destroy();
  }
});
test("invalid coordinates are rejected before writing and new photos do not overlap existing cards", () => {
  const { s, page, injector } = setup();
  try {
    const idea = s.data().inspirations[0],
      before = structuredClone(s.data());
    page.positionPhoto({ id: idea.id, x: NaN, y: 0 });
    assert.deepEqual(s.data(), before);
    page.positionPhoto({ id: idea.id, x: 1000001, y: 0 });
    assert.deepEqual(s.data(), before);
    const point = page.nextCanvasPosition(idea.moodboard_id ?? "");
    assert.ok(point.canvas_y >= page.canvasPosition(idea).y + 310);
  } finally {
    injector.destroy();
  }
});
