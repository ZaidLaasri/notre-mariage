import { Component, computed, effect, inject, input } from "@angular/core";
import { FormControl, FormRecord, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Offer } from "../core/models";
import { Store } from "../core/store";
import { SERVICE_TEMPLATES } from "../core/catalogue-templates";
@Component({
  selector: "app-offer-specialization",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `@if (template(); as t) {
    <section class="panel">
      <span class="eyebrow">{{ t.parent_name }}</span>
      <h2>{{ t.name }} · informations spécifiques</h2>
      <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
        @for (key of t.criteria; track key) {
          <label
            >{{ key
            }}<input
              [type]="timeField(key) ? 'time' : 'text'"
              [formControlName]="key"
          /></label>
        }
        <label
          >Référence du forfait commun (facultative)<input
            [formControl]="packageReference"
            placeholder="Ex. Forfait beauté A" /></label
        ><button class="primary" [disabled]="s.busy()">
          Enregistrer ces détails
        </button>
      </form>
      @if (t.kind === "vehicle") {
        <p class="hint">
          Disponibilité, prix, caution et annulation se complètent avec les
          champs généraux de l’offre. Un choix de véhicule ne crée aucun
          paiement.
        </p>
        <a
          class="button"
          routerLink="/timeline"
          [queryParams]="{
            ceremony: s.requirement(offer().requirement_id)?.ceremony_id,
            offer: offer().id,
          }"
          >Coordonner ce véhicule dans la Timeline →</a
        >
      } @else {
        <p class="hint">
          Conservez une offre Makeup et une offre Coiffure distinctes. Le même
          prestataire et une référence de forfait commune permettent de les
          rapprocher, sans dupliquer un engagement budgétaire.
        </p>
        <a
          class="button"
          routerLink="/inspirations"
          [queryParams]="{
            theme: t.kind === 'makeup' ? 'Makeup' : 'Coiffures',
          }"
          >Nos inspirations {{ t.name }} →</a
        >
      }
    </section>
  }`,
})
export class OfferSpecialization {
  readonly offer = input.required<Offer>();
  readonly s = inject(Store);
  readonly form = new FormRecord<FormControl<string>>({});
  readonly packageReference = new FormControl("", { nonNullable: true });
  private loaded = "";
  readonly template = computed(() => {
    const r = this.s.requirement(this.offer().requirement_id);
    const category = this.s
      .data()
      .categories.find((c) => c.id === r?.category_id);
    return SERVICE_TEMPLATES.find(
      (t) => t.kind === category?.kind || t.name === category?.name,
    );
  });
  constructor() {
    effect(() => {
      const offer = this.offer(),
        template = this.template();
      if (!template || this.loaded === offer.id) return;
      this.loaded = offer.id;
      for (const key of Object.keys(this.form.controls))
        this.form.removeControl(key);
      for (const key of template.criteria)
        this.form.addControl(
          key,
          new FormControl(offer.criteria[key] ?? "", { nonNullable: true }),
        );
      this.packageReference.setValue(offer.package_reference ?? "");
    });
  }
  timeField(key: string) {
    return key === "Heure de départ" || key === "Heure d’arrivée";
  }
  save() {
    void this.s.run(
      () =>
        this.s.save("provider_offers", {
          id: this.offer().id,
          criteria: { ...this.offer().criteria, ...this.form.getRawValue() },
          package_reference: this.packageReference.value,
        }),
      "Détails enregistrés.",
    );
  }
}
