import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Store } from "../core/store";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<section class="auth-card narrow">
    <span class="eyebrow">NOTRE MARIAGE · UNE AVENTURE À DEUX</span>
    <h1>Rejoindre ma moitié</h1>
    @if (s.demo()) {
      <p>Quittez la démonstration pour accepter une véritable invitation.</p>
      <button (click)="exitDemo()">Quitter la démo</button>
    } @else if (s.session()) {
      <p>
        Vous êtes connecté avec <strong>{{ s.session()?.user?.email }}</strong
        >.
      </p>
      @if (s.wedding()) {
        <p>Votre compte a déjà accès à un espace mariage.</p>
        <a class="button primary" routerLink="/">Ouvrir notre espace</a>
      } @else {
        <p>
          Vérifiez que cette adresse est celle qui a été invitée, puis confirmez
          votre participation.
        </p>
        <form [formGroup]="passwordForm" (ngSubmit)="accept()">
          <label
            >Choisir un mot de passe pour mes prochaines connexions
            (facultatif)<input
              type="password"
              formControlName="password"
              autocomplete="new-password" /></label
          ><small
            >Au moins 10 caractères si vous souhaitez définir un mot de
            passe.</small
          ><button
            class="primary"
            [disabled]="passwordForm.invalid || s.busy()"
          >
            Accepter l’invitation et rejoindre notre mariage
          </button>
        </form>
        <a routerLink="/parametres">Utiliser un code privé à la place</a>
      }
      <button (click)="logout()" [disabled]="s.busy()">
        Utiliser un autre compte
      </button>
    } @else {
      <p>
        Ouvrez le lien reçu par email pour vérifier votre adresse. Si l’email
        contient un code numérique, vous pouvez aussi le saisir ici.
      </p>
      <form [formGroup]="otp" (ngSubmit)="verify()">
        <label
          >Adresse invitée<input
            type="email"
            formControlName="email"
            autocomplete="email" /></label
        ><label
          >Code numérique reçu par email<input
            formControlName="token"
            inputmode="numeric"
            autocomplete="one-time-code" /></label
        ><button
          class="primary"
          [disabled]="otp.invalid || s.busy() || !s.configured()"
        >
          Vérifier mon adresse
        </button>
      </form>
      <a class="button" routerLink="/auth" [queryParams]="{ next: 'rejoindre' }"
        >J’ai déjà un compte : me connecter</a
      >
      <p class="hint">
        Si le lien de connexion a expiré, demandez à votre moitié de renvoyer
        l’email. Une connexion seule n’accorde pas l’accès au mariage.
      </p>
    }
  </section>`,
})
export class Join {
  readonly s = inject(Store);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  readonly otp = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    token: ["", [Validators.required, Validators.pattern(/^\d{6,10}$/)]],
  });
  readonly passwordForm = this.fb.nonNullable.group({
    password: ["", Validators.minLength(10)],
  });
  verify() {
    if (this.otp.invalid) return;
    void this.s.run(async () => {
      const v = this.otp.getRawValue();
      await this.s.verifyInvitationOtp(v.email, v.token);
    }, "Adresse vérifiée. Vous pouvez accepter l’invitation.");
  }
  accept() {
    if (this.passwordForm.invalid) return;
    void this.s.run(async () => {
      await this.s.acceptEmailInvitation();
      const password = this.passwordForm.controls.password.value;
      if (password) {
        try {
          await this.s.updatePassword(password);
        } catch {
          this.s.error.set(
            "Vous avez rejoint le mariage. Le mot de passe n’a pas pu être enregistré ; utilisez « Mot de passe oublié » pour le définir.",
          );
        }
      }
      await this.router.navigateByUrl("/");
    }, "Vous avez rejoint votre espace partagé.");
  }
  logout() {
    void this.s.run(() => this.s.exit());
  }
  exitDemo() {
    void this.s.run(() => this.s.exit());
  }
}
