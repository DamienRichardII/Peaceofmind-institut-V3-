# RAPPORT DES CORRECTIONS — Peace of Mind Signature
## Réservation, Paiement, Notifications, Agenda

Date : 2026-06-01  
Réalisé par : Claude Cowork

---

## 1. Fichiers modifiés

### Frontend
| Fichier | Modification |
|---------|-------------|
| `reserver.html` | Fix journée fermée (fetchBlockedSlots + refreshSlots + validateSlotAndProceed), Stripe robuste, 409 DAY_CLOSED, popup Members Only, UX créneaux bloqués, validateSlotAndProceed |

### Backend
| Fichier | Modification |
|---------|-------------|
| `src/controllers/reservations.controller.js` | Vérification journée fermée avant insertion, retour 409 DAY_CLOSED |
| `src/controllers/admin.controller.js` | sendCancellationNotification, rescheduleReservation |
| `src/routes/admin.routes.js` | Route POST /api/admin/reservations/:id/reschedule |
| `src/services/email.service.js` | ICS attachments (Resend + SMTP), sendCancellationNotification, sendRescheduleNotification |
| `src/services/calendar.service.js` | Créé — génération ICS RFC 5545 |
| `src/services/sms.service.js` | Créé — OVH SMS provider |
| `public/admin.js` | Bouton Reporter RDV, formulaire inline, doReschedule(), notifications section |

### Supabase (migrations appliquées)
- `calendar_uid`, `calendar_sequence`, `rescheduled_at`, `rescheduled_by`, `previous_date`, `previous_slot` sur `reservations`
- `sms_confirmation_sent`, `sms_reminder_sent`, `email_reminder_sent` et colonnes liées
- `notification_logs` table créée
- `schedule_blocks` table créée

---

## 2. Corrections réalisées

### P0 — Journée fermée côté frontend (BUG CRITIQUE)

**Avant** : `fetchBlockedSlots` lisait `data.blocked_slots || []` mais ignorait `data.closed`. Résultat : tous les créneaux s'affichaient même si la journée était fermée.

**Après** : 
```js
_blockedSlotsCache[dateString] = {
  closed: data.closed === true,
  slots:  data.blocked_slots || [],
};
```
`refreshSlots` vérifie `availData.closed` et affiche : *"Cette journée n'est pas disponible à la réservation. Merci de choisir une autre date."*

---

### P0 — Protection backend journée fermée

**Avant** : `POST /api/reservations` ne vérifiait pas `is_full_day`.

**Après** : 
```js
var dayBlocks = await scheduleService.getBlocksForDate(data.date);
var isClosed = dayBlocks.some(b => b.is_full_day);
if (isClosed) return res.status(409).json({ code: 'DAY_CLOSED', ... });
```

---

### P0 — Stripe robustesse

**Avant** : `initStripeCard()` retournait silencieusement si `Stripe === undefined`. Aucun message visible.

**Après** :
- Vérification `#card-element` dans le DOM avant mount
- `try/catch` complet autour de l'initialisation Stripe
- Message utilisateur clair si Stripe.js non chargé ou bloqué
- 409 `DAY_CLOSED` géré dans `submitBookingRequest`

---

### P1 — ICS agenda iPhone

- `calendar.service.js` créé : génère fichiers `.ics` RFC 5545 (TENTATIVE, CONFIRMED, CANCELLED)
- `email.service.js` : support `attachments` Resend + Nodemailer
- ICS attaché à l'email admin lors d'une **nouvelle réservation** (TENTATIVE)
- ICS attaché à l'email client lors de la **confirmation** (CONFIRMED)
- ICS CANCEL envoyé lors d'une **annulation**
- ICS CONFIRMED avec séquence incrémentée lors d'un **report**

---

### P1 — Notifications admin

- `sendCancellationNotification(reservation)` — email client + admin avec ICS CANCEL
- `sendRescheduleNotification(reservation, oldDate, oldSlot)` — email client + admin avec ICS UPDATE
- `sendAdminMessage` existant pour messages manuels
- Admin : bouton **Reporter RDV** avec formulaire date/créneau/note/email optionnel

---

## 3. Variables d'environnement Railway requises

### PRIORITÉ ABSOLUE — sans ces variables, aucun mail ne part

```env
RESEND_API_KEY=re_xxxxxxxxxxxx    ← clé Resend (https://resend.com)
MAIL_TO=peaceofmindinstitut@gmail.com
MAIL_FROM=Peace of Mind Signature <onboarding@resend.dev>
```

### SMS OVH (quand clés disponibles)
```env
OVH_APP_KEY=your_key
OVH_APP_SECRET=your_secret
OVH_CONSUMER_KEY=your_consumer_key
OVH_SMS_SERVICE=sms-XXXXX-X
OVH_SMS_SENDER=PeaceofMind
SMS_ENABLED=true
```

### Cron rappels
```env
CRON_SECRET=générer_avec_openssl_rand_hex_32
```

---

## 4. Tests à effectuer en production

### Journée fermée
- [ ] Admin → fermer une journée → reserver.html → sélectionner cette date → message "non disponible" visible
- [ ] Aucun créneau affiché
- [ ] Tentative curl forcée → 409 DAY_CLOSED

### Paiement
- [ ] Réservation normale → Stripe Elements charge → carte acceptée → réservation créée
- [ ] Sur iOS Safari → vérifier que le module de paiement charge correctement
- [ ] Si bloqueur actif → message visible et compréhensible

### Notifications mail
- [ ] Configurer `RESEND_API_KEY` sur Railway
- [ ] Faire une réservation test → Maiwenn reçoit mail sur peaceofmindinstitut@gmail.com
- [ ] Confirmer RDV dans admin → client reçoit mail + fichier .ics
- [ ] Annuler RDV → client + Maiwenn reçoivent mail avec ICS CANCEL

### ICS iPhone
- [ ] Ouvrir mail de confirmation sur iPhone
- [ ] Pièce jointe .ics visible
- [ ] Tap sur la pièce jointe → proposition d'ajout au Calendrier
- [ ] Vérifier date, heure, durée, titre dans le calendrier

### Report RDV (admin)
- [ ] Détail réservation → bouton "Reporter le RDV"
- [ ] Saisir nouvelle date/créneau → Confirmer
- [ ] Mail client + Maiwenn reçus avec nouveau ICS
- [ ] Vérification en base : `previous_date`, `calendar_sequence` incrémenté

---

## 5. Conditions d'annulation — recommandation

Le système actuel permet à Maiwenn de saisir manuellement le taux (0%, 50%, 100%) dans l'admin. **La retenue financière reste manuelle** via le Stripe Dashboard (charge sur le `payment_method` enregistré via SetupIntent).

Pour automatiser :
1. Il faudrait un `PaymentIntent` off_session utilisant le `payment_method` stocké
2. Ce prélèvement serait déclenché par une action admin ou un cron
3. Nécessite un test de validation réglementaire (consentement explicite au moment de la réservation)

**Recommandation à court terme** : Maiwenn gère manuellement via Stripe Dashboard → Dashboard → Customers → chercher le client → Charge.

---

## 6. Points restant à valider avec Maiwenn

1. Confirmer que `RESEND_API_KEY` est bien configurée sur Railway (point bloquant mails)
2. Valider le rendu des mails (template, DA)
3. Tester l'ajout ICS sur iPhone de Maiwenn
4. Définir si l'automatisation des frais d'annulation est souhaitée (nécessite développement Stripe supplémentaire)
5. Valider les SMS OVH dès réception des clés

---

## 7. Commandes push

```bash
# Backend — toutes les corrections
cd "C:\Users\HP-15\OneDrive\Bureau\OneDrive\Documents\Peaceofmind backend"
git add -A
git commit -m "Fix journée fermée P0 + Stripe robuste + ICS agenda + Report RDV + SMS OVH"
git push origin main

# Frontend
cd "C:\Users\HP-15\Downloads\peace_of_mind_v2_corrections_executed"
git add reserver.html RAPPORT_AUDIT_PEACEOFMIND_RESERVATION_NOTIFICATIONS.md RAPPORT_CORRECTIONS_PEACEOFMIND_RESERVATION_NOTIFICATIONS.md
git commit -m "Fix journée fermée + Stripe robuste + popup Members"
git push origin main
```
