# Notre Mariage

Application Angular privée pour préparer la Khotoba et le Drib Sdak à deux. Le projet précédent `../mariage-zaid-yasmine` est préservé.

**Application publiée : https://notre-mariage-wheat.vercel.app** — Vercel Hobby, production vérifiée le 5 novembre 2026. Voir [l'état du déploiement](docs/deployment-status.md) et les redirections Supabase à configurer pour les emails.

## Démarrer

Node **24.15+ (24.x)** requis. Installation standard :

```powershell
npm ci
node scripts/config.mjs
npm start
```

Dans ce workspace, un Node 24 isolé est installé dans `.tools`. Sans modifier votre Node système :

```powershell
& ./.tools/node_modules/node/bin/node.exe scripts/config.mjs
& ./.tools/node_modules/node/bin/node.exe node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1
```

Ouvrir http://127.0.0.1:4200 et choisir **Explorer la démonstration**. La démo comporte 4 traiteurs, 3 makeup artists, 5 lieux, 3 Neggafas, invités, dépenses, paiements, tâches, tenues et ensembles Dfou3 fictifs. Les photos de démo sont vos propres imports ; les emplacements vides ne prétendent pas représenter des prestataires réels. Données de démo en localStorage, images en IndexedDB, aucune écriture Supabase. Réinitialisation explicite dans Paramètres.

## Configurer le vrai mariage

Les commandes `npm start` et `npm run build` lisent automatiquement `.env`, puis `.env.local`. Les variables du terminal ou de Vercel restent prioritaires. Utiliser `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY`. Ces fichiers locaux sont ignorés par Git ; `.env.example` n'est pas chargé. Avec la commande directe `ng serve`, exécuter d'abord `node scripts/config.mjs`.

Suivre [le guide de déploiement](docs/deployment.md). Les comptes et services externes sont gérés par le propriétaire. Le projet est désormais publié sur Vercel ; les prochains déploiements suivent les instructions du guide.

1. Créer un projet **Supabase Free** et exécuter les migrations `supabase/migrations/*.sql` dans l’ordre numérique sur une base neuve.
2. Configurer les URLs Auth et garder la vérification d'email activée.
3. Définir `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` dans l'environnement du terminal puis `node scripts/config.mjs`. Le fichier généré est ignoré par Git. Ces deux valeurs sont publiques par conception ; aucune clé secrète/service_role.
4. Créer le premier compte, confirmer son email, se connecter et créer le mariage dans Paramètres.
5. Dans Paramètres → Inviter ma moitié, le propriétaire demande l'envoi de l'invitation par email. Le destinataire vérifie son adresse puis confirme l'acceptation sur `/rejoindre`. Le code manuel reste disponible si l'envoi échoue. **Configurer SMTP et les URLs de redirection Auth avant l'envoi réel** : voir [le guide des invitations par email](docs/email-invitations.md). Le lien localhost ne fonctionne que sur l'ordinateur du serveur ; utiliser l'URL publique pour inviter depuis un autre appareil.

## Fonctionnalités de cette version

- Dfou3 / Tyafer : modification des ensembles (nom, couleur, cérémonie) et des articles/tayfour ; suppression avec confirmation du nombre d'articles et de photos concernés. Les dépenses/paiements sont conservés. Aucune migration supplémentaire nécessaire.

- Navigation responsive, dashboard calculé depuis les données, cérémonies et budgets configurables.
- Besoins et catégories ; prestataires réutilisables ; offres avec statut, prix, conditions, critères et favoris.
- Photos multiples compressées WebP, miniatures, légendes, principale, carrousel et agrandissement.
- Comparaison de 2–4 offres du même besoin, avis par membre, décision réversible et réservation explicite.
- Dépenses indépendantes des offres, paiements partiels, solde, consolidation MAD/EUR au taux manuel.
- Foyers, invités partagés, invitations par cérémonie, recherche, CSV et détection de doublons.
- Calendrier mensuel, tâches et échéances, checklists facultatives, ensembles Dfou3/Tyafer, suivi simple des tenues, carnet d'idées avec tags et galeries privées.
- Justificatifs de paiement en images. Export JSON métier et archive ZIP de toutes les photos référencées, miniatures comprises. Auth et export excluent les sessions/secrets.

## Évolution du 3 novembre 2026

- **Trousseau — الدهاز** indépendant du Dfou3 : catégories personnalisables, ensembles assortis, articles, photos, prix et quantités, responsables, recherche, états et progression. Lien à une dépense existante ou création explicite d'un engagement unique ; le coût prévu n'est pas ajouté automatiquement au budget.
- **Moodboards** multiples : import de plusieurs images, grille/mosaïque, galeries privées réutilisées, couleurs, thèmes, tags, commentaires individuels, sources HTTPS et associations aux prestataires, propositions, tenues, besoins et tâches. Les anciennes inspirations restent visibles dans la vue globale. Réorganisation par glisser-déposer ou boutons.
- **Timeline — Jour J** par cérémonie : horaires (dont après minuit), statuts, plusieurs prestataires, notes privées et partageables, chevauchements signalés, ordre manuel ou vue chronologique, mode consultation mobile, impression/enregistrement PDF via le navigateur et programme HTML autonome à transmettre aux prestataires.
- **Makeup et Hair / Coiffure** distincts : essais, accessoires, produits, durée et retouches. Un même prestataire et une référence de forfait peuvent relier deux offres distinctes.
- **Voiture de cortège** dans Transports : critères véhicule/location/chauffeur/décoration, galerie et comparaison existantes, puis coordination dans la Timeline.

**Base existante : appliquer uniquement `supabase/migrations/004_wedding_extensions.sql` après les migrations déjà installées.** Sur une base neuve, appliquer 001 à 004 dans l'ordre. Ne pas rejouer 001–003 sur un mariage existant. La migration additive a été testée avec des données antérieures. Les données de démonstration déjà enregistrées sont conservées ; pour voir les nouveaux exemples fictifs, réinitialiser explicitement la démo depuis Paramètres.

[Règles et intégration de cette évolution](docs/functional-evolution.md) · [Preuves de vérification](docs/verification.md).

## Limites à connaître

Cette première itération ne termine pas toute la phase 4 du cahier des charges : accessoires détaillés de tenues, plans de tables, critères pondérés, formulaires structurés de menus/options et import de restauration JSON restent à développer. Les informations de menus/options peuvent être saisies dans les champs inclus/exclus et critères personnalisés des offres. Les champs SQL préparent certaines extensions. Les comparaisons mobiles sont empilées. Les membres sont limités à deux ; pas encore de rôles famille.

Pas de notifications push/email de tâches. Actualisation au retour de focus ou via Paramètres, sans Realtime permanent. Les conflits d'édition sur les lignes existantes sont détectés via updated_at ; une série d'écritures UI peut être partielle en cas de coupure (ex. prestataire créé avant son offre). Rafraîchir puis reprendre ; aucune donnée réelle n'est remplacée par une démo.

RLS et Storage sont préparés dans les migrations, mais leur recette sur **votre projet Supabase** reste indispensable. La vérification navigateur visuelle dépend du navigateur disponible dans la session. Voir les preuves et limites dans `docs/verification.md`.

## Vérifier

```powershell
npm test
npm run typecheck
npm run build
```

Avec le Node local, appeler les binaires via `.tools/node_modules/node/bin/node.exe` : `node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`, `node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`, `node_modules/@angular/cli/bin/ng.js build`.

## Documents

[Vision](docs/product-vision.md) · [Spécifications](docs/functional-specifications.md) · [User stories](docs/user-stories.md) · [Modèle relationnel](docs/data-model.md) · [Architecture](docs/architecture.md) · [Design system](docs/design-system.md) · [Roadmap](docs/roadmap.md) · [Déploiement et sauvegardes](docs/deployment.md).
