# Roadmap et suivi

1. Discovery : vision, règles, user stories, modèle et architecture.
2. Fondations : Angular, identité, navigation, mode démo séparé, SQL/RLS.
3. MVP : comptes et couple, cérémonies/besoins, prestataires/offres/photos, comparateur, budget/paiements, invités, export.
4. Métier : Dfou3/Tyafer, tenues, inspirations, planning et checklists de visites.
5. Qualité : calculs, validation, accès inter-mariages, persistance, responsive et build ; recette sur projet Supabase configuré puis Vercel.

Le README décrit l'état effectivement livré et les limites. La présence d'une table ne signifie pas que son parcours UI est terminé. Aucun déploiement ni test distant n'est déclaré sans preuve.

## État de la première livraison

Discovery et fondations livrées. Parcours principal MVP implémenté avec démo locale, adaptateur SDK Supabase, trois migrations, RLS et tests PostgreSQL locaux. Extensions livrées : calendrier mensuel, checklists facultatives, ensembles Dfou3 et galeries, tenues avec photos et essayages, inspirations et tags, justificatifs photo et ZIP de sauvegarde.

À terminer avec la configuration externe : recette des vrais comptes, de l'invitation du second membre, des emails et du Storage ; vérification visuelle sur téléphone ; déploiement GitHub/Vercel. Enrichissements métier suivants : pondération des comparaisons, accessoires détaillés des tenues, plans de tables, édition avancée des invités et restauration automatisée des exports. Voir `verification.md` pour les preuves et les limites.

## Évolution du 3 novembre 2026

Livrés localement : Trousseau autonome, Moodboards multiples avec import photo et commentaires, Timeline par cérémonie avec ordre manuel/chronologie, modèles spécialisés Makeup/Hair et Voiture de cortège, programme prestataires HTML imprimable et intégration des galeries/budgets existants. Migration additive 004, préservation d'une base ancienne et isolation des nouveaux médias vérifiées sur PostgreSQL local. La recette visuelle mobile et l'intégration aux véritables services Supabase restent conditionnées à leur disponibilité ; aucun déploiement externe n'est annoncé.
