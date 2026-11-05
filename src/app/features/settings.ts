import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Store } from "../core/store";
import { Photos } from "../core/photos";
import { minor } from "../core/money";
import { invitationEmail, invitationEmailError } from "../core/invitations";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">UN ESPACE À NOTRE IMAGE</span>
        <h1>Nos paramètres</h1>
        <p>Notre couple, nos préférences et nos données.</p>
      </div>
      <button (click)="logout()">
        {{ s.demo() ? "Quitter la démonstration" : "Se déconnecter" }}
      </button>
    </div>
    @if (!s.wedding()) {
      <section class="panel narrow">
        <h2>Créons notre espace partagé</h2>
        <form [formGroup]="setup" (ngSubmit)="create()">
          <label>Nom du mariage<input formControlName="name" /></label
          ><button
            class="primary"
            [disabled]="setup.controls.name.invalid || s.busy()"
          >
            Créer notre mariage
          </button>
          <div class="divider">ou rejoindre ma moitié</div>
          <label
            >Code d’invitation<input
              formControlName="token"
              autocomplete="off" /></label
          ><button
            type="button"
            (click)="accept()"
            [disabled]="!setup.controls.token.value || s.busy()"
          >
            Accepter l’invitation
          </button>
        </form>
      </section>
    } @else {
      <section class="panel">
        <h2>Notre mariage</h2>
        <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
          <label>Nom de l’espace<input formControlName="name" /></label
          ><label>Nos prénoms<input formControlName="partner_names" /></label
          ><label
            >Budget global MAD<input
              formControlName="budget"
              inputmode="decimal" /></label
          ><label
            >Conversion manuelle : 1 EUR en MAD<input
              formControlName="rate"
              inputmode="decimal" /></label
          ><button class="primary" [disabled]="form.invalid || s.busy()">
            Enregistrer nos préférences
          </button>
        </form>
        <p class="hint">
          Le taux manuel s’applique à la consolidation actuelle ; chaque dépense
          garde sa devise d’origine. Aucun service de change payant.
        </p>
      </section>
      <section class="panel">
        <h2>Nos catégories et critères</h2>
        <div class="tags">
          @for (c of s.data().categories; track c.id) {
            <span class="pill">{{ c.name }}</span>
          }
        </div>
        <form
          [formGroup]="category"
          (ngSubmit)="addCategory()"
          class="form-grid"
        >
          <label>Nom de catégorie<input formControlName="name" /></label
          ><label
            >Critères (séparés par des virgules)<input
              formControlName="criteria"
              placeholder="Capacité, Parking, Jardin" /></label
          ><button [disabled]="category.invalid || s.busy()">
            Ajouter la catégorie
          </button>
        </form>
      </section>
      @if (!s.demo()) {
        <section class="panel">
          <h2>Inviter ma moitié</h2>
          <p>
            Votre moitié reçoit un email pour vérifier son adresse et rejoindre
            notre espace. L’invitation reste valable 48 h. Le lien de connexion
            envoyé par email a sa propre durée de validité.
          </p>
          <form [formGroup]="invitation" (ngSubmit)="invite()">
            <label
              >Son adresse email<input
                type="email"
                formControlName="email" /></label
            ><button [disabled]="invitation.invalid || s.busy()">
              Envoyer l’invitation par email
            </button>
          </form>
          @if (invitedEmail()) {
            <p role="status">{{ emailStatus() }}</p>
            <button (click)="resendEmail()" [disabled]="s.busy()">
              Renvoyer l’email à {{ invitedEmail() }}
            </button>
          }
          @if (token()) {
            <details>
              <summary>Solution de secours : transmettre le code privé</summary>
              <p class="hint">
                Votre moitié peut se connecter avec son compte, puis coller ce
                code dans les paramètres. Une nouvelle invitation remplace la
                précédente.
              </p>
              <label
                >Code à transmettre en privé<textarea
                  readonly
                  [value]="token()"
                ></textarea>
              </label>
            </details>
          }
        </section>
      }
      <section class="panel">
        <h2>Conserver nos souvenirs</h2>
        <p>
          L’export JSON contient vos données métier et les chemins des fichiers,
          sans session ni donnée d’authentification. Les photos doivent être
          sauvegardées séparément.
        </p>
        <div class="row wrap">
          <button class="primary" (click)="s.exportData()">
            Exporter les données JSON</button
          ><button (click)="backup()" [disabled]="s.busy()">
            Télécharger toutes les photos</button
          ><button (click)="refresh()" [disabled]="s.busy()">
            Actualiser les données partagées
          </button>
        </div>
        <small class="hint"
          >Le navigateur peut demander d’autoriser plusieurs téléchargements.
          Sauvegardez également les autres fichiers du bucket depuis
          Supabase.</small
        >
        <h3>Stockage photos référencé</h3>
        <p>
          {{ storageMb() }} Mo de photos référencées · plafond Free actuel : 1
          Go pour tout le projet. Consultez le dashboard Supabase pour la
          consommation réelle, fichiers orphelins inclus.
        </p>
      </section>
      @if (s.demo()) {
        <section class="panel">
          <h2>Démonstration</h2>
          <p>
            La démo est stockée sous une clé distincte sur cet appareil et
            n’écrit jamais dans Supabase.
          </p>
          <button (click)="confirmReset.set(!confirmReset())">
            Réinitialiser les données fictives
          </button>
          @if (confirmReset()) {
            <p>Vos modifications de démonstration seront remplacées.</p>
            <button class="danger" (click)="reset()">
              Confirmer la réinitialisation
            </button>
          }
        </section>
      }
    }`,
})
export class Settings {
  readonly s = inject(Store);
  private photos = inject(Photos);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  readonly token = signal("");
  readonly invitedEmail = signal("");
  readonly emailStatus = signal("");
  readonly confirmReset = signal(false);
  readonly setup = this.fb.nonNullable.group({
    name: ["Notre Mariage", Validators.required],
    token: [""],
  });
  readonly invitation = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
  });
  readonly category = this.fb.nonNullable.group({
    name: ["", Validators.required],
    criteria: [""],
  });
  readonly form = this.fb.nonNullable.group({
    name: ["", Validators.required],
    partner_names: [""],
    budget: ["0", Validators.required],
    rate: ["10.80", Validators.required],
  });
  constructor() {
    const w = this.s.wedding();
    if (w)
      this.form.patchValue({
        name: w.name,
        partner_names: w.partner_names,
        budget: String(w.budget_minor / 100),
        rate: String(w.eur_mad_numerator / w.eur_mad_denominator),
      });
  }
  save() {
    if (this.form.invalid) return;
    void this.s.run(() => {
      const v = this.form.getRawValue();
      const numerator = minor(v.rate);
      if (numerator <= 0) throw new Error("Le taux doit être positif.");
      return this.s.saveWedding({
        name: v.name,
        partner_names: v.partner_names,
        budget_minor: minor(v.budget),
        eur_mad_numerator: numerator,
        eur_mad_denominator: 100,
      });
    }, "Préférences enregistrées.");
  }
  create() {
    void this.s.run(async () => {
      await this.s.createWedding(this.setup.controls.name.value);
      await this.router.navigateByUrl("/");
    });
  }
  accept() {
    void this.s.run(async () => {
      await this.s.accept(this.setup.controls.token.value);
      await this.router.navigateByUrl("/");
    });
  }
  invite() {
    if (this.invitation.invalid) return;
    void this.s.run(async () => {
      const email = invitationEmail(this.invitation.controls.email.value);
      const token = await this.s.invite(email);
      this.token.set(token);
      this.invitedEmail.set(email);
      this.emailStatus.set("Invitation créée. Envoi de l’email en cours…");
      await this.deliver(email);
    });
  }
  private async deliver(email: string) {
    try {
      await this.s.sendPartnerEmail(email, this.token());
      this.emailStatus.set(
        "L’envoi a été accepté par Supabase. Votre moitié peut consulter sa boîte de réception et ses indésirables.",
      );
    } catch (error) {
      this.emailStatus.set(invitationEmailError(error));
      this.s.error.set(this.emailStatus());
    }
  }
  resendEmail() {
    if (!this.invitedEmail()) return;
    void this.s.run(() => this.deliver(this.invitedEmail()));
  }
  addCategory() {
    if (this.category.invalid) return;
    void this.s.run(async () => {
      const v = this.category.getRawValue();
      await this.s.save("categories", {
        name: v.name,
        criteria: v.criteria
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      this.category.reset();
    }, "Catégorie ajoutée.");
  }
  storageMb() {
    return (
      [...this.s.data().offer_photos, ...this.s.data().attachments].reduce(
        (n, p) => n + p.size_bytes,
        0,
      ) / 1048576
    ).toFixed(1);
  }
  backup() {
    void this.s.run(
      () => this.photos.backup(),
      "Photos téléchargées. Vérifiez les fichiers dans vos téléchargements.",
    );
  }
  refresh() {
    void this.s.run(() => this.s.refresh(), "Données actualisées.");
  }
  reset() {
    void this.s.run(async () => {
      await this.photos.clearDemo();
      this.s.resetDemo();
      this.confirmReset.set(false);
    });
  }
  logout() {
    void this.s.run(async () => {
      await this.s.exit();
      await this.router.navigateByUrl("/auth");
    });
  }
}
