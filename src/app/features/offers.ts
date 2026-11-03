import { Component, inject, signal, computed } from "@angular/core";
import { RouterLink, Router } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { Gallery } from "../shared/gallery";
import { minor } from "../core/money";
@Component({
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Gallery],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">REPÉRER · RASSEMBLER · CHOISIR</span>
        <h1>Nos belles trouvailles</h1>
        <p>Une adresse, une photo, un coup de cœur. Gardons tout ici.</p>
      </div>
      <button class="primary" (click)="show.set(!show())">
        ＋ Ajouter une proposition
      </button>
    </div>
    @if (show()) {
      <section class="panel">
        <h2>Une nouvelle proposition</h2>
        <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
          <label
            >Besoin<select formControlName="requirement_id">
              <option value="">Choisir un besoin</option>
              @for (r of s.data().service_requirements; track r.id) {
                <option [value]="r.id">
                  {{ s.ceremonyName(r.ceremony_id) }} · {{ r.name }}
                </option>
              }
            </select></label
          ><label
            >Prestataire existant<select formControlName="provider_id">
              <option value="">Créer un prestataire</option>
              @for (p of s.data().providers; track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select></label
          ><label
            >Nom du prestataire / proposition<input
              formControlName="name" /></label
          ><label>Ville<input formControlName="city" /></label
          ><label
            >Prix<input inputmode="decimal" formControlName="amount" /></label
          ><label
            >Devise<select formControlName="currency">
              <option>MAD</option>
              <option>EUR</option>
            </select></label
          >
          <div class="form-actions">
            <button class="primary" [disabled]="form.invalid || s.busy()">
              Créer et ajouter les photos</button
            ><button type="button" (click)="show.set(false)">Annuler</button>
          </div>
        </form>
        @if (!s.data().service_requirements.length) {
          <a routerLink="/ceremonies">Commencez par créer un besoin →</a>
        }
      </section>
    }
    <div class="filters">
      <label class="search"
        ><span>⌕</span
        ><input
          aria-label="Rechercher une proposition"
          placeholder="Une villa, un traiteur, une ville…"
          (input)="query.set(value($event))" /></label
      ><select aria-label="Cérémonie" (change)="ceremony.set(value($event))">
        <option value="">Toutes les cérémonies</option>
        @for (c of s.data().ceremonies; track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }</select
      ><select aria-label="Catégorie" (change)="category.set(value($event))">
        <option value="">Toutes les catégories</option>
        @for (c of s.data().categories; track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }</select
      ><button
        [class.active]="favorites()"
        (click)="favorites.set(!favorites())"
      >
        ♡ Favoris
      </button>
    </div>
    <div class="section-heading">
      <small
        >{{ filtered().length }} propositions ·
        {{
          s.demo() ? "exemples fictifs" : "votre sélection personnelle"
        }}</small
      ><a routerLink="/comparaisons">Ouvrir le comparateur ⇆</a>
    </div>
    <div class="offer-grid">
      @for (o of filtered(); track o.id) {
        <article class="offer-card">
          <app-gallery [offerId]="o.id" [compact]="true" />
          <div class="offer-body">
            <div class="row between">
              <span class="eyebrow">{{
                s.categoryName(
                  s.requirement(o.requirement_id)?.category_id ?? ""
                )
              }}</span
              ><button
                class="icon-button"
                (click)="favorite(o.id, !o.favorite)"
                [attr.aria-label]="
                  o.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'
                "
              >
                {{ o.favorite ? "♥" : "♡" }}
              </button>
            </div>
            <h2>
              <a [routerLink]="['/prestations', o.id]">{{ o.name }}</a>
            </h2>
            <p class="hint">
              ⌖ {{ s.provider(o.provider_id)?.city || "Ville à préciser" }}
            </p>
            <div class="row between">
              <strong class="price"
                >{{ s.format(o.amount_minor, o.currency)
                }}<small> / {{ o.pricing }}</small></strong
              ><span class="pill">{{ o.status }}</span>
            </div>
            <a class="button full" [routerLink]="['/prestations', o.id]"
              >Découvrir la proposition →</a
            >
          </div>
        </article>
      } @empty {
        <div class="empty panel">
          <h2>Le début de vos recherches</h2>
          <p>Ajoutez une proposition ou ajustez les filtres.</p>
          <button (click)="show.set(true)">
            Ajouter notre première adresse
          </button>
        </div>
      }
    </div>`,
})
export class Offers {
  readonly s = inject(Store);
  private router = inject(Router);
  readonly show = signal(false);
  readonly query = signal("");
  readonly ceremony = signal("");
  readonly category = signal("");
  readonly favorites = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    requirement_id: ["", Validators.required],
    provider_id: [""],
    name: ["", Validators.required],
    city: [""],
    amount: ["0", Validators.required],
    currency: ["MAD"],
  });
  readonly filtered = computed(() =>
    this.s.data().provider_offers.filter((o) => {
      const r = this.s.requirement(o.requirement_id);
      return (
        (!this.ceremony() || r?.ceremony_id === this.ceremony()) &&
        (!this.category() || r?.category_id === this.category()) &&
        (!this.favorites() || o.favorite) &&
        `${o.name} ${this.s.provider(o.provider_id)?.city}`
          .toLowerCase()
          .includes(this.query().toLowerCase())
      );
    }),
  );
  value(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
  favorite(id: string, favorite: boolean) {
    void this.s.run(() => this.s.save("provider_offers", { id, favorite }));
  }
  save() {
    if (this.form.invalid) return;
    void this.s.run(async () => {
      const v = this.form.getRawValue();
      const amount_minor = minor(v.amount);
      let pid = v.provider_id;
      if (!pid) {
        const p = await this.s.save("providers", {
          name: v.name,
          city: v.city,
          phone: "",
          whatsapp: "",
          instagram: "",
          website: "",
          address: "",
          maps_url: "",
        });
        pid = p.id;
      }
      const o = await this.s.save("provider_offers", {
        provider_id: pid,
        requirement_id: v.requirement_id,
        name: v.name,
        description: "",
        amount_minor,
        currency: v.currency === "EUR" ? "EUR" : "MAD",
        pricing: "forfait",
        status: "À contacter",
        included: "",
        excluded: "",
        conditions: "",
        availability: "",
        pros: "",
        cons: "",
        favorite: false,
        criteria: Object.fromEntries(
          (
            this.s
              .data()
              .categories.find(
                (c) =>
                  c.id === this.s.requirement(v.requirement_id)?.category_id,
              )?.criteria ?? []
          ).map((key) => [key, ""]),
        ),
      });
      await this.router.navigate(["/prestations", o.id]);
    });
  }
}
