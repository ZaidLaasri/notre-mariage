# Spécifications fonctionnelles

## Règles

Un mariage rassemble ses membres et cérémonies. Une cérémonie contient catégories et besoins. Une offre répond à un besoin et référence un prestataire réutilisable. La préférence individuelle, la décision commune, la réservation, la dépense et le paiement sont distincts.

Les montants sont des entiers en centimes ; la devise est MAD ou EUR. Un taux manuel rationnel convertit les montants vers MAD. Les engagements proviennent uniquement des dépenses validées ; les offres non retenues ne contribuent jamais aux dépenses. Les paiements ne peuvent dépasser le montant de leur dépense. Les invités appartiennent à un foyer et peuvent recevoir une invitation par cérémonie.

## Parcours et erreurs

Authentification → création/rejoindre un espace → cérémonies → besoin → offre → photos → comparaison → sélection → réservation → dépense → paiements. Toute écriture affiche attente, confirmation ou erreur ; une erreur distante ne doit jamais être présentée comme un succès. Les formulaires contrôlent champs requis, montants et URLs. La démo est explicitement locale, fictive et réinitialisable sans toucher au mariage réel.

## Catalogue

Recherche et filtres par cérémonie, catégorie et statut. Offre : coordonnées, conditions, tarif forfait/personne/article, inclus/exclus, disponibilité, critères personnalisés, favoris, galerie, avis individuels. Comparaison 2–4 offres du même besoin. Sur mobile : cartes et critères empilés. Sélection réversible sans paiement implicite.

## Vie du mariage

Budget consolidé et par cérémonie ; invités/foyers avec CSV ; tâches responsables et échéances ; ensembles Dfou3 et articles assortis ; tenues et essayages ; inspirations avec tags. Export métier JSON et copie séparée des fichiers Storage. Aucun rappel externe automatique.

## Acceptation sécurité

Un non-membre ne peut lire ni modifier de données ni télécharger les photos, même en appelant directement REST. Une référence vers un autre mariage est rejetée par FK composite. L'invitation est à usage unique, expirante, liée à l'email vérifié et limitée à deux membres. Les rôles ne sont pas modifiables depuis le client.

Invitation par email : création préalable par le propriétaire via la RPC existante, puis demande d'envoi Supabase Auth (nouveau compte ou compte existant). Le lien contient le code spécifique de cette invitation ; il est retiré de l'URL à l'arrivée et l'utilisateur confirme l'acceptation après vérification d'adresse. Le renvoi réutilise ce même code ; une nouvelle invitation remplace l'ancienne. Un refus SMTP/quota est affiché avec le code manuel de secours. Un succès de l'API d'envoi ne garantit pas la livraison dans la boîte de réception. Voir `email-invitations.md` pour la configuration externe.

## Évolution métier

Dfou3 : chaque ensemble peut être renommé, recoloré et rattaché à une autre cérémonie. Un cadeau/tayfour peut être modifié et déplacé vers un autre ensemble, en conservant son identifiant, ses photos, sa devise, son fournisseur, sa date d'achat et son état de livraison. Les dépenses restent indépendantes. La suppression d'un ensemble propose une confirmation explicite incluant ses articles et les photos de l'ensemble/des articles ; l'annulation n'effectue aucune écriture. La suppression d'un seul article conserve l'ensemble et ses autres articles.

Avant suppression distante, les données sont actualisées et comparées au contenu confirmé. Un changement exige une nouvelle confirmation. Les fichiers Storage et leurs métadonnées sont retirés avant les articles et l'ensemble, conformément aux FK existantes. Storage et PostgreSQL ne forment pas une transaction commune : une erreur peut laisser une suppression partiellement réalisée ; l'interface l'indique et demande une actualisation. Aucune dépense ou paiement n'est supprimé par ce parcours. Pas de nouvelle table ni migration.

Voir [les règles Jhaz, Moodboards et Timeline](functional-evolution.md). Le trousseau est distinct du Dfou3. Ses estimations ne deviennent des engagements qu'après action explicite et sa dépense peut être choisie dans le budget existant. Les moodboards partagent les photos entre les deux membres et préservent les anciennes inspirations non classées. La timeline du jour J est indépendante des tâches de préparation, accepte des activités parallèles signalées et sépare notes internes et programme prestataires. Makeup et Hair restent deux besoins ; un forfait commun ne crée aucun paiement automatique.
