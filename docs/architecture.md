# Architecture

Angular standalone, TypeScript strict, Signals pour l'état local et les calculs dérivés, Router et pages chargées à la demande, Reactive Forms, SCSS sans framework UI lourd. SDK officiel Supabase directement dans les services. Aucune API serveur personnalisée ni clé service_role côté navigateur.

`core` : modèles, calculs monétaires purs, auth, persistance et Storage. `features` : écrans métier. `layout` : navigation desktop/mobile. `shared` : galerie et présentation réutilisable. Les opérations sensibles multi-tables (espace, invitation, réservation/paiements) utilisent PostgreSQL/RPC transactionnelles. La RLS, pas les guards Angular, protège les données.

Configuration publique injectée au build depuis variables ; clé publishable autorisée dans le bundle. Les secrets DB restent exclusivement dans le dashboard ou CLI Supabase. Rafraîchissement manuel et au retour de focus ; pas d'abonnement Realtime permanent pour deux utilisateurs. Conflits : dates updated_at et rechargement avant édition ; verrouillage transactionnel des paiements et invitations.

Node local possible pour conserver le Node système. Vercel utilise Node 24. Déploiement SPA statique avec fallback index.html. Les photos sont redimensionnées côté client, téléchargées en URLs signées et conservées dans un bucket privé. Une photo peut être principale ; l'ordre est explicite.

Évolution : pages lazy `trousseau`, `moodboards` et `timeline`, avec templates HTML séparés ; l'ancien bloc Inspirations de Planning est retiré. `OfferSpecialization` complète les offres beauté/transport à partir de modèles de critères communs. `Gallery` et `Photos` sont étendus aux cibles Jhaz ; aucune nouvelle infrastructure Storage. Fonctions pures `timeline.ts` pour horaires, chevauchements, ordre et export public à champs limités. Les RPC transactionnelles complètent le Store pour l'engagement Jhaz, les prestataires d'une étape et les réordonnancements. Les exports JSON/ZIP récupèrent automatiquement les nouvelles données.

Pas de dépendance runtime supplémentaire pour ces évolutions. `fake-indexeddb` (Apache-2.0) est un outil de test local uniquement ; aucun service payant, CDN, SMTP ou abonnement ajouté. Les quotas restent à surveiller avec l'augmentation du nombre de photos.
