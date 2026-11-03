import { Component, inject, signal, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
import { Gallery } from "../shared/gallery";
import { Offer } from "../core/models";
@Component({
  standalone: true,
  imports: [RouterLink, Gallery],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">LES BONS CHOIX SE FONT À DEUX</span>
        <h1>Nos comparaisons</h1>
        <p>
          Deux à quatre propositions, pour un même besoin. Prenez le temps de
          choisir.
        </p>
      </div>
    </div>
    <section class="panel">
      <label
        >Quel besoin comparons-nous ?<select
          [value]="requirement()"
          (change)="choose($event)"
        >
          <option value="">Choisir un besoin</option>
          @for (r of s.data().service_requirements; track r.id) {
            <option [value]="r.id">
              {{ r.name }} · {{ s.ceremonyName(r.ceremony_id) }}
            </option>
          }
        </select></label
      >
      <div class="choice-list">
        @for (o of candidates(); track o.id) {
          <label class="choice"
            ><input
              type="checkbox"
              [checked]="ids().includes(o.id)"
              (change)="toggle(o.id)"
              [disabled]="!ids().includes(o.id) && ids().length >= 4"
            />{{ o.name }}</label
          >
        }
      </div>
      <small>{{ ids().length }} / 4 sélectionnées</small
      ><button (click)="save()" [disabled]="ids().length < 2 || s.busy()">
        Sauvegarder cette comparaison
      </button>
    </section>
    @if (selected().length >= 2) {
      <div class="comparison-grid" [style.--columns]="selected().length">
        @for (o of selected(); track o.id) {
          <article class="panel comparison-card">
            <app-gallery [offerId]="o.id" [compact]="true" />
            <div class="comparison-body">
              <h2>
                <a [routerLink]="['/prestations', o.id]">{{ o.name }}</a>
              </h2>
              <strong class="price"
                >{{ s.format(o.amount_minor, o.currency) }} /
                {{ o.pricing }}</strong
              ><span class="pill">{{ o.status }}</span>
              <dl>
                <dt>Localisation</dt>
                <dd>{{ s.provider(o.provider_id)?.city || "À préciser" }}</dd>
                <dt>Disponibilité</dt>
                <dd>{{ o.availability || "À confirmer" }}</dd>
                <dt>Compris</dt>
                <dd>{{ o.included || "À préciser" }}</dd>
                <dt>Non compris / options</dt>
                <dd>{{ o.excluded || "À préciser" }}</dd>
                @for (key of criteria(); track key) {
                  <dt>{{ key }}</dt>
                  <dd>{{ o.criteria[key] || "À préciser" }}</dd>
                }
                <dt>Avantages</dt>
                <dd>{{ o.pros || "À compléter" }}</dd>
                <dt>Points à éclaircir</dt>
                <dd>{{ o.cons || "À compléter" }}</dd>
                <dt>Mon avis</dt>
                <dd>{{ review(o.id, true) }}</dd>
                <dt>L’avis de ma moitié</dt>
                <dd>{{ review(o.id, false) }}</dd>
                <dt>Conditions</dt>
                <dd>{{ o.conditions || "À confirmer" }}</dd>
              </dl>
              <button class="primary full" (click)="select(o)">
                {{
                  s.requirement(o.requirement_id)?.selected_offer_id === o.id
                    ? "Annuler notre choix"
                    : "Retenir ensemble"
                }}</button
              ><a class="button full" [routerLink]="['/prestations', o.id]"
                >Consulter les photos et donner mon avis</a
              >
            </div>
          </article>
        }
      </div>
    } @else {
      <div class="empty panel">
        <span class="empty-icon">⇆</span>
        <h2>Faisons de la place à nos coups de cœur</h2>
        <p>Choisissez un besoin, puis au moins deux propositions.</p>
        <a routerLink="/prestations">Retrouver nos propositions →</a>
      </div>
    }
    <section class="panel">
      <h2>Comparaisons sauvegardées</h2>
      @for (c of s.data().offer_comparisons; track c.id) {
        <div class="list-row">
          <span>{{ c.name }}</span
          ><button (click)="load(c.id, c.requirement_id)">Ouvrir</button>
        </div>
      } @empty {
        <p class="hint">Vos comparaisons sauvegardées apparaîtront ici.</p>
      }
    </section>`,
})
export class Comparisons {
  readonly s = inject(Store);
  readonly requirement = signal("");
  readonly ids = signal<string[]>([]);
  readonly candidates = computed(() =>
    this.s
      .data()
      .provider_offers.filter((o) => o.requirement_id === this.requirement()),
  );
  readonly selected = computed(() =>
    this.candidates().filter((o) => this.ids().includes(o.id)),
  );
  readonly criteria = computed(() => [
    ...new Set(this.selected().flatMap((o) => Object.keys(o.criteria))),
  ]);
  choose(e: Event) {
    this.requirement.set((e.target as HTMLSelectElement).value);
    this.ids.set([]);
  }
  toggle(id: string) {
    this.ids.update((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length < 4
          ? [...ids, id]
          : ids,
    );
  }
  review(id: string, mine: boolean) {
    const r = this.s
      .data()
      .offer_reviews.find(
        (r) =>
          r.offer_id === id &&
          (mine
            ? r.user_id === this.s.userId()
            : r.user_id !== this.s.userId()),
      );
    return r ? `${r.rating}/5 · ${r.comment}` : "Pas encore d’avis";
  }
  select(o: Offer) {
    void this.s.run(() => this.s.decide(o.id), "Décision commune mise à jour.");
  }
  save() {
    if (this.ids().length < 2) return;
    void this.s.run(async () => {
      const c = await this.s.save("offer_comparisons", {
        requirement_id: this.requirement(),
        name: this.s.requirement(this.requirement())?.name ?? "Comparaison",
        weights: {},
      });
      for (const id of this.ids())
        await this.s.save("comparison_items", {
          comparison_id: c.id,
          offer_id: id,
        });
    }, "Comparaison sauvegardée.");
  }
  load(id: string, requirement: string) {
    this.requirement.set(requirement);
    this.ids.set(
      this.s
        .data()
        .comparison_items.filter((i) => i.comparison_id === id)
        .map((i) => i.offer_id)
        .slice(0, 4),
    );
  }
}
