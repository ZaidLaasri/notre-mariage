import { Component, inject, signal, effect } from "@angular/core";
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
} from "@angular/router";
import { Store } from "../core/store";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (!s.ready()) {
      <div class="loading">Préparons votre espace…</div>
    } @else {
      @if (s.active()) {
        <aside [class.mobile-open]="menu()">
          <a class="brand" routerLink="/"
            ><span class="brand-mark">ن</span
            ><strong
              >Notre Mariage<small>CHAQUE DÉTAIL, ENSEMBLE</small></strong
            ></a
          >
          <p class="nav-label">NOTRE ORGANISATION</p>
          <nav aria-label="Navigation principale">
            @for (item of links; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                (click)="menu.set(false)"
                ><span>{{ item.icon }}</span
                >{{ item.label }}</a
              >
            }
          </nav>
          <div class="sidebar-note">
            <span>✧</span>
            <p>Deux histoires.<br />Une belle aventure.</p>
            <small>Khotoba · Drib Sdak</small>
          </div>
        </aside>
        <div class="workspace">
          <header>
            <button
              class="mobile-toggle"
              (click)="menu.set(!menu())"
              aria-label="Ouvrir la navigation"
              [attr.aria-expanded]="menu()"
            >
              ☰</button
            ><span class="header-title">Notre carnet de mariage</span>
            <div class="row">
              <span class="status-dot"></span
              ><small>{{
                s.demo() ? "Démo locale" : "Espace privé du couple"
              }}</small
              ><button
                class="avatar"
                routerLink="/parametres"
                aria-label="Paramètres du couple"
              >
                ♡
              </button>
            </div>
          </header>
          @if (s.demo()) {
            <div class="demo-banner">
              Démonstration · données fictives enregistrées sur cet appareil
              <button (click)="exit()">Quitter la démo</button>
            </div>
          }
          <main id="main">
            <a class="skip" href="#content">Aller au contenu</a>
            <div id="content" tabindex="-1"></div>
            @if (!s.demo() && !s.wedding()) {
              <section class="panel narrow">
                <h1>Un espace pour vous deux</h1>
                <p>
                  Créez votre mariage ou acceptez une invitation dans les
                  paramètres.
                </p>
                <a routerLink="/parametres" class="button primary"
                  >Configurer notre espace</a
                >
              </section>
            }
            <router-outlet />
          </main>
          <footer>
            Notre Mariage <span>Fait pour vos plus beaux préparatifs ♡</span>
          </footer>
        </div>
      } @else {
        <main class="auth-main"><router-outlet /></main>
      }
      @if (s.error()) {
        <div class="toast error" role="alert">
          {{ s.error()
          }}<button (click)="s.error.set('')" aria-label="Fermer l’erreur">
            ×
          </button>
        </div>
      }
      @if (s.notice()) {
        <div class="toast" role="status">
          {{ s.notice()
          }}<button (click)="s.notice.set('')" aria-label="Fermer le message">
            ×
          </button>
        </div>
      }
      @if (s.busy()) {
        <div class="saving" role="status">Enregistrement en cours…</div>
      }
    }
  `,
})
export class App {
  readonly s = inject(Store);
  private readonly router = inject(Router);
  constructor() {
    effect(() => {
      if (
        this.s.ready() &&
        !this.s.active() &&
        location.pathname !== "/rejoindre"
      )
        void this.router.navigateByUrl("/auth");
    });
  }
  readonly menu = signal(false);
  readonly links = [
    { path: "/", label: "Vue d’ensemble", icon: "◈" },
    { path: "/ceremonies", label: "Nos cérémonies", icon: "✧" },
    { path: "/prestations", label: "Prestations & lieux", icon: "⌂" },
    { path: "/comparaisons", label: "Nos comparaisons", icon: "⇆" },
    { path: "/budget", label: "Budget & paiements", icon: "◔" },
    { path: "/invites", label: "Nos invités", icon: "♧" },
    { path: "/dfou3", label: "Dfou3 & Tyafer", icon: "◇" },
    { path: "/trousseau", label: "Trousseau — الدهاز", icon: "♧" },
    { path: "/timeline", label: "Timeline — Jour J", icon: "◷" },
    { path: "/tenues", label: "Tenues", icon: "♙" },
    { path: "/planning", label: "Planning & tâches", icon: "☷" },
    { path: "/inspirations", label: "Moodboards", icon: "▧" },
    { path: "/parametres", label: "Paramètres", icon: "⚙" },
  ];
  exit() {
    void this.s.run(async () => {
      await this.s.exit();
      await this.router.navigateByUrl(this.s.active() ? "/" : "/auth");
    });
  }
}
