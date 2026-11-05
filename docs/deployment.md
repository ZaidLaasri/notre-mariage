# Installation, Supabase, Vercel et sauvegardes

## Supabase

Créer manuellement un projet Free, idéalement dans une région proche. Ne pas activer de module payant. Dans SQL Editor, exécuter les migrations versionnées `001_initial.sql`, `002_decisions.sql`, `003_media.sql`, `004_wedding_extensions.sql` dans cet ordre une fois sur une base vierge. Pour un projet déjà en 003, sauvegarder puis appliquer **uniquement 004** ; ne pas recréer les anciennes tables. Conserver les migrations suivantes dans le même dossier ; utiliser ensuite la CLI Supabase et `supabase db push` avec un projet lié si souhaité. Ne jamais conserver le mot de passe de base en Git.

Auth : activer email/password, conserver la confirmation email, Site URL = URL Vercel finale, Redirect URLs = `http://127.0.0.1:4200/auth` et `https://votre-projet.vercel.app/auth`. Les liens de confirmation et récupération dépendent du service email Auth et de ses limites ; le service fourni est restrictif et peut nécessiter une configuration SMTP personnelle pour livrer au second compte. Aucun abonnement SMTP n'est requis par le code, aucune promesse d'envoi illimité. Tester réellement les deux adresses.

Invitations par email : configurer également les redirections `/rejoindre` et leur paramètre d'invitation, puis Custom SMTP. Le [guide dédié](email-invitations.md) décrit la configuration avec un compte Gmail existant, les modèles Confirm signup/Magic Link, les limites et le secours manuel. Le mot de passe SMTP se configure uniquement dans le dashboard Supabase. Le frontend appelle Supabase Auth avec la clé publique ; aucune fonction serveur ni migration supplémentaire n'est requise.

Le bucket `wedding-photos` est privé, limité à 5 Mo par objet et JPEG/PNG/WebP. L'application accepte jusqu'à 20 Mo avant compression, redimensionne à 1600 px et crée une miniature 420 px. HEIC doit être converti sur l'appareil. Les URLs signées durent 30 min et sont renouvelées lors de la prochaine demande après expiration du cache. Les anciens chemins restent valides ; les nouveaux objets suivent `wedding_uuid/type/element_uuid/fichier.webp`. Le type couvre les offres, inspirations, tenues et articles/ensembles du trousseau. Ne pas rendre le bucket public. Les politiques existantes basées sur le premier dossier protègent également ces nouveaux médias.

Le programme prestataires est téléchargé en HTML autonome sans clé, URL signée ou appel distant. L'action Imprimer permet l'enregistrement PDF depuis le navigateur. Seuls les champs explicitement publics sont inclus ; relire les titres, lieux et notes partageables avant envoi. Les copies transmises ne se mettent pas à jour automatiquement.

La clé publishable/anon peut être intégrée au frontend ; elle ne donne pas accès sans session et RLS. Aucune clé service_role, sb_secret ou mot de passe PostgreSQL dans le frontend. RLS active sur toutes les tables métier ; les fonctions d'appartenance évitent une récursion RLS ; les FK composites interdisent les relations inter-mariages. Les invitations sont accessibles uniquement via RPC sécurisées.

Configuration PowerShell :

```powershell
$env:SUPABASE_URL='https://VOTRE-PROJET.supabase.co'
$env:SUPABASE_PUBLISHABLE_KEY='sb_publishable_VOTRE_CLE_PUBLIQUE'
node scripts/config.mjs
npm start
```

Ne pas ajouter `src/runtime-config.json` à Git. Le build le génère à partir de l'environnement et le sert comme un fichier public. Redémarrer le serveur local après modification de configuration. Les identifiants et sessions ne sont jamais inclus dans les exports métier.

## Vercel Hobby

Créer un dépôt GitHub privé, y pousser uniquement le dossier projet sans `.tools`, `.npm-cache`, `.env` ni configuration locale. Importer ce dépôt dans Vercel Hobby. Sélectionner Node **24.x**, commande `npm run build`, répertoire de sortie `dist/notre-mariage/browser`. Ajouter les deux variables publiques Supabase dans les environnements souhaités puis déployer. `vercel.json` prévoit le fallback SPA et des headers de base. Tester les URLs profondes `/prestations` et `/auth`, ainsi que récupération de mot de passe et upload depuis mobile. HTTPS est fourni par Vercel. Aucun domaine payant requis.

Le déploiement n'est considéré réussi qu'après statut Ready et test de la véritable URL. Le Hobby convient à cet usage personnel non commercial ; ne pas passer en Pro automatiquement.

## Quotas vérifiés le 2 novembre 2026

[Supabase Free](https://supabase.com/pricing) : base 500 Mo, fichiers 1 Go, egress 5 Go et cached egress 5 Go, 50 000 utilisateurs actifs mensuels, deux projets actifs ; pause après une semaine d'inactivité. Surveiller Storage et egress dans le dashboard, surtout avec les galeries. Compression WebP et miniatures locales évitent de dépendre des transformations d'images payantes. Les chiffres peuvent changer : revérifier la page officielle avant mise en service.

[Vercel Hobby](https://vercel.com/docs/plans/hobby) : usage personnel non commercial, quotas propres au plan, certaines ressources deviennent indisponibles jusqu'au renouvellement lorsque la limite est atteinte. Ce projet sert des fichiers statiques sans fonctions serveur. Lire les quotas affichés sur le compte et [les limites Vercel](https://vercel.com/docs/limits). La gratuité n'est pas illimitée.

## Sauvegardes

Supabase Free ne propose pas les sauvegardes automatiques restaurables des plans payants. [Documentation officielle](https://supabase.com/docs/guides/platform/backups). Chaque semaine et avant toute migration : exporter le JSON métier, télécharger le ZIP des photos depuis Paramètres, garder une seconde copie chiffrée sur un autre support personnel. Le ZIP conserve les chemins et inclut un manifeste, les miniatures, les galeries et les justificatifs référencés. Son contenu est limité à 100 Mo pour éviter de saturer un téléphone ; au-delà, copier le bucket depuis le dashboard. Les sauvegardes PostgreSQL ne contiennent pas les objets Storage.

Pour une sauvegarde exhaustive et restaurable : utiliser la CLI `supabase db dump` depuis un environnement sûr pour schéma et données, puis copier séparément tous les fichiers du bucket via le dashboard ou un outil S3 personnel, y compris les objets orphelins non référencés dans les métadonnées. Conserver le manifeste des chemins fourni dans le JSON/ZIP. Vérifier périodiquement une restauration dans un projet de test. L'import de restauration JSON dans l'interface n'est pas livré : ne pas confondre export lisible et restauration automatique.

Suppression d'un mariage : non proposée au client, car une cascade SQL ne supprimerait pas les objets Storage. Pour une suppression complète, exporter d'abord, retirer les fichiers via Storage, puis supprimer l'espace depuis un contexte administrateur sécurisé. La réinitialisation de démo ne touche jamais aux données réelles.

## Recette avant usage réel

Créer deux mariages de test et trois comptes. A/B partagent W1, C possède W2. Vérifier par SDK/REST avec leurs sessions que A ne lit/modifie aucune donnée de W2, qu'une FK vers un prestataire de W2 échoue et qu'une URL signée ne peut être créée pour les photos de W2. Vérifier que l'avis de B est lisible mais non modifiable par A. Essayer invitation expirée, mauvais email, token déjà utilisé et troisième membre. Tester deux paiements simultanés dépassant ensemble le solde. Se déconnecter et vérifier le refus des accès. Nettoyer ces données après recette.
