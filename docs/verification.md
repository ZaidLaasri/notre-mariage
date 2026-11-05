# Vérifications effectuées — 2 novembre 2026

## Invitation par email — 5 novembre 2026

Build de production et typecheck strict réussis. Vingt-cinq tests applicatifs passent, dont cinq nouveaux contrôles : normalisation de l'adresse et URL de redirection, appel Supabase Auth avec le code de l'invitation concernée, erreurs SMTP/quota avec secours manuel, acceptation via la RPC sécurisée existante et nettoyage du code seulement après succès, rejet des codes d'URL malformés/manquants. Les réponses Auth sont simulées : aucun email réel n'a été envoyé par les tests.

L'interface Paramètres demande l'envoi après création de l'invitation ; la page publique `/rejoindre` permet la vérification Auth et l'acceptation explicite. Le SMTP du projet n'est pas encore configuré selon le propriétaire. L'envoi réel, la réception, les redirections Auth et la recette sur un autre appareil restent à effectuer après configuration du dashboard. Aucun secret SMTP, backend personnalisé ou nouvelle migration SQL n'est ajouté. Voir [le guide d'activation](email-invitations.md).

## Complément — évolution du 3 novembre 2026

**Build Angular de production et typecheck strict réussis, sans avertissement.** Bundle initial ~523 Ko brut / 129 Ko transféré estimé ; nouvelles pages lazy. Vingt tests applicatifs réussis après intégration des évolutions.

Vérifications supplémentaires :

- Jhaz : création/modification/consultation/suppression via services, engagement idempotent, estimation non comptée deux fois, conservation de la dépense lors de la suppression d'un article.
- Moodboards/photos : imports multiples et Jhaz via le service réutilisé, métadonnées/légendes/principale, stockage Blob avec IndexedDB simulée, suppression et nettoyage après échec d'écriture. Le décodeur/compresseur navigateur est remplacé par un Blob dans ces tests ; le décodage réel d'une photo sur smartphone n'est pas attesté.
- Timeline : heures après minuit, fin postérieure au début, chevauchements (hors étapes annulées et cérémonies différentes), réordonnancement dans les deux sens et prestataires associés. Le programme exporté échappe le HTML et exclut notes internes, responsabilités, IDs et étapes annulées.
- Mode démo ancien : conservation des prestataires et inspirations sauvegardés lors de l'ajout de nouvelles collections.
- `tests/extensions-security.sql` sur PostgreSQL 16 : CRUD des nouvelles entités, accès des deux membres aux nouveaux médias privés, refus d'accès d'un tiers, FK inter-mariages, commentaires protégés par auteur, engagement unique et ordre complet exigé. Le helper d'initialisation privé est inaccessible aux rôles clients.
- `tests/migration-upgrade.mjs` : création d'une base jetable en 003 avec anciennes données, application de 004, comparaison des prestataires, inspirations et pièces jointes avant/après ; données conservées.
- `tests/concurrency.mjs` : contrôle des acomptes toujours réussi et deux engagements Jhaz concurrents retournant la même dépense.
- Ancienne suite SQL `tests/security.sql` toujours réussie. HTTP 200 vérifié pour `/trousseau` sur le serveur de développement.

**Limites inchangées :** le navigateur intégré ne propose aucun navigateur dans cette session ; la recette visuelle responsive, les glisser-déposer tactiles, l'impression/PDF et les clics de bout en bout ne sont pas attestés. Aucun projet Supabase réel ni déploiement Vercel n'a été configuré ou validé. Les tests SQL utilisent une simulation locale des schémas Auth/Storage ; ils ne remplacent pas la recette des URLs signées et des deux véritables comptes sur Supabase.

Pour une base existante en 003, sauvegarder puis appliquer seulement `004_wedding_extensions.sql`. Pour rejouer la suite locale, ajouter cette migration après 003 dans la commande ci-dessous, puis :

```powershell
psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f tests/security.sql -f tests/extensions-security.sql
node tests/migration-upgrade.mjs
node tests/concurrency.mjs
npm test
npm run typecheck
npm run build
```

Le cluster local de tests est arrêté après vérification ; le serveur Angular existant reste disponible pour consulter la démo. Les modèles fictifs supplémentaires sont visibles après une réinitialisation explicite de la démo, sans modification du mariage réel.

## Première livraison

- Angular installé : framework 22.2.4, CLI/build 22.2.5. Runtime local Node 24.22.2. TypeScript strict 6.0.x.
- Build de production réussi, zéro erreur ou avertissement Angular. Bundle initial ~511 Ko brut / 126 Ko transféré estimé ; les écrans et la bibliothèque ZIP sont chargés à la demande.
- Typecheck TypeScript réussi.
- Neuf tests applicatifs réussis : centimes, conversions rationnelles, validation de paiement, indépendance des offres/dépenses, CSV cité et multiline, neutralisation des formules CSV, doublons, persistance démo/décision/réservation, erreur distante sans mutation locale, export sans session.
- PostgreSQL 16 local jetable : trois migrations appliquées avec succès. Les schémas Auth et Storage ont été simulés par `tests/postgres-bootstrap.sql`, sans aucun accès à un projet réel.
- `tests/security.sql` réussi : deux membres partagent un espace ; un troisième compte ne lit/modifie pas l'autre mariage ; accès Storage isolé ; FK inter-mariages refusées ; avis de l'autre auteur non modifiable ; token non réutilisable ; paiement excédentaire et réduction sous le payé refusés ; sélection unique et réversible sans annulation implicite de réservation ; réservation sans paiement implicite ; limite de quatre comparaisons.
- `tests/concurrency.mjs` réussi : deux transactions tentent chacune un acompte de 6 000 centimes sur une dépense de 10 000 ; une seule est validée, le total reste 6 000.
- Audit npm à l'installation : aucune vulnérabilité signalée.
- Serveur Angular démarré sur http://127.0.0.1:4200/ ; réponses HTTP 200 vérifiées pour l'accueil, `/prestations` et `/runtime-config.json`. Cela confirme le service des fichiers et le fallback SPA, sans constituer une recette navigateur.

## Limites de preuve

Le navigateur intégré a indiqué qu'aucun navigateur n'était disponible. La compilation des templates est vérifiée, mais ni la recette visuelle responsive, ni les clics au clavier, ni l'import photo sur smartphone n'ont été exécutés dans un navigateur dans cette session. Les breakpoints et le piège de focus sont implémentés ; ils restent à examiner visuellement.

Aucun projet Supabase distant n'est configuré et aucun déploiement Vercel n'est effectué. La simulation PostgreSQL vérifie SQL/RLS et transactions, sans tester les véritables services Auth, email, REST et Storage de Supabase. Effectuer la recette du guide de déploiement sur le projet réel avant d'y placer des informations personnelles.

## Rejouer les tests SQL localement

Utiliser exclusivement une base de test vide, jamais une base existante contenant des données. PostgreSQL 16 doit être disponible.

```powershell
psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -v ON_ERROR_STOP=1 -f tests/postgres-bootstrap.sql -f supabase/migrations/001_initial.sql -f supabase/migrations/002_decisions.sql -f supabase/migrations/003_media.sql -f tests/security.sql
node tests/concurrency.mjs
```

Le bootstrap crée des rôles et schémas factices, uniquement pour une instance locale jetable. `security.sql` annule ses fixtures par rollback ; le test concurrent nettoie les siennes. Le cluster de cette session est dans `.tools/pgdata`, ignoré par Git, lié exclusivement à 127.0.0.1:55432 pendant les tests, puis arrêté. Il ne constitue pas le backend de l'application.
