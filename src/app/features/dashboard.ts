import { Component, inject, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Store } from "../core/store";
@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">VOTRE HISTOIRE PREND FORME</span>
        <h1>Tout commence par vous deux<span class="gold">.</span></h1>
        <p>
          {{
            s.wedding()?.partner_names ||
              "Bienvenue dans votre carnet de préparatifs"
          }}
          ♡
        </p>
      </div>
      <a routerLink="/prestations" class="button primary"
        >＋ Une nouvelle proposition</a
      >
    </div>
    <section class="hero">
      <div>
        <span class="eyebrow">UN PEU DE TRADITION, BEAUCOUP D’AMOUR</span>
        <h2>Chaque détail compte.<br />Chaque choix se partage.</h2>
        <p>
          Des premières inspirations au grand jour,<br />construisez un mariage
          qui vous ressemble.
        </p>
        <a routerLink="/comparaisons" class="button"
          >Comparer nos coups de cœur ↗</a
        >
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="arch">
          <span>ن</span><small>NOTRE MARIAGE</small><em>ensemble</em>
        </div>
        <div class="stem">❧</div>
      </div>
    </section>
    <section class="kpi-grid" aria-label="Indicateurs financiers">
      <article class="kpi">
        <span>Budget global</span>
        <h3>{{ s.format(s.wedding()?.budget_minor ?? 0) }}</h3>
        <small>Objectif défini ensemble</small>
      </article>
      <article class="kpi">
        <span>Montant engagé</span>
        <h3>{{ s.format(s.total().engaged) }}</h3>
        <small>{{ s.data().expenses.length }} dépenses enregistrées</small>
      </article>
      <article class="kpi">
        <span>Déjà payé</span>
        <h3>{{ s.format(s.total().paid) }}</h3>
        <small>Acomptes et règlements</small>
      </article>
      <article class="kpi">
        <span>Reste à payer</span>
        <h3>{{ s.format(s.total().engaged - s.total().paid) }}</h3>
        <small>Sur les dépenses engagées</small>
      </article>
    </section>
    <section>
      <div class="section-heading">
        <h2>Nos deux rendez-vous</h2>
        <a routerLink="/ceremonies">Organiser nos cérémonies →</a>
      </div>
      <div class="ceremony-grid">
        @for (c of s.data().ceremonies; track c.id) {
          <a routerLink="/ceremonies" class="ceremony-card"
            ><div>
              <span class="eyebrow">{{ days(c.date) }}</span>
              <h2>{{ c.name }}</h2>
              <p>{{ date(c.date) }}</p>
              <span class="pill"
                >{{ requirements(c.id) }} besoins à organiser</span
              >
            </div>
            <span class="ceremony-symbol">✧</span></a
          >
        } @empty {
          <p class="empty">Ajoutez vos cérémonies pour commencer.</p>
        }
      </div>
    </section>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="section-heading">
          <h2>Notre budget en un regard</h2>
          <a routerLink="/budget">Détails ↗</a>
        </div>
        <div class="budget-chart">
          <div
            class="donut"
            [style.--progress]="progress() + '%'"
            role="img"
            [attr.aria-label]="progress() + ' % du budget engagé'"
          >
            <div>
              <strong>{{ progress() }} %</strong><small>du budget engagé</small>
            </div>
          </div>
          <div class="chart-legend">
            <p>
              <i class="dot sage"></i>Engagé
              <strong>{{ s.format(s.total().engaged) }}</strong>
            </p>
            <p>
              <i class="dot sand"></i>Disponible
              <strong>{{
                s.format((s.wedding()?.budget_minor ?? 0) - s.total().engaged)
              }}</strong>
            </p>
            <p class="hint">Les propositions comparées ne sont pas comptées.</p>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="section-heading">
          <h2>Les prochains petits pas</h2>
          <a routerLink="/planning">Tout voir →</a>
        </div>
        @for (task of pending(); track task.id) {
          <div class="task-row">
            <button
              class="check"
              (click)="complete(task.id)"
              [attr.aria-label]="'Terminer ' + task.name"
            >
              ○
            </button>
            <div>
              <strong>{{ task.name }}</strong
              ><small>{{ date(task.due_on) }} · {{ task.responsible }}</small>
            </div>
            <span class="pill" [class.rose]="task.priority === 'Haute'">{{
              task.priority
            }}</span>
          </div>
        } @empty {
          <p class="empty">Tout est à jour. Savourez ce moment ♡</p>
        }
      </section>
    </div>
    <div class="stats-strip">
      <span
        ><strong>{{ s.data().provider_offers.length }}</strong> propositions à
        découvrir</span
      ><span
        ><strong>{{ selected() }}</strong> choix retenus</span
      ><span
        ><strong>{{ s.data().guests.length }}</strong> invités dans notre
        carnet</span
      ><span
        ><strong>{{ done() }} %</strong> des tâches terminées</span
      >
    </div>
  `,
})
export class Dashboard {
  readonly s = inject(Store);
  readonly pending = computed(() =>
    this.s
      .data()
      .tasks.filter((t) => !t.done)
      .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"))
      .slice(0, 4),
  );
  readonly progress = computed(() =>
    Math.round(
      (this.s.total().engaged /
        Math.max(1, this.s.wedding()?.budget_minor ?? 0)) *
        100,
    ),
  );
  readonly selected = computed(
    () =>
      this.s.data().service_requirements.filter((r) => r.selected_offer_id)
        .length,
  );
  readonly done = computed(() => {
    const tasks = this.s.data().tasks;
    return tasks.length
      ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)
      : 0;
  });
  requirements(id: string) {
    return this.s
      .data()
      .service_requirements.filter((r) => r.ceremony_id === id).length;
  }
  days(date: string | null) {
    if (!date) return "DATE À CHOISIR";
    const n = Math.ceil(
      (new Date(date + "T00:00:00").getTime() - Date.now()) / 86400000,
    );
    return n >= 0 ? `DANS ${n} JOURS` : "NOTRE BEAU SOUVENIR";
  }
  date(date: string | null) {
    return date
      ? new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Date à définir";
  }
  complete(id: string) {
    void this.s.run(
      () => this.s.save("tasks", { id, done: true }),
      "Une étape de plus !",
    );
  }
}
