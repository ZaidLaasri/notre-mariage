# Production — 5 novembre 2026

- Application : https://notre-mariage-wheat.vercel.app
- Espace/projet : `zaid-s-projects4/notre-mariage`.
- Plan : Hobby, vérifié par l'API Vercel avant publication ; aucun service payant activé.
- Déploiement : `dpl_4c6D5ZE7KkwyBiEGtYZXmEe6Dptv`, statut READY / PROMOTED, cible production.
- Source applicative : commit `d163414`, publié sur `https://github.com/ZaidLaasri/notre-mariage`.
- Build distant Angular réussi, sortie `dist/notre-mariage/browser`.
- `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` configurées dans l'environnement production Vercel depuis la configuration publique locale, sans afficher leurs valeurs. Les fichiers `.env`, outils locaux et configurations générées sont exclus des envois et de Git.
- HTTP 200 vérifié sur `/`, `/auth`, `/rejoindre`, `/parametres`, avec les ressources JS/CSS accessibles. La configuration publique servie correspond à celle du projet local. Une requête anonyme vers les mariages Supabase n'expose aucun mariage.
- Build local et 25 tests applicatifs réussis avant publication. Aucune session utilisateur ni invitation réelle n'a été créée pour les tests de production.

## Redirections Supabase

À enregistrer par le propriétaire dans **Authentication → URL Configuration** :

```text
Site URL
https://notre-mariage-wheat.vercel.app

Redirect URLs à ajouter
https://notre-mariage-wheat.vercel.app/auth
https://notre-mariage-wheat.vercel.app/rejoindre**
```

Conserver les URLs localhost déjà utilisées pour le développement. Le propriétaire a confirmé l'enregistrement de ces paramètres le 5 novembre 2026. L'agent n'a pas accès au dashboard Supabase pour les relire. Tester ensuite la connexion, une photo et un email d'invitation depuis l'URL publique, avec les comptes du couple.

## Mises à jour

La première liaison automatique du dépôt GitHub a été refusée par Vercel. La publication actuelle a été réalisée par la CLI depuis le projet local. Si le dépôt n'est pas encore lié, ouvrir https://vercel.com/zaid-s-projects4/notre-mariage/settings/git puis connecter `ZaidLaasri/notre-mariage`, en autorisant l'application GitHub Vercel à accéder à ce dépôt. Conserver la branche de production `main`.

Sans cette liaison, publier les changements depuis le dossier du projet avec `vercel deploy --prod --scope zaid-s-projects4` après les tests. Aucun mot de passe SMTP ou secret serveur ne doit être ajouté aux variables publiques du frontend.
