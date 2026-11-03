import { Component, inject, computed, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { Gallery } from "../shared/gallery";
import { OfferSpecialization } from "../shared/offer-specialization";
import { minor } from "../core/money";
import { STATUSES, Offer } from "../core/models";
@Component({
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Gallery, OfferSpecialization],
  template: `<a routerLink="/prestations" class="back">← Nos propositions</a>
    @if (offer(); as o) {
      <div class="page-heading">
        <div>
          <span class="eyebrow">{{
            s.ceremonyName(s.requirement(o.requirement_id)?.ceremony_id ?? null)
          }}</span>
          <h1>{{ o.name }}</h1>
          <p>
            {{ s.provider(o.provider_id)?.city }} ·
            {{ s.requirement(o.requirement_id)?.name }}
          </p>
        </div>
        <a routerLink="/comparaisons" class="button primary">Comparer ⇆</a>
      </div>
      <div class="detail-grid">
        <section class="panel">
          <app-gallery [offerId]="o.id" [editable]="true" />
        </section>
        <section class="panel">
          <span class="eyebrow">LA PROPOSITION EN DÉTAIL</span>
          <h2>
            {{ s.format(o.amount_minor, o.currency) }}
            <small>/ {{ o.pricing }}</small>
          </h2>
          <span class="pill">{{ o.status }}</span>
          <p>{{ o.description || "Ajoutez vos premières impressions." }}</p>
          <h3>Compris dans la prestation</h3>
          <p>{{ o.included || "À préciser" }}</p>
          <h3>En supplément</h3>
          <p>{{ o.excluded || "À préciser" }}</p>
          <h3>Conditions et disponibilité</h3>
          <p>
            {{ o.conditions || "À confirmer" }} ·
            {{ o.availability || "Disponibilité à confirmer" }}
          </p>
          <button (click)="edit(o)">Modifier la proposition</button>
          <div class="row wrap">
            <button class="primary" (click)="select(o)">
              {{
                s.requirement(o.requirement_id)?.selected_offer_id === o.id
                  ? "Revenir sur notre choix"
                  : "Retenir cette proposition"
              }}</button
            ><button (click)="book(o)" [disabled]="reserved()">
              {{
                reserved()
                  ? "Réservation enregistrée"
                  : "Enregistrer une réservation"
              }}
            </button>
          </div>
          @if (reserved()) {
            <button (click)="cancelBooking(o)">Annuler la réservation</button>
          }
          <div class="row wrap">
            @if (s.provider(o.provider_id)?.phone; as phone) {
              <a class="button" [href]="'tel:' + phone">Appeler</a>
            }
            @if (s.provider(o.provider_id)?.instagram; as instagram) {
              <a
                class="button"
                [href]="instagram"
                target="_blank"
                rel="noopener noreferrer"
                >Instagram ↗</a
              >
            }
            @if (s.provider(o.provider_id)?.maps_url; as maps) {
              <a
                class="button"
                [href]="maps"
                target="_blank"
                rel="noopener noreferrer"
                >Localisation ↗</a
              >
            }
          </div>
          <small class="hint"
            >Sélection et réservation n’enregistrent aucun paiement.</small
          >
        </section>
      </div>
      <app-offer-specialization [offer]="o" />
      @if (editing()) {
        <section class="panel">
          <h2>Modifier les informations</h2>
          <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
            <label>Nom<input formControlName="name" /></label
            ><label
              >Prix<input formControlName="amount" inputmode="decimal" /></label
            ><label
              >Devise<select formControlName="currency">
                <option>MAD</option>
                <option>EUR</option>
              </select></label
            ><label
              >Tarification<select formControlName="pricing">
                <option value="forfait">Forfait</option>
                <option value="personne">Par personne</option>
                <option value="article">Par article</option>
              </select></label
            ><label
              >Suivi<select formControlName="status">
                @for (status of statuses; track status) {
                  <option>{{ status }}</option>
                }
              </select></label
            ><label>Disponibilité<input formControlName="availability" /></label
            ><label
              >Description<textarea
                formControlName="description"
              ></textarea></label
            ><label
              >Inclus<textarea formControlName="included"></textarea></label
            ><label
              >Exclus / options<textarea
                formControlName="excluded"
              ></textarea></label
            ><label
              >Paiement / annulation<textarea
                formControlName="conditions"
              ></textarea></label
            ><label>Avantages<textarea formControlName="pros"></textarea></label
            ><label
              >Inconvénients<textarea formControlName="cons"></textarea></label
            ><label
              >Critères personnalisés (un par ligne : nom = valeur)<textarea
                formControlName="criteria"
                placeholder="Capacité = 120"
              ></textarea>
            </label>
            <div class="form-actions">
              <button class="primary" [disabled]="form.invalid || s.busy()">
                Enregistrer</button
              ><button type="button" (click)="editing.set(false)">
                Annuler
              </button>
            </div>
          </form>
        </section>
      }
      <div class="detail-grid">
        <section class="panel">
          <h2>Le contact</h2>
          <form
            [formGroup]="contact"
            (ngSubmit)="saveContact()"
            class="form-grid"
          >
            <label>Nom<input formControlName="name" /></label
            ><label>Ville<input formControlName="city" /></label
            ><label>Téléphone<input type="tel" formControlName="phone" /></label
            ><label
              >WhatsApp<input type="tel" formControlName="whatsapp" /></label
            ><label
              >Instagram (URL https)<input
                formControlName="instagram"
                type="url" /></label
            ><label
              >Site (URL https)<input
                formControlName="website"
                type="url" /></label
            ><label>Adresse<input formControlName="address" /></label
            ><label
              >Google Maps (URL https)<input
                formControlName="maps_url"
                type="url" /></label
            ><button class="primary" [disabled]="contact.invalid || s.busy()">
              Enregistrer le contact
            </button>
          </form>
        </section>
        <section class="panel">
          <h2>Nos avis, chacun le sien</h2>
          <p class="hint">
            Votre avis personnel est distinct de votre décision commune.
          </p>
          @for (r of reviews(); track r.id) {
            <div class="review">
              <strong
                >{{
                  r.user_id === s.userId() ? "Mon avis" : "L’avis de ma moitié"
                }}
                · {{ r.rating }} / 5</strong
              >
              <p>{{ r.comment }}</p>
            </div>
          }
          <form [formGroup]="review" (ngSubmit)="saveReview()">
            <label
              >Ma note<select formControlName="rating">
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <option [ngValue]="n">{{ n }} / 5</option>
                }
              </select></label
            ><label
              >Mon avis<textarea formControlName="comment"></textarea></label
            ><button class="primary" [disabled]="s.busy()">
              Partager mon avis
            </button>
          </form>
          <h3>Checklist de visite personnalisée</h3>
          <p class="hint">
            Ajoutez des tâches liées à cette proposition depuis le planning :
            capacité, parking, équipements, durée…
          </p>
          <a routerLink="/planning">Ouvrir le planning →</a>
        </section>
      </div>
    } @else {
      <p class="empty">
        Proposition introuvable.
        <a routerLink="/prestations">Revenir au catalogue</a>
      </p>
    }`,
})
export class OfferDetail {
  readonly s = inject(Store);
  private fb = inject(FormBuilder);
  private id = inject(ActivatedRoute).snapshot.paramMap.get("id")!;
  readonly offer = computed(() =>
    this.s.data().provider_offers.find((o) => o.id === this.id),
  );
  readonly reviews = computed(() =>
    this.s.data().offer_reviews.filter((r) => r.offer_id === this.id),
  );
  readonly reserved = computed(() =>
    this.s.data().bookings.some((b) => b.offer_id === this.id),
  );
  readonly editing = signal(false);
  readonly statuses = STATUSES;
  readonly form = this.fb.nonNullable.group({
    name: ["", Validators.required],
    amount: ["0", Validators.required],
    currency: ["MAD"],
    pricing: ["forfait"],
    status: ["À contacter"],
    description: [""],
    included: [""],
    excluded: [""],
    conditions: [""],
    availability: [""],
    pros: [""],
    cons: [""],
    criteria: [""],
  });
  private urlValidators = [Validators.pattern(/^$|^https:\/\/[^\s]+$/)];
  readonly contact = this.fb.nonNullable.group({
    name: ["", Validators.required],
    city: [""],
    phone: [""],
    whatsapp: [""],
    instagram: ["", this.urlValidators],
    website: ["", this.urlValidators],
    address: [""],
    maps_url: ["", this.urlValidators],
  });
  readonly review = this.fb.nonNullable.group({ rating: [4], comment: [""] });
  constructor() {
    const o = this.offer();
    if (o) {
      const p = this.s.provider(o.provider_id);
      if (p) this.contact.patchValue(p);
      const r = this.reviews().find((r) => r.user_id === this.s.userId());
      if (r) this.review.patchValue(r);
    }
  }
  edit(o: Offer) {
    this.form.patchValue({
      ...o,
      amount: String(o.amount_minor / 100),
      criteria: Object.entries(o.criteria)
        .map(([k, v]) => `${k} = ${v}`)
        .join("\n"),
    });
    this.editing.set(true);
  }
  save() {
    if (this.form.invalid) return;
    void this.s.run(async () => {
      const { amount, ...v } = this.form.getRawValue();
      const criteria = Object.fromEntries(
        v.criteria
          .split("\n")
          .filter((x) => x.includes("="))
          .map((line) => {
            const i = line.indexOf("=");
            return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
          }),
      );
      await this.s.save("provider_offers", {
        ...this.offer()!,
        ...v,
        amount_minor: minor(amount),
        currency: v.currency as Offer["currency"],
        pricing: v.pricing as Offer["pricing"],
        status: v.status as Offer["status"],
        criteria,
      });
      this.editing.set(false);
    }, "Proposition enregistrée.");
  }
  saveContact() {
    if (this.contact.invalid) return;
    void this.s.run(
      () =>
        this.s.save("providers", {
          id: this.offer()!.provider_id,
          ...this.contact.getRawValue(),
        }),
      "Contact enregistré.",
    );
  }
  saveReview() {
    void this.s.run(() => {
      const own = this.reviews().find((r) => r.user_id === this.s.userId());
      return this.s.save("offer_reviews", {
        id: own?.id,
        offer_id: this.id,
        user_id: this.s.userId(),
        ...this.review.getRawValue(),
      });
    }, "Avis partagé.");
  }
  select(o: Offer) {
    void this.s.run(() => this.s.decide(o.id), "Décision mise à jour.");
  }
  cancelBooking(o: Offer) {
    void this.s.run(() => this.s.cancelBooking(o.id), "Réservation annulée.");
  }
  book(o: Offer) {
    if (this.reserved()) return;
    void this.s.run(async () => {
      await this.s.book(o.id);
    }, "Réservation enregistrée. Ajoutez une dépense dans le budget si nécessaire.");
  }
}
