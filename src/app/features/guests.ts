import { Component, inject, signal, computed } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { csvCell, parseCsv, duplicateKey } from "../core/csv";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">CEUX QUI PARTAGENT NOTRE JOIE</span>
        <h1>Nos invités</h1>
        <p>Un carnet commun, des invitations propres à chaque cérémonie.</p>
      </div>
      <div class="row">
        <button (click)="exportCsv()">Exporter CSV</button
        ><label class="button"
          >Importer CSV<input
            class="sr-only"
            type="file"
            accept=".csv,text/csv"
            (change)="importCsv($event)" /></label
        ><button class="primary" (click)="show.set(!show())">
          ＋ Un invité
        </button>
      </div>
    </div>
    <div class="stats-strip">
      <span
        ><strong>{{ s.data().guests.length }}</strong> invités uniques</span
      ><span
        ><strong>{{ s.data().guest_households.length }}</strong> foyers</span
      ><span
        ><strong>{{ confirmed() }}</strong> présences confirmées pour ce
        filtre</span
      >
    </div>
    <div class="filters">
      <input
        placeholder="Rechercher un nom ou un foyer"
        aria-label="Recherche invités"
        (input)="query.set(value($event))"
      /><select
        aria-label="Filtrer cérémonie"
        (change)="ceremony.set(value($event))"
      >
        <option value="">Toutes les cérémonies</option>
        @for (c of s.data().ceremonies; track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }</select
      ><select aria-label="Famille" (change)="side.set(value($event))">
        <option value="">Toutes les familles</option>
        <option>Mariée</option>
        <option>Marié</option>
        <option>Commun</option>
      </select>
    </div>
    @if (show()) {
      <section class="panel">
        <h2>Ajouter une personne</h2>
        <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
          <label>Nom complet<input formControlName="name" /></label
          ><label
            >Foyer<input
              formControlName="household"
              placeholder="Famille…" /></label
          ><label
            >Famille<select formControlName="side">
              <option>Commun</option>
              <option>Mariée</option>
              <option>Marié</option>
            </select></label
          ><label
            >Téléphone du foyer<input
              formControlName="phone"
              type="tel" /></label
          ><label>Régime alimentaire<input formControlName="diet" /></label
          ><label class="choice"
            ><input type="checkbox" formControlName="is_child" />Enfant</label
          ><button class="primary" [disabled]="form.invalid || s.busy()">
            Ajouter l’invité
          </button>
        </form>
      </section>
    }
    <section class="panel">
      <p class="hint">
        CSV : nom,foyer,famille,telephone,enfant,regime. L’import ajoute les
        personnes sans créer automatiquement d’invitations. Les doublons nom +
        foyer sont ignorés.
      </p>
      @for (h of households(); track h.id) {
        <div class="household">
          <h2>
            {{ h.name }} <span class="pill">{{ h.side }}</span>
          </h2>
          <small>{{ h.phone }}</small>
          @for (g of people(h.id); track g.id) {
            <div class="guest-row">
              <div>
                <strong>{{ g.name }}</strong
                ><small
                  >{{ g.is_child ? "Enfant" : "Adulte" }} ·
                  {{ g.diet || "Aucun régime précisé" }}</small
                >
              </div>
              <div class="guest-invitations">
                @for (c of s.data().ceremonies; track c.id) {
                  <label
                    >{{ c.name
                    }}<select
                      [value]="status(g.id, c.id)"
                      (change)="invite(g.id, c.id, $event)"
                    >
                      <option value="">Non concerné</option>
                      <option>À inviter</option>
                      <option>Envoyée</option>
                      <option>Confirmée</option>
                      <option>Refusée</option>
                    </select></label
                  >
                }
              </div>
            </div>
          }
        </div>
      } @empty {
        <div class="empty">
          <h2>Qui sera à nos côtés ?</h2>
          <p>Ajoutez vos proches ou importez votre carnet CSV.</p>
        </div>
      }
    </section>`,
})
export class Guests {
  readonly s = inject(Store);
  readonly query = signal("");
  readonly ceremony = signal("");
  readonly side = signal("");
  readonly show = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ["", Validators.required],
    household: ["", Validators.required],
    side: ["Commun"],
    phone: [""],
    diet: [""],
    is_child: [false],
  });
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
  async add(v: {
    name: string;
    household: string;
    side: string;
    phone: string;
    diet: string;
    is_child: boolean;
  }): Promise<boolean> {
    let h = this.s
      .data()
      .guest_households.find(
        (h) => h.name.trim().toLowerCase() === v.household.trim().toLowerCase(),
      );
    if (
      this.s
        .data()
        .guests.some(
          (g) =>
            duplicateKey(
              g.name,
              this.s
                .data()
                .guest_households.find((h) => h.id === g.household_id)?.name ??
                "",
            ) === duplicateKey(v.name, v.household),
        )
    )
      return false;
    if (!h)
      h = await this.s.save("guest_households", {
        name: v.household.trim(),
        side: v.side,
        phone: v.phone,
        notes: "",
      });
    await this.s.save("guests", {
      household_id: h.id,
      name: v.name.trim(),
      diet: v.diet,
      is_child: v.is_child,
    });
    return true;
  }
  save() {
    if (this.form.invalid) return;
    void this.s.run(async () => {
      if (!(await this.add(this.form.getRawValue())))
        throw new Error("Cette personne figure déjà dans ce foyer.");
      this.show.set(false);
      this.form.reset();
    }, "Invité ajouté.");
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
