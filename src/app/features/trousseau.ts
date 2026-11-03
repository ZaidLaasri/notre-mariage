import { Component, computed, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { Photos } from "../core/photos";
import {
  JHAZ_STATUSES,
  TrousseauCategory,
  TrousseauItem,
  TrousseauSet,
} from "../core/models";
import { JHAZ_CATEGORIES } from "../core/catalogue-templates";
import { convert, minor } from "../core/money";
import { Gallery } from "../shared/gallery";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, Gallery],
  templateUrl: "./trousseau.html",
})
export class Trousseau {
  readonly s = inject(Store);
  private fb = inject(FormBuilder);
  private photos = inject(Photos);
  readonly statuses = JHAZ_STATUSES;
  readonly show = signal(false);
  readonly editing = signal("");
  readonly query = signal("");
  readonly category = signal("");
  readonly status = signal("");
  readonly setFilter = signal("");
  readonly removing = signal("");
  readonly manage = signal(false);
  readonly items = computed(() =>
    this.s
      .data()
      .trousseau_items.filter(
        (i) =>
          (!this.category() || i.category_id === this.category()) &&
          (!this.status() || i.status === this.status()) &&
          (!this.setFilter() || i.set_id === this.setFilter()) &&
          `${i.name} ${i.description} ${i.notes} ${i.responsible}`
            .toLowerCase()
            .includes(this.query().toLowerCase()),
      ),
  );
  readonly totals = computed(() => {
    const d = this.s.data(),
      items = d.trousseau_items;
    const ids = new Set(
      items.flatMap((i) => (i.expense_id ? [i.expense_id] : [])),
    );
    const expenses = d.expenses.filter((e) => ids.has(e.id));
    return {
      planned: items.reduce(
        (sum, i) => sum + this.mad(i.unit_minor * i.quantity, i.currency),
        0,
      ),
      committed: expenses.reduce(
        (sum, e) => sum + this.mad(e.amount_minor, e.currency),
        0,
      ),
      paid: d.payments
        .filter((p) => ids.has(p.expense_id))
        .reduce(
          (sum, p) =>
            sum +
            this.mad(
              p.amount_minor,
              expenses.find((e) => e.id === p.expense_id)!.currency,
            ),
          0,
        ),
      prepared: items.filter((i) => i.status === "Préparé").length,
      count: items.length,
    };
  });
  readonly itemForm = this.fb.nonNullable.group({
    name: ["", Validators.required],
    category_id: ["", Validators.required],
    set_id: [""],
    provider_id: [""],
    description: [""],
    notes: [""],
    quantity: [
      1,
      [
        Validators.required,
        Validators.min(1),
        Validators.pattern(/^[1-9]\d*$/),
      ],
    ],
    amount: ["0", Validators.required],
    currency: ["MAD"],
    responsible: ["Commun"],
    status: ["À acheter"],
  });
  readonly categoryForm = this.fb.nonNullable.group({
    id: [""],
    name: ["", Validators.required],
    budget: ["0", Validators.required],
  });
  readonly setForm = this.fb.nonNullable.group({
    id: [""],
    name: ["", Validators.required],
    notes: [""],
  });
  readonly expenseForm = this.fb.nonNullable.group({
    item_id: ["", Validators.required],
    expense_id: [""],
    ceremony_id: [""],
  });
  value(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
  mad(amount: number, currency: "MAD" | "EUR") {
    const w = this.s.wedding();
    return convert(
      amount,
      currency,
      w?.eur_mad_numerator ?? 108,
      w?.eur_mad_denominator ?? 10,
    );
  }
  categoryName(id: string) {
    return (
      this.s.data().trousseau_categories.find((c) => c.id === id)?.name ?? ""
    );
  }
  expense(id: string | null) {
    return this.s.data().expenses.find((e) => e.id === id);
  }
  categoryProgress(id: string) {
    const items = this.s
      .data()
      .trousseau_items.filter((i) => i.category_id === id);
    return `${items.filter((i) => i.status === "Préparé").length} / ${items.length}`;
  }
  edit(item?: TrousseauItem) {
    this.editing.set(item?.id ?? "");
    this.itemForm.reset({
      name: "",
      category_id: this.category(),
      set_id: "",
      provider_id: "",
      description: "",
      notes: "",
      quantity: 1,
      amount: "0",
      currency: "MAD",
      responsible: "Commun",
      status: "À acheter",
    });
    if (item)
      this.itemForm.patchValue({
        ...item,
        set_id: item.set_id ?? "",
        provider_id: item.provider_id ?? "",
        amount: String(item.unit_minor / 100),
      });
    this.show.set(true);
  }
  save() {
    if (this.itemForm.invalid) return;
    void this.s.run(async () => {
      const { amount, ...v } = this.itemForm.getRawValue();
      const unit_minor = minor(amount);
      if (
        !Number.isSafeInteger(unit_minor * v.quantity) ||
        unit_minor * v.quantity > 900000000000
      )
        throw new Error(
          "Le total dépasse la capacité monétaire prise en charge.",
        );
      const old = this.s
        .data()
        .trousseau_items.find((i) => i.id === this.editing());
      await this.s.save("trousseau_items", {
        ...v,
        id: this.editing() || undefined,
        name: v.name.trim(),
        unit_minor,
        currency: v.currency === "EUR" ? "EUR" : "MAD",
        status: v.status as TrousseauItem["status"],
        provider_id: v.provider_id || null,
        set_id: v.set_id || null,
        expense_id: old?.expense_id ?? null,
      });
      this.show.set(false);
    }, "Article enregistré.");
  }
  setStatus(item: TrousseauItem, e: Event) {
    void this.s.run(() =>
      this.s.save("trousseau_items", {
        id: item.id,
        status: this.value(e) as TrousseauItem["status"],
      }),
    );
  }
  editCategory(c?: TrousseauCategory) {
    this.categoryForm.setValue({
      id: c?.id ?? "",
      name: c?.name ?? "",
      budget: String((c?.budget_minor ?? 0) / 100),
    });
  }
  saveCategory() {
    if (this.categoryForm.invalid) return;
    void this.s.run(async () => {
      const v = this.categoryForm.getRawValue();
      await this.s.save("trousseau_categories", {
        id: v.id || undefined,
        name: v.name.trim(),
        budget_minor: minor(v.budget),
      });
      this.editCategory();
    }, "Catégorie enregistrée.");
  }
  removeCategory(c: TrousseauCategory) {
    void this.s.run(async () => {
      if (this.s.data().trousseau_items.some((i) => i.category_id === c.id))
        throw new Error(
          "Déplacez les articles avant de supprimer cette catégorie.",
        );
      await this.s.remove("trousseau_categories", c.id);
    });
  }
  seed() {
    void this.s.run(async () => {
      for (const name of JHAZ_CATEGORIES)
        if (!this.s.data().trousseau_categories.some((c) => c.name === name))
          await this.s.save("trousseau_categories", { name, budget_minor: 0 });
    }, "Modèle facultatif ajouté.");
  }
  editSet(set?: TrousseauSet) {
    this.setForm.setValue({
      id: set?.id ?? "",
      name: set?.name ?? "",
      notes: set?.notes ?? "",
    });
  }
  saveSet() {
    if (this.setForm.invalid) return;
    void this.s.run(async () => {
      const v = this.setForm.getRawValue();
      await this.s.save("trousseau_sets", {
        id: v.id || undefined,
        name: v.name.trim(),
        notes: v.notes,
      });
      this.editSet();
    }, "Ensemble enregistré.");
  }
  removeSet(set: TrousseauSet) {
    void this.s.run(async () => {
      if (this.s.data().trousseau_items.some((i) => i.set_id === set.id))
        throw new Error(
          "Retirez les articles de cet ensemble avant suppression.",
        );
      for (const photo of this.photos.list(set.id, "trousseau_set"))
        await this.photos.remove(photo, "trousseau_set");
      await this.s.remove("trousseau_sets", set.id);
    });
  }
  link(item: TrousseauItem) {
    this.expenseForm.reset({
      item_id: item.id,
      expense_id: item.expense_id ?? "",
      ceremony_id: "",
    });
  }
  availableExpenses() {
    const current = this.expenseForm.controls.item_id.value;
    return this.s
      .data()
      .expenses.filter(
        (e) =>
          !this.s
            .data()
            .trousseau_items.some(
              (i) => i.id !== current && i.expense_id === e.id,
            ),
      );
  }
  linkExpense() {
    const v = this.expenseForm.getRawValue();
    if (!v.item_id) return;
    void this.s.run(async () => {
      await this.s.save("trousseau_items", {
        id: v.item_id,
        expense_id: v.expense_id || null,
      });
      this.expenseForm.reset();
    }, "Lien mis à jour ; aucune nouvelle dépense créée.");
  }
  engage() {
    const v = this.expenseForm.getRawValue();
    if (!v.item_id || !v.ceremony_id) {
      this.s.error.set(
        "Choisissez le budget de cérémonie auquel imputer cet achat.",
      );
      return;
    }
    void this.s.run(async () => {
      await this.s.engageTrousseau(v.item_id, v.ceremony_id);
      this.expenseForm.reset();
    }, "Engagement enregistré une seule fois dans le budget.");
  }
  remove(item: TrousseauItem) {
    void this.s.run(async () => {
      for (const photo of this.photos.list(item.id, "trousseau_item"))
        await this.photos.remove(photo, "trousseau_item");
      await this.s.remove("trousseau_items", item.id);
      this.removing.set("");
    }, "Article supprimé. Les dépenses et paiements liés sont conservés.");
  }
}
