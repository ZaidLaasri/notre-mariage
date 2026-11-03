import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { minor } from "../core/money";
import { Ceremony } from "../core/models";
import { RouterLink } from "@angular/router";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">DEUX MOMENTS, UNE HISTOIRE</span>
        <h1>Nos cérémonies</h1>
        <p>
          Des traditions qui nous ressemblent, entièrement personnalisables.
        </p>
      </div>
      <button class="primary" (click)="edit()">＋ Une cérémonie</button>
    </div>
    <div class="ceremony-grid">
      @for (c of s.data().ceremonies; track c.id) {
        <article class="panel">
          <span class="eyebrow">{{ c.date || "DATE À DÉFINIR" }}</span>
          <h2>{{ c.name }}</h2>
          <p>Budget : {{ s.format(c.budget_minor) }}</p>
          <button (click)="edit(c)">Modifier</button>
          <a
            class="button"
            routerLink="/timeline"
            [queryParams]="{ ceremony: c.id }"
            >Timeline — Jour J →</a
          >
          <h3>Nos besoins</h3>
          @for (r of needs(c.id); track r.id) {
            <div class="list-row">
              <span
                >{{ r.name
                }}<small>{{ s.categoryName(r.category_id) }}</small></span
              ><button (click)="removeNeed(r.id)">Supprimer</button>
            </div>
          } @empty {
            <p class="hint">Ajoutez votre premier besoin ci-dessous.</p>
          }
        </article>
      }
    </div>
    @if (show()) {
      <section class="panel">
        <h2>{{ editing ? "Modifier la cérémonie" : "Nouvelle cérémonie" }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
          <label>Nom<input formControlName="name" /></label
          ><label>Date<input type="date" formControlName="date" /></label
          ><label
            >Budget en MAD<input formControlName="budget" inputmode="decimal"
          /></label>
          <div class="form-actions">
            <button class="primary" [disabled]="form.invalid || s.busy()">
              Enregistrer</button
            ><button type="button" (click)="show.set(false)">Annuler</button>
          </div>
        </form>
      </section>
    }
    <section class="panel">
      <h2>De quoi avons-nous besoin ?</h2>
      <p class="hint">
        Lieu, repas, bijoux ou accueil des familles : ajoutez uniquement ce qui
        vous convient.
      </p>
      <form [formGroup]="needForm" (ngSubmit)="addNeed()" class="form-grid">
        <label
          >Cérémonie<select formControlName="ceremony_id">
            <option value="">Choisir</option>
            @for (c of s.data().ceremonies; track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select></label
        ><label
          >Catégorie<select formControlName="category_id">
            <option value="">Choisir</option>
            @for (c of s.data().categories; track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select></label
        ><label
          >Besoin<input
            formControlName="name"
            placeholder="Ex. Un traiteur pour 40 personnes" /></label
        ><button class="primary" [disabled]="needForm.invalid || s.busy()">
          Ajouter le besoin
        </button>
      </form>
    </section>`,
})
export class Ceremonies {
  readonly s = inject(Store);
  private fb = inject(FormBuilder);
  readonly show = signal(false);
  editing = "";
  readonly form = this.fb.nonNullable.group({
    name: ["", Validators.required],
    date: [""],
    budget: ["0", Validators.required],
  });
  readonly needForm = this.fb.nonNullable.group({
    ceremony_id: ["", Validators.required],
    category_id: ["", Validators.required],
    name: ["", Validators.required],
  });
  needs(id: string) {
    return this.s
      .data()
      .service_requirements.filter((r) => r.ceremony_id === id);
  }
  edit(c?: Ceremony) {
    this.editing = c?.id ?? "";
    this.form.setValue({
      name: c?.name ?? "",
      date: c?.date ?? "",
      budget: String((c?.budget_minor ?? 0) / 100),
    });
    this.show.set(true);
  }
  save() {
    if (this.form.invalid) return;
    void this.s.run(async () => {
      const v = this.form.getRawValue();
      await this.s.save("ceremonies", {
        id: this.editing || undefined,
        name: v.name.trim(),
        date: v.date || null,
        budget_minor: minor(v.budget),
      });
      this.show.set(false);
    }, "Cérémonie enregistrée.");
  }
  addNeed() {
    if (this.needForm.invalid) return;
    void this.s.run(async () => {
      await this.s.save("service_requirements", this.needForm.getRawValue());
      this.needForm.controls.name.reset();
    }, "Besoin ajouté.");
  }
  removeNeed(id: string) {
    if (this.s.data().provider_offers.some((o) => o.requirement_id === id)) {
      this.s.error.set(
        "Ce besoin contient des offres ; conservez-le ou déplacez les offres avant suppression.",
      );
      return;
    }
    void this.s.run(() => this.s.remove("service_requirements", id));
  }
}
