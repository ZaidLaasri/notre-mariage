import { FocusTrap } from "../shared/focus-trap";
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { balance, checkPayment, minor, convert } from "../core/money";
import { Photos } from "../core/photos";
import { Expense } from "../core/models";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, FocusTrap],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">AVANCER LE CŒUR LÉGER</span>
        <h1>Notre budget</h1>
        <p>Chaque engagement et chaque règlement, en toute clarté.</p>
      </div>
      <button class="primary" (click)="show.set(!show())">
        ＋ Une dépense
      </button>
    </div>
    <div class="kpi-grid">
      <article class="kpi">
        <span>Budget global</span>
        <h3>{{ s.format(s.wedding()?.budget_minor ?? 0) }}</h3>
      </article>
      <article class="kpi">
        <span>Engagé</span>
        <h3>{{ s.format(s.total().engaged) }}</h3>
      </article>
      <article class="kpi">
        <span>Payé</span>
        <h3>{{ s.format(s.total().paid) }}</h3>
      </article>
      <article class="kpi">
        <span>Reste à payer</span>
        <h3>{{ s.format(s.total().engaged - s.total().paid) }}</h3>
      </article>
    </div>
    @if (show()) {
      <section class="panel">
        <h2>Nouvelle dépense engagée</h2>
        <p class="hint">
          Saisissez le montant total convenu, même si seul un acompte est payé.
        </p>
        <form [formGroup]="expense" (ngSubmit)="addExpense()" class="form-grid">
          <label>Libellé<input formControlName="name" /></label
          ><label
            >Cérémonie<select formControlName="ceremony_id">
              <option value="">Choisir</option>
              @for (c of s.data().ceremonies; track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select></label
          ><label
            >Prestataire<select formControlName="provider_id">
              <option value="">Aucun</option>
              @for (p of s.data().providers; track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select></label
          ><label
            >Réservation associée<select formControlName="booking_id">
              <option value="">Aucune</option>
              @for (b of s.data().bookings; track b.id) {
                <option [value]="b.id">{{ offerName(b.offer_id) }}</option>
              }
            </select></label
          ><label
            >Montant total<input
              formControlName="amount"
              inputmode="decimal" /></label
          ><label
            >Devise<select formControlName="currency">
              <option>MAD</option>
              <option>EUR</option>
            </select></label
          ><label>Échéance<input type="date" formControlName="due_on" /></label
          ><button class="primary" [disabled]="expense.invalid || s.busy()">
            Enregistrer la dépense
          </button>
        </form>
      </section>
    }
    <section class="panel">
      <h2>Par cérémonie</h2>
      @for (c of s.data().ceremonies; track c.id) {
        <div class="budget-line">
          <div class="row between">
            <strong>{{ c.name }}</strong
            ><span
              >{{ s.format(ceremonyTotal(c.id)) }} /
              {{ s.format(c.budget_minor) }}</span
            >
          </div>
          <progress
            [value]="ceremonyTotal(c.id)"
            [max]="c.budget_minor || 1"
          ></progress>
          @if (ceremonyTotal(c.id) > c.budget_minor) {
            <small class="danger"
              >Budget dépassé de
              {{ s.format(ceremonyTotal(c.id) - c.budget_minor) }}</small
            >
          }
        </div>
      }
    </section>
    <section class="panel">
      <h2>Nos dépenses et échéances</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Dépense</th>
              <th>Montant engagé</th>
              <th>Solde</th>
              <th>Échéance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (e of s.data().expenses; track e.id) {
              <tr>
                <td>
                  <strong>{{ e.name }}</strong
                  ><small>{{ s.ceremonyName(e.ceremony_id) }}</small>
                </td>
                <td>{{ s.format(e.amount_minor, e.currency) }}</td>
                <td>{{ s.format(remaining(e), e.currency) }}</td>
                <td>{{ e.due_on || "À définir" }}</td>
                <td>
                  <button
                    (click)="payFor.set(e.id)"
                    [disabled]="remaining(e) <= 0"
                  >
                    Enregistrer un paiement
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">
                  Aucune dépense engagée. Les offres comparées restent hors
                  budget.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    @if (payFor()) {
      <section class="panel">
        <h2>Un nouveau règlement</h2>
        <p>
          Devise : {{ currentExpense()?.currency }} · solde
          {{
            s.format(remaining(currentExpense()!), currentExpense()?.currency)
          }}
        </p>
        <form [formGroup]="payment" (ngSubmit)="addPayment()" class="form-grid">
          <label
            >Montant<input
              formControlName="amount"
              inputmode="decimal" /></label
          ><label>Date<input formControlName="paid_on" type="date" /></label
          ><label
            >Moyen<select formControlName="method">
              <option>Virement</option>
              <option>Espèces</option>
              <option>Carte</option>
              <option>Chèque</option>
              <option>Autre</option>
            </select></label
          ><label
            >Responsable<select formControlName="responsible">
              <option>Commun</option>
              <option>Mariée</option>
              <option>Marié</option>
              <option>Famille</option>
            </select></label
          ><button class="primary" [disabled]="payment.invalid || s.busy()">
            Confirmer le paiement effectué</button
          ><button type="button" (click)="payFor.set('')">Annuler</button>
        </form>
      </section>
    }
    <section class="panel">
      <h2>Historique des paiements</h2>
      @for (p of s.data().payments; track p.id) {
        <div class="list-row">
          <span
            ><strong>{{ expenseName(p.expense_id) }}</strong
            ><small
              >{{ p.paid_on }} · {{ p.method }} · {{ p.responsible }}</small
            ></span
          >
          <div class="row wrap">
            <strong>{{
              s.format(p.amount_minor, expenseCurrency(p.expense_id))
            }}</strong>
            @if (p.receipt_path) {
              <button (click)="viewReceipt(p.receipt_path)">
                Voir le justificatif
              </button>
            } @else {
              <label class="button"
                >Joindre une photo<input
                  class="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  (change)="receipt(p.id, $event)"
              /></label>
            }
          </div>
        </div>
      } @empty {
        <p class="hint">Aucun règlement enregistré.</p>
      }
    </section>
    @if (receiptUrl()) {
      <div
        appFocusTrap
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Justificatif"
        (keydown.escape)="receiptUrl.set('')"
      >
        <button class="close" (click)="receiptUrl.set('')">Fermer ×</button
        ><img [src]="receiptUrl()" alt="Justificatif de paiement" />
      </div>
    }`,
})
export class Budget {
  readonly s = inject(Store);
  private fb = inject(FormBuilder);
  private photos = inject(Photos);
  readonly receiptUrl = signal("");
  readonly show = signal(false);
  readonly payFor = signal("");
  readonly expense = this.fb.nonNullable.group({
    name: ["", Validators.required],
    ceremony_id: ["", Validators.required],
    provider_id: [""],
    booking_id: [""],
    amount: ["", Validators.required],
    currency: ["MAD"],
    due_on: [""],
  });
  readonly payment = this.fb.nonNullable.group({
    amount: ["", Validators.required],
    paid_on: [new Date().toISOString().slice(0, 10), Validators.required],
    method: ["Virement"],
    responsible: ["Commun"],
  });
  receipt(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file)
      void this.s.run(async () => {
        await this.photos.receipt(file, id);
        input.value = "";
      }, "Justificatif ajouté.");
  }
  viewReceipt(path: string) {
    void this.s.run(async () =>
      this.receiptUrl.set(await this.photos.url(path)),
    );
  }
  remaining(e: Expense) {
    return e ? balance(e, this.s.data().payments) : 0;
  }
  currentExpense() {
    return this.s.data().expenses.find((e) => e.id === this.payFor());
  }
  expenseName(id: string) {
    return this.s.data().expenses.find((e) => e.id === id)?.name;
  }
  expenseCurrency(id: string) {
    return this.s.data().expenses.find((e) => e.id === id)?.currency ?? "MAD";
  }
  offerName(id: string) {
    return this.s.data().provider_offers.find((o) => o.id === id)?.name;
  }
  ceremonyTotal(id: string) {
    const w = this.s.wedding();
    return this.s
      .data()
      .expenses.filter((e) => e.ceremony_id === id)
      .reduce(
        (sum, e) =>
          sum +
          convert(
            e.amount_minor,
            e.currency,
            w?.eur_mad_numerator ?? 108,
            w?.eur_mad_denominator ?? 10,
          ),
        0,
      );
  }
  addExpense() {
    if (this.expense.invalid) return;
    void this.s.run(async () => {
      const v = this.expense.getRawValue();
      await this.s.save("expenses", {
        name: v.name,
        ceremony_id: v.ceremony_id,
        provider_id: v.provider_id || null,
        booking_id: v.booking_id || null,
        amount_minor: minor(v.amount),
        currency: v.currency === "EUR" ? "EUR" : "MAD",
        due_on: v.due_on || null,
      });
      this.show.set(false);
      this.expense.reset();
    }, "Dépense engagée enregistrée.");
  }
  addPayment() {
    if (this.payment.invalid) return;
    void this.s.run(async () => {
      const e = this.currentExpense();
      if (!e) throw new Error("Dépense introuvable.");
      const v = this.payment.getRawValue(),
        amount_minor = minor(v.amount);
      checkPayment(e, this.s.data().payments, amount_minor);
      await this.s.save("payments", {
        expense_id: e.id,
        amount_minor,
        paid_on: v.paid_on,
        method: v.method,
        responsible: v.responsible,
        receipt_path: null,
      });
      this.payFor.set("");
      this.payment.controls.amount.reset();
    }, "Paiement enregistré.");
  }
}
