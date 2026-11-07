import "@angular/compiler";
import { Injector } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Guests } from "../src/app/features/guests";
import { Store } from "../src/app/core/store";
import { demoData, DEMO_WEDDING } from "../src/app/core/demo";
import { parseCsv } from "../src/app/core/csv";
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
    providers: [{ provide: Store, useValue: s }, FormBuilder, Guests],
  });
  return { s, page: injector.get(Guests), injector };
}
async function settled(s: Store) {
  while (s.busy()) await new Promise((r) => setTimeout(r, 0));
}
test("existing household dropdown adds a guest without retyping or changing household details", async () => {
  const { s, page, injector } = setup();
  try {
    const before = structuredClone(s.data().guest_households),
      count = s.data().guests.length;
    page.edit();
    page.selectHousehold("h0");
    page.form.patchValue({ name: "Nouvelle personne", diet: "Végétarien" });
    assert.equal(page.form.valid, true);
    page.save();
    await settled(s);
    assert.equal(s.error(), "");
    assert.equal(s.data().guests.length, count + 1);
    assert.equal(s.data().guests.at(-1)?.household_id, "h0");
    assert.deepEqual(s.data().guest_households, before);
    page.edit();
    assert.equal(page.form.controls.household_id.value, "h0");
  } finally {
    injector.destroy();
  }
});
test("new household validates its name and becomes selectable after creation", async () => {
  const { s, page, injector } = setup();
  try {
    page.edit();
    page.selectHousehold("new");
    page.form.controls.name.setValue("Nouvel invité");
    assert.equal(page.form.invalid, true);
    page.form.patchValue({
      household: "Famille nouvelle",
      side: "Mariée",
      phone: "0600000000",
    });
    page.save();
    await settled(s);
    assert.equal(s.error(), "");
    const h = s
      .data()
      .guest_households.find((h) => h.name === "Famille nouvelle")!;
    assert.ok(h);
    assert.equal(h.phone, "0600000000");
    assert.ok(page.householdOptions().some((x) => x.id === h.id));
    assert.equal(s.data().guests.at(-1)?.household_id, h.id);
  } finally {
    injector.destroy();
  }
});
test("editing and moving a guest preserves identity and ceremony invitation statuses/tables", async () => {
  const { s, page, injector } = setup();
  try {
    const guest = s.data().guests[0];
    const invites = structuredClone(s.data().ceremony_invitations),
      count = s.data().guests.length;
    page.edit(guest);
    assert.equal(page.form.controls.household_id.value, guest.household_id);
    page.selectHousehold("h1");
    page.form.patchValue({
      name: "Nom corrigé",
      diet: "Sans gluten",
      is_child: true,
    });
    page.save();
    await settled(s);
    assert.equal(s.error(), "");
    const edited = s.data().guests.find((g) => g.id === guest.id)!;
    assert.equal(edited.household_id, "h1");
    assert.equal(edited.name, "Nom corrigé");
    assert.equal(edited.diet, "Sans gluten");
    assert.equal(edited.is_child, true);
    assert.equal(s.data().guests.length, count);
    assert.deepEqual(s.data().ceremony_invitations, invites);
  } finally {
    injector.destroy();
  }
});
test("duplicate detection rejects moving a namesake to the same household without mutation", async () => {
  const { s, page, injector } = setup();
  try {
    const source = s.data().guests[0],
      other = s.data().guests[2];
    page.edit(source);
    page.selectHousehold(other.household_id);
    page.form.controls.name.setValue(other.name);
    const before = JSON.stringify(s.data());
    page.save();
    await settled(s);
    assert.match(s.error(), /déjà/);
    assert.equal(JSON.stringify(s.data()), before);
  } finally {
    injector.destroy();
  }
});
test("cancelling editing or deletion changes no guest data", () => {
  const { s, page, injector } = setup();
  try {
    const before = JSON.stringify(s.data());
    page.edit(s.data().guests[0]);
    page.form.controls.name.setValue("Unsaved");
    page.cancelEdit();
    page.askDelete(s.data().guests[0]);
    page.cancelDelete();
    assert.equal(page.deleting(), null);
    assert.equal(JSON.stringify(s.data()), before);
  } finally {
    injector.destroy();
  }
});
test("deleting guest removes only their invitations and retains household and other people", async () => {
  const { s, page, injector } = setup();
  try {
    const guest = s.data().guests[0];
    const others = structuredClone(
        s.data().guests.filter((g) => g.id !== guest.id),
      ),
      invites = structuredClone(
        s.data().ceremony_invitations.filter((i) => i.guest_id !== guest.id),
      ),
      households = structuredClone(s.data().guest_households);
    page.askDelete(guest);
    page.confirmDelete();
    await settled(s);
    assert.equal(s.error(), "");
    assert.deepEqual(s.data().guests, others);
    assert.deepEqual(s.data().ceremony_invitations, invites);
    assert.deepEqual(s.data().guest_households, households);
    assert.equal(page.deleting(), null);
  } finally {
    injector.destroy();
  }
});
test("failed remote deletion does not hide guest or erase invitation state", async () => {
  const { s, page, injector } = setup();
  try {
    const guest = s.data().guests[0],
      before = JSON.stringify(s.data());
    s.remove = async () => {
      throw new Error("Network unavailable");
    };
    page.askDelete(guest);
    page.confirmDelete();
    await settled(s);
    assert.equal(s.error(), "Network unavailable");
    assert.equal(JSON.stringify(s.data()), before);
    assert.equal(page.deleting()?.id, guest.id);
  } finally {
    injector.destroy();
  }
});
test("CSV household reuse and duplicate detection remain compatible with the dropdown", async () => {
  const { s, page, injector } = setup();
  try {
    const before = structuredClone(s.data().guest_households),
      person = s.data().guests[0],
      h = s.data().guest_households.find((h) => h.id === person.household_id)!;
    const v = {
      name: person.name,
      household: h.name,
      side: "Commun",
      phone: "different",
      is_child: false,
      diet: "",
    };
    assert.equal(await page.add(v), false);
    assert.equal(await page.add({ ...v, name: "Imported person" }), true);
    assert.deepEqual(s.data().guest_households, before);
    let csv = "";
    s.download = (content) => {
      csv = String(content);
    };
    page.exportCsv();
    const rows = parseCsv(csv);
    assert.equal(rows.length, s.data().guests.length + 1);
    assert.ok(
      rows.some((row) => row[0] === "Imported person" && row[1] === h.name),
    );
  } finally {
    injector.destroy();
  }
});
