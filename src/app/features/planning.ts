import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { Store } from "../core/store";
import { minor, convert } from "../core/money";
import { Gallery } from "../shared/gallery";
import { Calendar } from "../shared/calendar";
import { Task, Gift, Outfit } from "../core/models";
import { GiftSet } from "../core/models";
import { GiftSets, Dfou3Deletion } from "../core/gift-sets";
import { FocusTrap } from "../shared/focus-trap";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, Gallery, Calendar, FocusTrap],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">LES DÉTAILS QUI NOUS RESSEMBLENT</span>
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
    </div>
    @if (mode === "planning") {
      <app-calendar
        [tasks]="s.data().tasks"
        (change)="dateFilter.set($event)"
      />
      <section class="panel">
        <div class="section-heading">
          <h2>Notre prochaine étape</h2>
          <button (click)="templates()">
            Ajouter une checklist facultative
          </button>
        </div>
        <form [formGroup]="taskForm" (ngSubmit)="addTask()" class="form-grid">
          <label>Tâche<input formControlName="name" /></label
          ><label
            >Cérémonie<select formControlName="ceremony_id">
              <option value="">Commun</option>
              @for (c of s.data().ceremonies; track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select></label
          ><label>Échéance<input formControlName="due_on" type="date" /></label
          ><label
            >Responsable<select formControlName="responsible">
              <option>Commun</option>
              <option>Mariée</option>
              <option>Marié</option>
              <option>Famille</option>
            </select></label
          ><label
            >Priorité<select formControlName="priority">
              <option>Normale</option>
              <option>Haute</option>
              <option>Basse</option>
            </select></label
          ><label
            >Proposition liée<select formControlName="offer_id">
              <option value="">Aucune</option>
              @for (o of s.data().provider_offers; track o.id) {
                <option [value]="o.id">{{ o.name }}</option>
              }
            </select></label
          ><button class="primary" [disabled]="taskForm.invalid || s.busy()">
            Ajouter une tâche
          </button>
        </form>
      </section>
      <section class="panel">
        <h2>Notre calendrier des préparatifs</h2>
        <label class="choice"
          ><input
            type="checkbox"
            (change)="onlyPending.set(!onlyPending())"
          />Afficher uniquement les tâches à faire</label
        >
        @for (t of tasks(); track t.id) {
          <div class="task-row" [class.completed]="t.done">
            <input
              type="checkbox"
              [checked]="t.done"
              (change)="toggleTask(t)"
              [attr.aria-label]="t.name"
            />
            <div>
              <strong>{{ t.name }}</strong
              ><small
                >{{ t.due_on || "Sans échéance" }} · {{ t.responsible }} ·
                {{ s.ceremonyName(t.ceremony_id) }}</small
              >
            </div>
            <span class="pill" [class.rose]="late(t)">{{
              late(t) ? "En retard" : t.priority
            }}</span
            ><button (click)="deleteTask(t)">Supprimer</button>
          </div>
        } @empty {
          <p class="empty">Aucune tâche pour le moment.</p>
        }
      </section>
    }
    @if (mode === "dfou3") {
      <section class="panel" #setEditor>
        <h2>
          {{
            editingSet() ? "Modifier l’ensemble / tayfour" : "Créer un ensemble"
          }}
        </h2>
        <p class="hint">
          Chaque famille compose son Dfou3 librement. Tyafer, tissus, parfums ou
          bijoux restent facultatifs.
        </p>
        <form [formGroup]="setForm" (ngSubmit)="addSet()" class="form-grid">
          <label
            >Nom<input
              formControlName="name"
              placeholder="Ensemble caftan rose" /></label
          ><label>Couleur<input formControlName="color" /></label
          ><label
            >Cérémonie<select formControlName="ceremony_id">
              <option value="">Choisir</option>
              @for (c of s.data().ceremonies; track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select></label
          ><button [disabled]="setForm.invalid || s.busy()">
            {{
              editingSet()
                ? "Enregistrer les modifications"
                : "Créer l’ensemble"
            }}
          </button>
          @if (editingSet()) {
            <button type="button" (click)="cancelSet()">Annuler</button>
          }
        </form>
      </section>
      <div class="ceremony-grid">
        @for (set of s.data().gift_sets; track set.id) {
          <section class="panel">
            <span class="eyebrow">{{ set.color }}</span>
            <h2>{{ set.name }}</h2>
            <div class="row wrap">
              <button (click)="editSet(set)" [disabled]="s.busy()">
                Modifier l’ensemble</button
              ><button
                class="danger"
                (click)="askDeleteSet(set)"
                [disabled]="s.busy()"
              >
                Supprimer l’ensemble
              </button>
            </div>
            <app-gallery [offerId]="set.id" kind="gift_set" [editable]="true" />
            <p>
              Coût prévu : {{ s.format(setTotal(set.id)) }} ·
              {{ s.ceremonyName(set.ceremony_id) }}
            </p>
            @for (g of gifts(set.id); track g.id) {
              <div class="list-row">
                <label class="choice"
                  ><input
                    type="checkbox"
                    [checked]="g.delivered"
                    (change)="toggleGift(g)"
                  /><span
                    >{{ g.name }} × {{ g.quantity
                    }}<small
                      >{{ g.color }} · {{ g.material }} ·
                      {{ g.tyafer || "Sans Tyafer" }} ·
                      {{
                        s.format(g.amount_minor * g.quantity, g.currency)
                      }}</small
                    ></span
                  ></label
                >
              </div>
              <div class="row wrap">
                <button (click)="editGift(g)" [disabled]="s.busy()">
                  Modifier l’article / tayfour</button
                ><button
                  class="danger"
                  (click)="askDeleteGift(g)"
                  [disabled]="s.busy()"
                >
                  Supprimer l’article
                </button>
              </div>
            } @empty {
              <p class="hint">
                Ajoutez les articles de cet ensemble ci-dessous.
              </p>
            }
          </section>
        }
      </div>
      <section class="panel" #giftEditor>
        <h2>
          {{
            editingGift()
              ? "Modifier le cadeau / tayfour"
              : "Ajouter un cadeau ou un tayfour"
          }}
        </h2>
        <form [formGroup]="giftForm" (ngSubmit)="addGift()" class="form-grid">
          <label
            >Ensemble<select formControlName="gift_set_id">
              <option value="">Choisir</option>
              @for (set of s.data().gift_sets; track set.id) {
                <option [value]="set.id">{{ set.name }}</option>
              }
            </select></label
          ><label>Article<input formControlName="name" /></label
          ><label
            >Prix unitaire<input
              formControlName="amount"
              inputmode="decimal" /></label
          ><label
            >Devise<select formControlName="currency">
              <option>MAD</option>
              <option>EUR</option>
            </select></label
          ><label
            >Quantité<input
              formControlName="quantity"
              type="number"
              min="1"
              max="1000" /></label
          ><label>Couleur<input formControlName="color" /></label
          ><label>Matériaux<input formControlName="material" /></label
          ><label
            >Tyafer de présentation<input formControlName="tyafer" /></label
          ><button class="primary" [disabled]="giftForm.invalid || s.busy()">
            {{
              editingGift()
                ? "Enregistrer les modifications"
                : "Ajouter l’article"
            }}
          </button>
          @if (editingGift()) {
            <button type="button" (click)="cancelGift()">Annuler</button>
          }
        </form>
        <small class="hint"
          >Coût prévisionnel uniquement. Enregistrez les achats engagés dans le
          budget.</small
        >
      </section>
      @if (deletion(); as request) {
        <div
          class="lightbox"
          appFocusTrap
          role="dialog"
          aria-modal="true"
          aria-labelledby="dfou3-delete-title"
          (keydown.escape)="cancelDeletion()"
        >
          <section class="panel narrow">
            <h2 id="dfou3-delete-title">
              {{
                request.kind === "set"
                  ? "Supprimer cet ensemble ?"
                  : "Supprimer cet article / tayfour ?"
              }}
            </h2>
            <p>{{ deletionName() }}</p>
            <p>
              {{ deletionCount() }} article(s) et
              {{ request.photos.length }} photo(s) seront supprimés
              définitivement. Les dépenses et paiements sont conservés.
            </p>
            <div class="row wrap">
              <button
                class="primary"
                (click)="cancelDeletion()"
                [disabled]="s.busy()"
              >
                Conserver</button
              ><button
                class="danger"
                (click)="confirmDeletion()"
                [disabled]="s.busy()"
              >
                Confirmer la suppression
              </button>
            </div>
          </section>
        </div>
      }
    }
    @if (mode === "tenues") {
      <section class="panel">
        <h2>Notre carnet de tenues</h2>
        <form
          [formGroup]="outfitForm"
          (ngSubmit)="addOutfit()"
          class="form-grid"
        >
          <label>Tenue / tissu / modèle<input formControlName="name" /></label
          ><label
            >Cérémonie<select formControlName="ceremony_id">
              <option value="">Choisir</option>
              @for (c of s.data().ceremonies; track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select></label
          ><label
            >Date d’essayage<input
              formControlName="fitting_on"
              type="date" /></label
          ><label
            >Suivi<select formControlName="status">
              <option>Inspiration</option>
              <option>À confectionner</option>
              <option>Commandée</option>
              <option>Essayage</option>
              <option>Prête</option>
            </select></label
          ><button class="primary" [disabled]="outfitForm.invalid || s.busy()">
            Ajouter la tenue
          </button>
        </form>
      </section>
      <div class="ceremony-grid">
        @for (o of s.data().outfits; track o.id) {
          <section class="panel">
            <span class="eyebrow">{{ s.ceremonyName(o.ceremony_id) }}</span>
            <h2>{{ o.name }}</h2>
            <app-gallery [offerId]="o.id" kind="outfit" [editable]="true" />
            <p>Essayage : {{ o.fitting_on || "À prévoir" }}</p>
            <label
              >État<select
                [value]="o.status"
                (change)="outfitStatus(o, $event)"
              >
                <option>Inspiration</option>
                <option>À confectionner</option>
                <option>Commandée</option>
                <option>Essayage</option>
                <option>Prête</option>
              </select></label
            >
          </section>
        }
      </div>
    } `,
})
export class Planning {
  readonly s = inject(Store);
  private fb = inject(FormBuilder);
  private readonly giftSets = inject(GiftSets);
  @ViewChild("setEditor") private setEditor?: ElementRef<HTMLElement>;
  @ViewChild("giftEditor") private giftEditor?: ElementRef<HTMLElement>;
  private focusEditor(editor?: ElementRef<HTMLElement>) {
    editor?.nativeElement.scrollIntoView({ block: "start" });
    editor?.nativeElement
      .querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
  }
  readonly editingSet = signal("");
  readonly editingGift = signal("");
  readonly deletion = signal<Dfou3Deletion | null>(null);
  readonly mode =
    inject(ActivatedRoute).snapshot.routeConfig?.path ?? "planning";
  readonly title = (
    {
      dfou3: "Dfou3 — الدفوع & Tyafer",
      tenues: "Nos tenues",
      planning: "Nos préparatifs",
    } as Record<string, string>
  )[this.mode];
  readonly subtitle = (
    {
      dfou3: "Des ensembles assortis, selon nos envies et nos traditions.",
      tenues: "Caftans, takchitas et tissus : chaque détail a sa place.",
      planning: "Un pas après l’autre, jusqu’à nos beaux jours.",
    } as Record<string, string>
  )[this.mode];
  readonly dateFilter = signal("");
  readonly onlyPending = signal(false);
  readonly tasks = computed(() =>
    this.s
      .data()
      .tasks.filter(
        (t) =>
          (!this.onlyPending() || !t.done) &&
          (!this.dateFilter() || t.due_on === this.dateFilter()),
      )
      .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999")),
  );
  readonly taskForm = this.fb.nonNullable.group({
    name: ["", Validators.required],
    ceremony_id: [""],
    due_on: [""],
    responsible: ["Commun"],
    priority: ["Normale"],
    offer_id: [""],
  });
  readonly setForm = this.fb.nonNullable.group({
    name: ["", Validators.required],
    color: [""],
    ceremony_id: ["", Validators.required],
  });
  readonly giftForm = this.fb.nonNullable.group({
    name: ["", Validators.required],
    gift_set_id: ["", Validators.required],
    amount: ["0", Validators.required],
    currency: ["MAD"],
    quantity: [
      1,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(1000),
        Validators.pattern(/^[1-9]\d*$/),
      ],
    ],
    color: [""],
    material: [""],
    tyafer: [""],
  });
  readonly outfitForm = this.fb.nonNullable.group({
    name: ["", Validators.required],
    ceremony_id: ["", Validators.required],
    fitting_on: [""],
    status: ["Inspiration"],
  });
  templates() {
    void this.s.run(async () => {
      const names = [
        "Confirmer les coutumes souhaitées avec nos familles",
        "Vérifier capacité, parking et équipements du lieu",
        "Demander les conditions de paiement et annulation",
        "Organiser une dégustation si souhaitée",
        "Préparer les Tyafer selon nos envies",
        "Vérifier les formalités applicables avec les personnes compétentes",
      ];
      for (const name of names)
        if (!this.s.data().tasks.some((t) => t.name === name))
          await this.s.save("tasks", {
            name,
            ceremony_id: null,
            offer_id: null,
            due_on: null,
            priority: "Normale",
            responsible: "Commun",
            done: false,
          });
    }, "Checklist ajoutée : adaptez-la librement.");
  }
  late(t: Task) {
    return (
      !t.done && !!t.due_on && t.due_on < new Date().toISOString().slice(0, 10)
    );
  }
  toggleTask(t: Task) {
    void this.s.run(() => this.s.save("tasks", { ...t, done: !t.done }));
  }
  deleteTask(t: Task) {
    void this.s.run(() => this.s.remove("tasks", t.id));
  }
  addTask() {
    if (this.taskForm.invalid) return;
    void this.s.run(async () => {
      const v = this.taskForm.getRawValue();
      await this.s.save("tasks", {
        ...v,
        ceremony_id: v.ceremony_id || null,
        offer_id: v.offer_id || null,
        due_on: v.due_on || null,
        done: false,
      });
      this.taskForm.controls.name.reset();
    }, "Tâche ajoutée.");
  }
  addSet() {
    if (this.setForm.invalid) return;
    void this.s.run(async () => {
      const v = this.setForm.getRawValue();
      if (!v.name.trim()) throw new Error("Indiquez le nom de l’ensemble.");
      await this.s.save("gift_sets", {
        id: this.editingSet() || undefined,
        ...v,
        name: v.name.trim(),
      });
      this.cancelSet();
    }, "Ensemble enregistré.");
  }
  editSet(set: GiftSet) {
    this.editingSet.set(set.id);
    this.setForm.setValue({
      name: set.name,
      color: set.color,
      ceremony_id: set.ceremony_id,
    });
    this.setForm.markAsPristine();
    this.focusEditor(this.setEditor);
  }
  cancelSet() {
    this.editingSet.set("");
    this.setForm.reset();
  }
  editGift(gift: Gift) {
    this.editingGift.set(gift.id);
    this.giftForm.setValue({
      name: gift.name,
      gift_set_id: gift.gift_set_id,
      amount: String(gift.amount_minor / 100),
      currency: gift.currency,
      quantity: gift.quantity,
      color: gift.color,
      material: gift.material,
      tyafer: gift.tyafer,
    });
    this.giftForm.markAsPristine();
    this.focusEditor(this.giftEditor);
  }
  cancelGift() {
    this.editingGift.set("");
    this.giftForm.reset();
  }
  askDeleteSet(set: GiftSet) {
    try {
      this.deletion.set(this.giftSets.prepareSet(set.id));
    } catch (error) {
      this.s.error.set(this.s.message(error));
    }
  }
  askDeleteGift(gift: Gift) {
    try {
      this.deletion.set(this.giftSets.prepareGift(gift.id));
    } catch (error) {
      this.s.error.set(this.s.message(error));
    }
  }
  cancelDeletion() {
    if (!this.s.busy()) this.deletion.set(null);
  }
  deletionName() {
    const r = this.deletion();
    return r?.kind === "set" ? r.set.name : (r?.gift.name ?? "");
  }
  deletionCount() {
    const r = this.deletion();
    return r?.kind === "set" ? r.gifts.length : r ? 1 : 0;
  }
  confirmDeletion() {
    const request = this.deletion();
    if (!request) return;
    void this.s.run(async () => {
      await this.giftSets.remove(request);
      if (request.kind === "set") {
        if (this.editingSet() === request.set.id) this.cancelSet();
        if (this.giftForm.controls.gift_set_id.value === request.set.id)
          this.cancelGift();
      } else if (this.editingGift() === request.gift.id) this.cancelGift();
      this.deletion.set(null);
    }, "Suppression terminée.");
  }
  gifts(id: string) {
    return this.s.data().gifts.filter((g) => g.gift_set_id === id);
  }
  setTotal(id: string) {
    const w = this.s.wedding();
    return this.gifts(id).reduce(
      (sum, g) =>
        sum +
        convert(
          g.amount_minor * g.quantity,
          g.currency,
          w?.eur_mad_numerator ?? 108,
          w?.eur_mad_denominator ?? 10,
        ),
      0,
    );
  }
  toggleGift(g: Gift) {
    void this.s.run(() =>
      this.s.save("gifts", { ...g, delivered: !g.delivered }),
    );
  }
  addGift() {
    if (this.giftForm.invalid) return;
    void this.s.run(async () => {
      const { amount, ...v } = this.giftForm.getRawValue();
      if (!v.name.trim()) throw new Error("Indiquez le nom de l’article.");
      const previous = this.s
        .data()
        .gifts.find((g) => g.id === this.editingGift());
      await this.s.save("gifts", {
        ...v,
        id: this.editingGift() || undefined,
        name: v.name.trim(),
        amount_minor: minor(amount),
        currency: v.currency === "EUR" ? "EUR" : "MAD",
        provider_id: previous?.provider_id ?? null,
        purchased_on: previous?.purchased_on ?? null,
        delivered: previous?.delivered ?? false,
      });
      if (this.editingGift()) this.cancelGift();
      else this.giftForm.controls.name.reset();
    }, "Article enregistré.");
  }
  addOutfit() {
    if (this.outfitForm.invalid) return;
    void this.s.run(() => {
      const v = this.outfitForm.getRawValue();
      return this.s.save("outfits", { ...v, fitting_on: v.fitting_on || null });
    }, "Tenue ajoutée.");
  }
  outfitStatus(o: Outfit, e: Event) {
    void this.s.run(() =>
      this.s.save("outfits", {
        ...o,
        status: (e.target as HTMLSelectElement).value,
      }),
    );
  }
}
