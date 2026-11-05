# Envoyer l’invitation par email

Dans Paramètres → Inviter ma moitié, le propriétaire saisit l’adresse et choisit **Envoyer l’invitation par email**. L’application crée d’abord l’invitation métier existante (48 h, adresse liée, usage unique), puis appelle `supabase.auth.signInWithOtp` pour demander l’email. Le destinataire vérifie son adresse, ouvre `/rejoindre` et confirme l’acceptation via la RPC `accept_invitation` déjà sécurisée. Un compte existant et un nouveau compte sont pris en charge. Le destinataire peut définir un mot de passe pour ses prochaines connexions.

Aucune migration SQL supplémentaire ni clé administrateur côté Angular. Les quatre migrations métier existantes doivent être appliquées. Le code du mariage est conservé dans la redirection Auth ; à l’arrivée, il est retiré de l’URL avant chargement des données et gardé temporairement dans sessionStorage, puis supprimé après acceptation. Il ne suffit pas à rejoindre : le serveur vérifie aussi l’adresse confirmée, l’expiration, l’usage unique et les deux membres maximum. Ne pas journaliser les URLs complètes des invitations ; les traiter comme des liens privés.

L’envoi accepté par l’API ne prouve pas la livraison dans la boîte. En cas d’erreur SMTP ou de quota, l’interface l’indique et conserve le code manuel. **Renvoyer l’email** réutilise la même invitation ; **Envoyer l’invitation** crée une nouvelle invitation et invalide la précédente. La durée du lien de connexion Auth est indépendante des 48 h du code métier.

## Configurer Supabase

Le [SMTP Supabase par défaut](https://supabase.com/docs/guides/auth/auth-smtp) est limité aux adresses de l’équipe de l’organisation et n’est pas adapté à l’envoi général. Configurer **Authentication → Email / SMTP Settings → Custom SMTP** dans le dashboard. Conserver les confirmations d’adresse actives et le fournisseur Email autorisé.

Avec un compte Gmail personnel existant, lorsque les mots de passe d’application sont disponibles :

1. Activer la [validation en deux étapes Google](https://support.google.com/accounts/answer/185839?hl=fr).
2. Créer un [mot de passe d’application](https://myaccount.google.com/apppasswords), nommé « Notre Mariage ». Certains comptes gérés/protégés ne proposent pas cette option : [conditions Google](https://support.google.com/accounts/answer/185833?hl=fr).
3. Activer Custom SMTP dans Supabase et saisir :

| Champ        | Valeur                               |
| ------------ | ------------------------------------ |
| Sender email | Votre adresse Gmail                  |
| Sender name  | Notre Mariage                        |
| Host         | smtp.gmail.com                       |
| Port         | 587 (STARTTLS)                       |
| Username     | Votre adresse Gmail complète         |
| Password     | Le mot de passe d’application Google |

[Paramètres SMTP Gmail officiels](https://support.google.com/mail/answer/7104828). Le mot de passe est enregistré exclusivement dans Supabase SMTP, jamais dans Angular, `.env` du frontend, les exports ou Git. Il peut être révoqué depuis Google. Cette connexion utilise votre compte existant et ses limites ; aucun abonnement ni domaine payant n’est activé par l’application. Les conditions et limites de votre fournisseur restent applicables.

## URLs et contenu de l’email

Dans **Authentication → URL Configuration**, définir la Site URL sur l’adresse de l’application et autoriser les redirections vers `/rejoindre` avec le paramètre d’invitation. En développement, les motifs documentés `http://127.0.0.1:4200/**` et `http://localhost:4200/**` permettent de tester. Pour Vercel, ajouter uniquement l’origine de votre propre application avec le chemin `/rejoindre**` (et conserver les redirections `/auth` déjà utilisées). Éviter d’autoriser arbitrairement toutes les origines. Voir [la documentation des redirections](https://supabase.com/docs/guides/auth/redirect-urls).

Le lien est construit à partir de l’origine de l’application ouverte. **Un lien localhost/127.0.0.1 ne peut pas être utilisé depuis le téléphone d’une autre personne.** Le tester sur le même ordinateur en développement ; utiliser l’URL Vercel accessible sur Internet pour l’invitation réelle.

Supabase choisit le modèle **Confirm signup** pour une nouvelle adresse et **Magic Link** pour un compte existant. Pour personnaliser l’email, adapter ces deux modèles en conservant `{{ .ConfirmationURL }}`. Le fichier `supabase/templates/access-email.html` propose un contenu français et un code numérique de secours. Il n’est pas appliqué automatiquement au dashboard. Le modèle « Invite user » de l’API administrateur n’est pas utilisé. [Modèles officiels](https://supabase.com/docs/guides/auth/auth-email-templates).

## Recette réelle

Depuis un compte propriétaire connecté, inviter une adresse de test sous votre contrôle, vérifier la réception dans les indésirables, ouvrir le lien dans un autre profil/appareil, puis accepter. Vérifier que l’expéditeur reste connecté et que seul le destinataire autorisé peut rejoindre. Tester compte existant, nouvelle adresse, lien expiré, mauvais compte et renvoi. Ne pas envoyer d’emails à des tiers pendant les tests automatisés.

Les tests locaux simulent la réponse Auth et vérifient la RPC existante ; ils ne prouvent ni la livraison SMTP ni la configuration du dashboard. Aucun email réel n’est envoyé automatiquement par les tests.
