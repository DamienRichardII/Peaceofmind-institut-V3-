# RAPPORT D'AUDIT — Peace of Mind Signature
## Réservation, Paiement, Notifications, Agenda

Date : 2026-06-01  
Auditeur : Claude Cowork  
Site : https://peaceofmindsignature.com

---

## 1. Architecture détectée

| Couche | Technologie | URL |
|--------|-------------|-----|
| Frontend | HTML/CSS/JS statique | Vercel → peaceofmindsignature.com |
| Backend | Node.js / Express | Railway → peaceofmind-backend-production.up.railway.app |
| Base de données | Supabase PostgreSQL | loebcdjyykchuijwvrtv |
| Paiement | Stripe SetupIntent (empreinte bancaire) | Stripe API |
| Email | Resend (prioritaire) + Nodemailer SMTP (fallback) | RESEND_API_KEY |
| SMS | OVH SMS (configurable) | SMS_ENABLED=false par défaut |
| Admin | admin.js + admin.html servis par Railway | /admin |

---

## 2. Fichiers analysés

### Frontend
- `reserver.html` — parcours réservation, créneaux, paiement Stripe
- `members.html` — espace membre
- `assets/styles.css` — styles

### Backend
- `src/controllers/reservations.controller.js` — création réservation, disponibilités
- `src/controllers/admin.controller.js` — confirmation, annulation, report
- `src/services/email.service.js` — envoi emails client + admin
- `src/services/calendar.service.js` — génération ICS agenda iPhone
- `src/services/sms.service.js` — SMS OVH
- `src/services/schedule.service.js` — blocs agenda admin
- `src/routes/admin.routes.js` — routes admin
- `server.js` — configuration Express, Helmet, CORS

### Supabase
- Table `reservations` — toutes les réservations
- Table `schedule_blocks` — jours/plages fermés par admin
- Table `cancellation_rules` — règles d'annulation (2 entrées)
- Table `notification_logs` — logs SMS/email

---

## 3. Problèmes confirmés

### P0 — CRITIQUE : Journée fermée ignorée côté frontend

**Cause** : La fonction `fetchBlockedSlots()` dans `reserver.html` appelle `GET /api/reservations/availability?date=...` qui retourne `{ closed: true, blocked_slots: [] }` quand la journée est bloquée. Mais le frontend lisait uniquement `data.blocked_slots || []` sans jamais vérifier `data.closed`. Résultat : tous les créneaux s'affichaient comme disponibles même sur une journée fermée.

```js
// AVANT (code défaillant)
_blockedSlotsCache[dateString] = data.blocked_slots || [];
// Ignorer data.closed = true → tous les créneaux générés
```

**Impact** : Le client pouvait sélectionner un créneau et aller jusqu'au paiement sur une journée fermée.

**Protection backend** : `POST /api/reservations` ne vérifiait pas les blocs `is_full_day` → réservation forcée possible même sur journée fermée.

---

### P0 — Paiement "carte impossible à charger"

**Cause probable** : Sur mobile ou avec un bloqueur de publicités, si `Stripe.js` est bloqué ou lent à charger, `initStripeCard()` retournait silencieusement sans aucun message visible pour l'utilisateur. De plus, si `_stripeCard.mount()` lançait une exception, elle n'était pas catchée, laissant le formulaire dans un état incohérent.

Le lien avec la journée fermée : avant le fix P0, un client sur une journée fermée pouvait atteindre l'étape paiement. Si la réservation échouait côté backend (409), le message d'erreur pouvait être confus.

---

### P1 — Notifications mail admin absentes

**Cause** : Le code d'envoi mail est **en place et fonctionnel** dans `reservations.controller.js` (appel `emailService.sendConfirmation()` en `setImmediate`). Cependant, **les variables d'environnement Railway ne sont probablement pas configurées** :

```
RESEND_API_KEY → non définie → provider = "none" → email silencieusement ignoré
```

Le service email log `"[Mail] Aucun provider configure"` au démarrage. Sans `RESEND_API_KEY`, aucun email ne part.

---

### P2 — Calendrier iPhone

**Statut** : Implémenté dans cette session. `calendar.service.js` génère des fichiers `.ics` attachés aux emails (RFC 5545). Non encore déployé car push en attente.

---

### P2 — Conditions d'annulation

**Statut actuel** : L'admin peut saisir manuellement `cancellation_rate` (0, 50, 100%). La table `cancellation_rules` existe avec 2 entrées. Il n'existe pas de logique automatique basée sur les délais. La retenue Stripe (charge sur l'empreinte) n'est pas implémentée — c'est une action manuelle Stripe.

---

## 4. Causes probables synthèse

| Problème | Cause confirmée | Fichier |
|----------|-----------------|---------|
| Journée fermée → créneaux visibles | `fetchBlockedSlots` ignore `data.closed` | `reserver.html` |
| Réservation forcée possible | `createReservation` ne vérifie pas `is_full_day` | `reservations.controller.js` |
| Carte "impossible à charger" | `initStripeCard` sans try/catch + Stripe.js bloqué mobile | `reserver.html` |
| Aucun mail admin reçu | `RESEND_API_KEY` absent dans Railway env vars | Railway config |
| ICS non dispo | Non déployé (push manquant) | À déployer |

---

## 5. Plan de correction (appliqué)

### P0.1 — Frontend journée fermée ✅ Corrigé
- `fetchBlockedSlots` retourne `{closed, slots}` au lieu de `[]`
- `refreshSlots` vérifie `availData.closed` → message "Cette journée n'est pas disponible"
- `validateSlotAndProceed` vérifie le cache avant de laisser continuer

### P0.2 — Backend journée fermée ✅ Corrigé
- `createReservation` appelle `scheduleService.getBlocksForDate` et retourne 409 + code `DAY_CLOSED` si `is_full_day`

### P0.3 — Stripe robustesse ✅ Corrigé
- `initStripeCard` wrappé dans try/catch
- Message visible si Stripe.js non chargé
- `#card-element` vérifié avant mount
- 409 `DAY_CLOSED` géré dans `submitBookingRequest`

### P1 — Mail admin ⚠️ Action Railway requise
- Code en place et fonctionnel
- **Action requise** : configurer `RESEND_API_KEY` dans Railway

---

## 6. Tests à effectuer

1. Fermer une journée dans l'admin → ouvrir reserver.html → sélectionner cette date → aucun créneau ne doit apparaître, message visible
2. Tenter une réservation forcée (curl) sur journée fermée → 409 DAY_CLOSED
3. Tester Stripe sur mobile Safari → carte doit charger, erreur visible si bloqueur actif
4. Configurer RESEND_API_KEY sur Railway → faire une réservation → vérifier mail reçu
5. Confirmer un RDV dans l'admin → mail client + ICS dans la boite iPhone

---

## 7. Recommandations

- Configurer immédiatement `RESEND_API_KEY` sur Railway (priorité absolue pour les mails)
- Activer les SMS OVH dès réception des clés API (`SMS_ENABLED=true`)
- Pour les frais d'annulation : laisser Maiwenn ajuster manuellement le taux via l'admin, puis déclencher le prélèvement manuellement via Stripe Dashboard (sécurité)
- Prévoir un système de pré-autorisation Stripe (Payment Intent) si on veut automatiser les frais
