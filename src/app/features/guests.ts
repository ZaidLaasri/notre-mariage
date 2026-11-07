import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { csvCell, parseCsv, duplicateKey } from "../core/csv";
import { Guest } from "../core/models";
import { FocusTrap } from "../shared/focus-trap";
interface GuestEntry {
  name: string;
  household: string;
  side: string;
  phone: string;
  diet: string;
  is_child: boolean;
}
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, FocusTrap],
  templateUrl: "./guests.html",
})
export class Guests {
  readonly s = inject(Store);
  readonly query = signal("");
  readonly ceremony = signal("");
  readonly side = signal("");
  readonly show = signal(false);
  readonly editing = signal("");
  readonly deleting = signal<Guest | null>(null);
  readonly lastHousehold = signal("");
  @ViewChild("guestEditor") private guestEditor?: ElementRef<HTMLElement>;
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ["", Validators.required],
    household_id: ["", Validators.required],
    household: [""],
    side: ["Commun"],
    phone: [""],
    diet: [""],
    is_child: [false],
  });
  readonly householdOptions = computed(() =>
    [...this.s.data().guest_households].sort((a, b) =>
      a.name.localeCompare(b.name, "fr"),
    ),
  );
  readonly confirmed = computed(
    () =>
      this.s
        .data()
        .ceremony_invitations.filter(
          (i) =>
            i.status === "Confirmée" &&
            (!this.ceremony() || i.ceremony_id === this.ceremony()),
        ).length,
  );
  readonly households = computed(() =>
    this.s
      .data()
      .guest_households.filter(
        (h) =>
          (!this.side() || h.side === this.side()) && this.people(h.id).length,
      ),
  );
  people(id: string) {
    const h = this.s.data().guest_households.find((h) => h.id === id);
    return this.s
      .data()
      .guests.filter(
        (g) =>
          g.household_id === id &&
          `${g.name} ${h?.name}`
            .toLowerCase()
            .includes(this.query().toLowerCase()) &&
          (!this.ceremony() ||
            this.s
              .data()
              .ceremony_invitations.some(
                (i) => i.guest_id === g.id && i.ceremony_id === this.ceremony(),
              )),
      );
  }
  value(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
  status(guest: string, ceremony: string) {
    return (
      this.s
        .data()
        .ceremony_invitations.find(
          (i) => i.guest_id === guest && i.ceremony_id === ceremony,
        )?.status ?? ""
    );
  }
  invite(guest_id: string, ceremony_id: string, e: Event) {
    const status = this.value(e);
    void this.s.run(async () => {
      const old = this.s
        .data()
        .ceremony_invitations.find(
          (i) => i.guest_id === guest_id && i.ceremony_id === ceremony_id,
        );
      if (!status) {
        if (old) await this.s.remove("ceremony_invitations", old.id);
      } else
        await this.s.save("ceremony_invitations", {
          id: old?.id,
          guest_id,
          ceremony_id,
          status,
          table_name: old?.table_name ?? "",
        });
    });
  }
  selectedHousehold() {
    return this.s
      .data()
      .guest_households.find(
        (h) => h.id === this.form.controls.household_id.value,
      );
  }
  selectHousehold(id: string) {
    this.form.controls.household_id.setValue(id);
    this.form.controls.household.setValidators(
      id === "new" ? [Validators.required] : [],
    );
    this.form.controls.household.updateValueAndValidity();
  }
  edit(guest?: Guest) {
    this.editing.set(guest?.id ?? "");
    const household_id =
      guest?.household_id ??
      (this.s.data().guest_households.some((h) => h.id === this.lastHousehold())
        ? this.lastHousehold()
        : this.s.data().guest_households.length
          ? ""
          : "new");
    this.form.reset({
      name: guest?.name ?? "",
      household_id,
      household: "",
      side: "Commun",
      phone: "",
      diet: guest?.diet ?? "",
      is_child: guest?.is_child ?? false,
    });
    this.selectHousehold(household_id);
    this.show.set(true);
    setTimeout(() => {
      this.guestEditor?.nativeElement.scrollIntoView({ block: "start" });
      this.guestEditor?.nativeElement
        .querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
    }, 0);
  }
  cancelEdit() {
    this.show.set(false);
    this.editing.set("");
    this.form.reset();
    this.selectHousehold("");
  }
  askDelete(guest: Guest) {
    this.deleting.set({ ...guest });
  }
  cancelDelete() {
    if (!this.s.busy()) this.deleting.set(null);
  }
  confirmDelete() {
    const guest = this.deleting();
    if (!guest) return;
    void this.s.run(async () => {
      // PostgreSQL cascades ceremony invitations in the same DELETE statement.
      await this.s.remove("guests", guest.id);
      this.s.data.update((d) => ({
        ...d,
        ceremony_invitations: d.ceremony_invitations.filter(
          (i) => i.guest_id !== guest.id,
        ),
      }));
      this.s.persist();
      if (this.editing() === guest.id) this.cancelEdit();
      this.deleting.set(null);
    }, "Invité supprimé.");
  }
  async add(
    v: GuestEntry,
    editingId?: string,
    householdId?: string,
  ): Promise<boolean> {
    if (!v.name.trim()) throw new Error("Indiquez le nom de l’invité.");
    if (editingId && !this.s.data().guests.some((g) => g.id === editingId))
      throw new Error("Cet invité n’est plus disponible. Actualisez la liste.");
    let h = householdId
      ? this.s.data().guest_households.find((h) => h.id === householdId)
      : this.s
          .data()
          .guest_households.find(
            (h) =>
              h.name.trim().toLowerCase() === v.household.trim().toLowerCase(),
          );
    if (householdId && !h)
      throw new Error("Le foyer sélectionné n’est plus disponible.");
    const householdName = h?.name ?? v.household.trim();
    if (!householdName) throw new Error("Indiquez le nom du nouveau foyer.");
    if (
      this.s
        .data()
        .guests.some(
          (g) =>
            g.id !== editingId &&
            duplicateKey(
              g.name,
              this.s
                .data()
                .guest_households.find((h) => h.id === g.household_id)?.name ??
                "",
            ) === duplicateKey(v.name, householdName),
        )
    )
      return false;
    if (!h)
      h = await this.s.save("guest_households", {
        name: householdName,
        side: v.side,
        phone: v.phone,
        notes: "",
      });
    await this.s.save("guests", {
      id: editingId || undefined,
      household_id: h.id,
      name: v.name.trim(),
      diet: v.diet,
      is_child: v.is_child,
    });
    this.lastHousehold.set(h.id);
    return true;
  }
  save() {
    if (this.form.invalid) return;
    void this.s.run(async () => {
      const { household_id, ...v } = this.form.getRawValue();
      if (
        !(await this.add(
          v,
          this.editing() || undefined,
          household_id === "new" ? undefined : household_id,
        ))
      )
        throw new Error("Cette personne figure déjà dans ce foyer.");
      this.cancelEdit();
    }, "Invité enregistré.");
  }
  exportCsv() {
    const rows = this.s.data().guests.map((g) => {
      const h = this.s
        .data()
        .guest_households.find((h) => h.id === g.household_id);
      return [
        g.name,
        h?.name ?? "",
        h?.side ?? "",
        h?.phone ?? "",
        g.is_child ? "oui" : "non",
        g.diet,
      ]
        .map(csvCell)
        .join(",");
    });
    this.s.download(
      "\uFEFFnom,foyer,famille,telephone,enfant,regime\r\n" + rows.join("\r\n"),
      "invites.csv",
      "text/csv;charset=utf-8",
    );
  }
  importCsv(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void this.s.run(async () => {
      if (file.size > 2 * 1024 * 1024) throw new Error("CSV limité à 2 Mo.");
      const rows = parseCsv(await file.text());
      const header = rows.shift()?.map((c) => c.toLowerCase().trim());
      if (header?.join(",") !== "nom,foyer,famille,telephone,enfant,regime")
        throw new Error("En-têtes CSV invalides. Utilisez le format exporté.");
      if (
        rows.length > 2000 ||
        rows.some((r) => r.length !== 6 || !r[0]?.trim() || !r[1]?.trim())
      )
        throw new Error(
          "CSV invalide : nom et foyer requis, six colonnes, 2 000 lignes maximum.",
        );
      let added = 0;
      for (const r of rows)
        if (
          await this.add({
            name: r[0],
            household: r[1],
            side: ["Mariée", "Marié", "Commun"].includes(r[2])
              ? r[2]
              : "Commun",
            phone: r[3],
            is_child: r[4].toLowerCase() === "oui",
            diet: r[5],
          })
        )
          added++;
      this.s.notice.set(
        `${added} invités ajoutés, ${rows.length - added} doublons ignorés.`,
      );
      input.value = "";
    });
  }
}
