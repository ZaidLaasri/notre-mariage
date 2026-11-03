import { provideAppInitializer, inject } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, Routes, Router } from "@angular/router";
import { App } from "./app/layout/app";
import { Store } from "./app/core/store";
const guard = () =>
  inject(Store).active() || inject(Router).createUrlTree(["/auth"]);
const routes: Routes = [
  {
    path: "auth",
    loadComponent: () => import("./app/features/auth").then((m) => m.Auth),
  },
  {
    path: "",
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/dashboard").then((m) => m.Dashboard),
  },
  {
    path: "ceremonies",
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/ceremonies").then((m) => m.Ceremonies),
  },
  {
    path: "prestations",
    canActivate: [guard],
    loadComponent: () => import("./app/features/offers").then((m) => m.Offers),
  },
  {
    path: "prestations/:id",
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/offer-detail").then((m) => m.OfferDetail),
  },
  {
    path: "comparaisons",
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/comparisons").then((m) => m.Comparisons),
  },
  {
    path: "budget",
    canActivate: [guard],
    loadComponent: () => import("./app/features/budget").then((m) => m.Budget),
  },
  {
    path: "invites",
    canActivate: [guard],
    loadComponent: () => import("./app/features/guests").then((m) => m.Guests),
  },
  {
    path: "parametres",
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/settings").then((m) => m.Settings),
  },
  {
    path: "trousseau",
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/trousseau").then((m) => m.Trousseau),
  },
  {
    path: "timeline",
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/timeline").then((m) => m.Timeline),
  },
  {
    path: "inspirations",
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/moodboards").then((m) => m.Moodboards),
  },
  ...["dfou3", "tenues", "planning"].map((path) => ({
    path,
    canActivate: [guard],
    loadComponent: () =>
      import("./app/features/planning").then((m) => m.Planning),
  })),
  { path: "**", redirectTo: "" },
];
bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideAppInitializer(() => inject(Store).init()),
  ],
}).catch(console.error);
