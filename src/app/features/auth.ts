import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Store } from "../core/store";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<section class="auth-card">
    <span class="eyebrow">NOTRE MARIAGE · مساحة خاصة</span>
    <div class="auth-flower">✧</div>
    <h1>Les plus beaux jours<br />se préparent à deux.</h1>
    <p>
      Votre Khotoba, votre Drib Sdak.<br />Tous vos choix, dans un seul écrin.
    </p>
    @if (s.recovering()) {
      <form [formGroup]="form" (ngSubmit)="changePassword()">
        <label
          >Nouveau mot de passe<input
            type="password"
            formControlName="password"
            autocomplete="new-password"
            minlength="10" /></label
        ><button
          class="primary"
          [disabled]="form.controls.password.invalid || s.busy()"
        >
          Enregistrer le mot de passe
        </button>
      </form>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label
          >Adresse email<input
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="vous@exemple.fr" /></label
        ><label
          >Mot de passe<input
            type="password"
            formControlName="password"
            [autocomplete]="
              signup() ? 'new-password' : 'current-password'
            " /></label
        ><small>10 caractères minimum.</small
        ><button
          class="primary"
          [disabled]="form.invalid || s.busy() || !s.configured()"
        >
          {{ signup() ? "Créer mon compte" : "Entrer dans notre espace" }}
        </button>
      </form>
      <div class="row wrap">
        <button (click)="signup.set(!signup())">
          {{ signup() ? "J’ai déjà un compte" : "Créer un compte" }}</button
        ><button (click)="reset()" [disabled]="!s.configured()">
          Mot de passe oublié
        </button>
      </div>
      @if (!s.configured()) {
        <p class="hint">
          La connexion privée nécessite la configuration Supabase décrite dans
          le README.
        </p>
      }
      <div class="divider">ou découvrez l’expérience</div>
      <button class="button" (click)="demo()">
        Explorer la démonstration →</button
      ><small class="hint">Données fictives · aucun compte nécessaire</small>
    }
  </section>`,
})
export class Auth {
  readonly s = inject(Store);
  private readonly router = inject(Router);
  readonly signup = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(10)]],
  });
  async submit() {
    if (this.form.invalid) return;
    await this.s.run(async () => {
      const v = this.form.getRawValue();
      await this.s.auth(v.email, v.password, this.signup());
      if (this.s.session()) await this.router.navigateByUrl("/");
    });
  }
  async demo() {
    await this.s.startDemo();
    await this.router.navigateByUrl("/");
  }
  reset() {
    if (this.form.controls.email.invalid) {
      this.s.error.set("Saisissez une adresse email valide.");
      return;
    }
    void this.s.run(() => this.s.resetPassword(this.form.controls.email.value));
  }
  async changePassword() {
    await this.s.run(async () => {
      await this.s.updatePassword(this.form.controls.password.value);
      this.s.recovering.set(false);
      await this.router.navigateByUrl("/");
    }, "Mot de passe mis à jour.");
  }
}
