# RAPPORT D'AUDIT — Mail "Proposer un autre créneau", Samedis, Agenda iPhone
## Peace of Mind Signature

Date : 2026-06-01
Réalisé par : Claude Cowork (audit lecture seule, sans modification)
Périmètre : retour critique de Maiwenn — mail report non reçu, samedis indisponibles, RDV non ajoutables dans l'iPhone.

---

## 1. Architecture détectée

| Couche | Emplacement | Hébergement |
|--------|-------------|-------------|
| Frontend statique | `peace_of_mind_v2_corrections_executed/` (`reserver.html`, etc.) | Vercel |
| Backend API | `Peaceofmind backend/` (Express, `src/`) | Railway |
| Admin (servi par le backend) | `Peaceofmind backend/public/admin.html` + `admin.js` | Railway `/admin` |
| Base de données | Supabase projet `loebcdjyykchuijwvrtv` ("Peace of mind institut") | Supabase EU |
| Email | **Resend** (prioritaire) sinon SMTP Gmail (fallback) | — |
| Paiement | Stripe (empreinte CB) | — |
| SMS | OVH (désactivé par défaut) | — |

Provider email actif : **Resend** (`RESEND_API_KEY` présent, `SMTP_HOST` vide → pas de fallback SMTP).

---

## 2. Fichiers analysés

Backend : `src/services/email.service.js`, `src/services/calendar.service.js`, `src/services/reservations.service.js`, `src/services/schedule.service.js`, `src/services/admin.service.js`, `src/controllers/reservations.controller.js`, `src/controllers/admin.controller.js`, `public/admin.js`, `.env`, `package.json`.
Frontend : `reserver.html` (génération des créneaux, horaires, messages).
Données : tables Supabase `reservations`, `schedule_blocks`.

---

## 3. Tables Supabase concernées

- **`reservations`** : colonnes utiles présentes — `email_sent`, `email_error`, `email_provider`, `confirmation_email_sent/_at/_error/_provider`, `calendar_uid`, `calendar_sequence`, `rescheduled_at`, `rescheduled_by`, `previous_date`, `previous_slot`. **Aucune** colonne de suivi spécifique au mail de report ("proposition").
- **`schedule_blocks`** : `block_type`, `date`, `start_time`, `end_time`, `is_full_day`, `reason`. Stocke uniquement les **fermetures / indisponibilités** (pas les horaires d'ouverture).

---

## 4. Flux actuel — "Proposer un autre créneau" (= "Reporter le RDV")

1. Admin clique **"Reporter le RDV"** sur une réservation (`admin.js` → bouton `btn-reschedule-detail`).
2. Formulaire inline : nouvelle date, nouveau créneau, note, case **"Envoyer un email au client"** (cochée).
3. Clic "Confirmer le report" → `doReschedule()` → `POST /api/admin/reservations/:id/reschedule` avec `send_email: true`.
4. Backend `rescheduleReservation()` : met à jour la réservation, puis **lance l'email en arrière-plan via `setImmediate()`** et **répond immédiatement** `email_queued: true`.
5. `admin.js` (ligne 867) affiche **« RDV reporté — email envoyé au client. »** sur la seule base de `data.email_queued`.

---

## 5. Flux actuel — Envoi email

- Abstraction unique `sendMail()` dans `email.service.js` : Resend si configuré, sinon SMTP, sinon échec silencieux (`{ sent:false, provider:'none' }`).
- `sendRescheduleNotification()` envoie client + admin avec pièce jointe `.ics`, mais **avale toutes les erreurs** (`try/catch` avec simple `console.error`) et **ne retourne rien** (`undefined`).
- `MAIL_FROM = "Peace of Mind Institut <onboarding@resend.dev>"`.

---

## 6. Flux actuel — Génération des créneaux & samedis

- Horaires d'ouverture **codés en dur côté frontend** (`reserver.html`, `businessHours`) : Lun–Ven 10:00–17:30, **Samedi 11:30–15:30**, Dimanche fermé.
- `schedule_blocks` (Supabase) sert uniquement à **fermer** un jour (`full_day`) ou bloquer une plage (`time_range`).
- `GET /api/reservations/availability?date=` renvoie `closed` (si bloc full_day) + `blocked_slots` (réservations existantes + blocs time_range).
- `generateSlots()` génère par pas de 30 min depuis l'heure d'ouverture, en excluant les chevauchements. Pour le samedi 11:30–15:30 et une prestation 1h : 11h30, 12h00, 12h30, 13h00, 13h30, 14h00.
- Messages différenciés présents : jour non ouvré, journée fermée, erreur réseau, tous créneaux pris, aucun créneau compatible.

**État Git** : le dernier commit frontend `0ac5240 "Fix samedis 11h30-15h30 + messages créneaux différenciés"` contient déjà la correction (`businessHours[6]` était `null` auparavant). Le backend report RDV est dans `24e82dd`.

**Données réelles vérifiées (Supabase)** : la logique des blocs samedi fonctionne. Ex. samedi 27/06/2026, bloc `time_range` 10:00–12:30 ("Esmée a 11h30") → créneaux 11h30 et 12h00 bloqués, **12h30 / 13h00 / 13h30 / 14h00 restent disponibles** (comportement correct).

---

## 7. Flux actuel — Fichiers calendrier (.ics)

- `calendar.service.js` génère un `.ics` joint aux mails : confirmation client, notification admin (TENTATIVE), annulation (CANCEL), report (UPDATE/CONFIRMED).
- Génère `BEGIN:VCALENDAR … VEVENT` avec UID stable (`<id>@peaceofmindsignature.com`), `DTSTART/DTEND`, `SUMMARY`, `DESCRIPTION`, `LOCATION`, `STATUS`, `SEQUENCE`, `ORGANIZER`, `ATTENDEE`.
- Conversion timezone : parse une chaîne locale puis soustrait un offset Paris approximatif (UTC+2 d'avril à octobre).

---

## 8. Problèmes confirmés & causes exactes

### P0-1 — Mail "Proposer un autre créneau" non reçu (CAUSE DOUBLE)

**Cause A — Faux succès (code).** `rescheduleReservation()` envoie l'email en `setImmediate()` (fire-and-forget) et répond `success:true / email_queued:true` **avant** tout résultat d'envoi. `admin.js` affiche « email envoyé » sur cette base. `sendRescheduleNotification()` avale les erreurs et ne retourne rien. → L'admin voit toujours « envoyé », même en cas d'échec total. **Viole la règle « ne pas afficher mail envoyé si non envoyé ».**

**Cause B — Expéditeur Resend en bac à sable (config/infra).** `MAIL_FROM = onboarding@resend.dev`. Avec cet expéditeur de test, **Resend n'autorise la livraison qu'à l'adresse e-mail du propriétaire du compte Resend**. Tout envoi vers un **client** (adresse arbitraire) est **rejeté** par Resend. → C'est la raison la plus probable pour laquelle la cliente n'a jamais reçu le mail, l'échec étant masqué par la Cause A. **Non corrigeable par le code seul** : nécessite de vérifier un domaine dans Resend (ex. `noreply@peaceofmindsignature.com`) ou de configurer le SMTP Gmail.

### P0-2 — Samedis affichés fermés / indisponibles

**Cause principale : déploiement.** Le correctif `businessHours[6] = { 11:30–15:30 }` et les messages différenciés sont **présents dans le code local (commit `0ac5240`) mais pas encore déployés en production**. Sur la version en ligne, `businessHours[6]` valait `null` → tous les samedis affichés « pas un jour d'ouverture ». La plage 11h30–15h30, les pas de 30 min et le départ exact à 11h30 (sans arrondi) sont **corrects dans le code**. Aucun bug de timezone côté client (`getDay()` en heure locale).

### P1-1 — RDV non ajoutables dans l'iPhone / Apple Calendar (CAUSE TECHNIQUE .ics)

Deux non-conformités RFC 5545 rendent le fichier `.ics` rejeté par Apple Calendar :

1. **`DTSTAMP` (et fallback dates) malformé** : `new Date().toISOString()` produit des millisecondes (`…T103045.123Z`) ; le code ne nettoie que le cas `.000`. Résultat fréquent : `DTSTAMP:20260601T103045.123Z` → **date-time invalide** (la fraction de seconde et le point ne sont pas autorisés dans ce format). Apple rejette l'événement.
2. **`DTEND` ET `DURATION` simultanés** : la RFC 5545 interdit la présence des deux propriétés dans un même `VEVENT`. Le code émet les deux → fichier non conforme, refusé ou mal interprété.

Risque secondaire : la conversion de fuseau dépend du fuseau du serveur (Railway = UTC, donc « fonctionne » l'été) et l'approximation DST (avril–octobre) est fausse aux abords des changements d'heure.

### P2 — Suivi insuffisant

Aucune trace en base du mail de report (envoyé/échec, date, destinataire, type). L'admin ne dispose d'aucun historique fiable de l'action.

---

## 9. Risques

- Modifier l'envoi mail en synchrone : réponse HTTP légèrement plus lente (déjà le cas pour la confirmation, donc cohérent et acceptable).
- Migration Supabase : **uniquement additive** (`ADD COLUMN IF NOT EXISTS`) → aucun risque de régression sur les données existantes.
- `.ics` : retirer `DURATION` et garder `DTSTART/DTEND` est le comportement conforme ; aucun impact sur les clients qui acceptaient déjà l'événement.
- Ne pas toucher : design, responsive, paiement Stripe, parcours client, horaires existants, logique des blocs.

---

## 10. Plan de correction priorisé

**P0 — Mail report (code, immédiat)**
1. `email.service.js` : `sendRescheduleNotification()` retourne un résultat réel `{ client, admin, provider, errors }`.
2. `admin.controller.js` : `rescheduleReservation()` **attend** l'envoi, ajoute une **vérification de disponibilité** du nouveau créneau (anti-doublon, exclusion de la réservation elle-même), enregistre le suivi, et renvoie `email_sent / email_provider / email_error` réels.
3. `admin.js` : `doReschedule()` affiche le **vrai** statut (succès / avertissement « email non envoyé : … »), comme le fait déjà la confirmation.

**P0 — Samedis (déploiement)**
4. Vérifier l'intégrité du correctif déjà présent dans `reserver.html`, puis **déployer** (push Vercel). Aucune nouvelle modification de code nécessaire.

**P1 — Agenda iPhone (.ics)**
5. `calendar.service.js` : nettoyer les date-times (supprimer la fraction de seconde), **retirer `DURATION`** (garder `DTSTART/DTEND`), rendre la conversion Paris→UTC indépendante du fuseau serveur avec une règle DST correcte.

**P2 — Suivi**
6. Migration additive `reservations` : `reschedule_email_sent`, `reschedule_email_sent_at`, `reschedule_email_error` ; renseignées par le contrôleur.

**Action hors-code à valider avec Damien / Maiwenn (bloquante pour la livraison réelle des mails clients)**
7. Vérifier un domaine d'envoi dans Resend et mettre `MAIL_FROM=Peace of Mind Signature <noreply@peaceofmindsignature.com>` **ou** configurer `SMTP_HOST/USER/PASS` (mot de passe d'application Gmail). Tant que `onboarding@resend.dev` est utilisé, **les mails clients resteront non livrés** quelle que soit la correction de code.
8. Corriger `FRONTEND_URL=http://localhost:5500` en production (valeur de dev résiduelle dans `.env`).
