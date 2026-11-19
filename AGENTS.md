# Notes projet — NOVASYS (reprise web de GESTION_NOVASYS WinDev)

Stack identique à easy_medical : Next.js 16 / React 19 / MongoDB (base `BDD_NOVASYS`) / JWT / React-Bootstrap / pdfkit.

## Vérification

```powershell
node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit
$env:NODE_OPTIONS="--max-old-space-size=8192"; node ./node_modules/next/dist/bin/next build
node ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3001   # 3000 souvent occupé par easy_medical
```

Compte par défaut (seed) : `admin@novasys.local` / `admin123`.

## Variables d'environnement

`MONGODB_URI`, `JWT_SECRET`, `LICENCE_SECRET`, `COOKIE_SECURE=false` (HTTP local), `NEXT_PUBLIC_BASE_URL`.

## Licence

- Portée par la fiche `Entreprise` unique (mono-base) — logique dans `lib/licence.ts`, modules dans `lib/licenceModules.ts`, accès dans `lib/moduleAccess.ts`.
- `requireAuth` renvoie **402 `LICENCE_BLOQUEE`** quand la licence est bloquée ; les routes `/api/licence/*` passent `{ licenceExempt: true }`.
- Premier démarrage : essai 30 jours. Activation par clé : page `/dashboard/licence`.
- Génération d'une clé (éditeur) : `LICENCE_SECRET=... node scripts/generer-licence.cjs [--days 365] [--modules clients,devis]`.
- `PUT /api/entreprise` n'accepte que les champs de la fiche (liste blanche) — jamais les champs licence.

## Impressions / PDF

- PDF serveur : `GET /api/pdf/[type]/[id]?avecEntete=true|false`, types `facture`, `bl`, `proforma`, `bon-commande`, `recu` (générateur `lib/pdf/documents.ts`).
- Logo, entête (`enteteSociete`), pied de page (`piedDePage`) et cachet (`cachetDG`) viennent de la fiche Entreprise (`/dashboard/parametres/entreprise`, images en data URI ≤ 500 Ko).
- Mise en page de l'entête : `logoPosition` (gauche / droite / centre) et `enteteAlignement` (gauche / centre / droite), appliqués au PDF (`lib/pdf/documents.ts`) et à l'HTML (`EnteteEntreprise` dans `components/print/DocumentPrint.tsx`).
- Après un changement de schéma Mongoose, **redémarrer `next dev`** : le modèle reste en cache et les nouveaux champs sont ignorés silencieusement.
- « Sans entête » = zone d'entête réservée vide, sans logo/pied/cachet (papier pré-imprimé).
- UI : `components/print/PdfButtons.tsx`, `components/print/ImpressionBar.tsx`, hook `hooks/useImpression.ts`.

## Circuit de renvoi

- **Service achat → commercial** : `POST /api/commandes/[id]/renvoi` (admin, achat), motif obligatoire. Autorisé seulement si le devis est transféré (`serviceAchat`), `statutC === "en_cours"`, non clôturé et sans bon de commande actif. Effet : retour en `brouillon` non envoyé, `renvoyee/motifRenvoi/renvoyeLe/renvoyePar` remplis ; le retransfert (`.../transfert`) remet `renvoyee=false` (motif conservé en historique). UI : bouton « Renvoyer » sur `/dashboard/service-achat`, badge « Renvoyée par le service achat » + motif sur `/dashboard/devis`.
- **Comptabilité → service achat** : `POST /api/emissions/[id]/renvoi` (admin, comptable), motif obligatoire. Interdit si `decaisse`, `renvoyee`, `annule` ou `totalPaye > 0`. Effet : émission `statut="renvoyee"` + motif ; les `achatIds` liés repassent `serviceComptable=false`, `chequeEdite=false`, `statutAchat="brouillon"`, `renvoyeCompta=true` (modifiables, retransférables, réémissibles ; `paiementFournisseurId/comptaEnvoieLe/comptaEnvoiePar` retirés). `POST .../decaissement` refuse une émission renvoyée ; `.../transfert-compta` remet `renvoyeCompta=false`. UI : badge « Renvoyée » + motif et bouton « Renvoyer » sur `/dashboard/emission-cheque`, badge « Renvoyé par la compta » sur `/dashboard/achats`.
- Badges de compteur : `commandesRenvoyees` (menu Devis) et `bonsRenvoyes` (teinte du badge Bons de commande) dans `GET /api/notifications`.

## Annulation de paiement

- `POST /api/paiements-fournisseurs/[id]/annulation` : demande par celui qui a décaissé (`payePar`) ou l'admin, motif obligatoire, une seule demande `en_attente` par paiement. Idem `POST /api/paiements-clients/[id]/annulation` pour un encaissement de facture (action `annulation_encaissement` : comptable, caisse). Crée une `DemandeAnnulation` (`type` : `decaissement` | `encaissement`, statut `en_attente/approuvee/rejetee`).
- `POST /api/demandes-annulation/[id]/traiter` (admin) : `decision` `approuver` ou `rejeter` (+ `motifRefus`). Approbation : paiement `annule` ; décaissement → émission + fournisseur recrédités + entrée en caisse ; encaissement → facture (`soldee → partielle/en_attente`) + client recrédités + sortie en caisse.
- `GET /api/demandes-annulation?statut=&type=` : admin = tout ; autres = leurs demandes. `GET /api/emissions/[id]/paiements` et `GET /api/factures/[id]` annotent chaque paiement de `demandeAnnulationStatut`.
- Page dédiée `/dashboard/demandes-annulation` (menu « Demandes d'annulation », service `emission_cheque`) : liste + filtre par statut ; l'admin y approuve/rejette. Dans `/dashboard/emission-cheque`, la modale « Décaissements » garde le bouton de demande (croix) et les badges de statut.
- Badge menu : `demandesAnnulation` (demandes `en_attente`, admin seul) dans `GET /api/notifications`, badge rouge sur « Demandes d'annulation ».

## Permissions sensibles

Actions câblées via `requireAuth(req, roles, { actions })` (rôle OU toutes les actions requises) ; défauts par rôle dans `ROLE_ACTIONS` (`lib/permissions.ts`), personnalisables par utilisateur :

- `renvoi_devis` — achat : renvoi d'un devis au commercial (`POST /api/commandes/[id]/renvoi`).
- `cloture_commande` — achat : clôturer/rouvrir un devis (`POST|DELETE /api/commandes/[id]/cloture`).
- `renvoi_emission` — comptable : renvoi d'une émission au service achat (`POST /api/emissions/[id]/renvoi`).
- `decaissement` — comptable, caisse : décaissement (`POST /api/emissions/[id]/decaissement`).
- `creation_article` — commercial, achat, stock : création d'article à la volée (`POST /api/articles`).
- `annulation_transfert` — annulation du transfert d'un devis au service achat (aucun rôle par défaut).
- `annulation_encaissement` — comptable, caisse : demande d'annulation d'un encaissement (`POST /api/paiements-clients/[id]/annulation`) ; pour les décaissements la demande exige l'action `decaissement` (`POST /api/paiements-fournisseurs/[id]/annulation`). Le traitement (approuver/rejeter) est réservé à l'admin (`/api/demandes-annulation/[id]/traiter`).
- `gestion_utilisateurs` — admin : GET/POST/PUT/DELETE `/api/utilisateurs*`, POST/PUT/DELETE `/api/profils*`.

Côté UI, `/api/me` renvoie `user.permissions` **résolues** (actions du rôle déjà fusionnées) : helper `aAction(code)` = `actions.includes("*") || actions.includes(code)`.

Alignements route ↔ rôle (audit) :

- `GET /api/emissions` : admin, achat, comptable, **caisse** (la caisse décaisse → elle doit voir les émissions). Bouton « Nouvelle émission » masqué hors admin/achat.
- `GET /api/factures` + `[id]` : **commercial** ajouté, filtré sur ses clients (`filtreCreateur` + `idsClientsTravailles`, ou factures sans `clientId`) ; `[id]` via `peutConsulterClient`.
- `/api/stock` GET+POST : **caisse retirée** → admin, stock uniquement.
- `DELETE /api/utilisateurs/[id]` : exige aussi `gestion_utilisateurs` (comme POST/PUT).
- PDF `facture`/`bl` : contrôle commercial passé de `peutVoirCreateur` à `peutConsulterClient` (cohérent avec les fiches clients).

## Portée commerciale (type `commercial`)

- Devis/commandes, factures, stats : le commercial ne voit que ce qu'il a saisi (`saisiePar`, `lib/portee.ts`).
- Clients et fournisseurs : la **liste** montre tout le monde ; chaque fiche renvoie `estMien` (créée par lui `creerPar`, ou « travaillée » : client d'un de ses devis, fournisseur présent dans ses devis/bons). L'UI propose le filtre « Mes clients / Mes fournisseurs » et un badge « Mon … ».
- Détail/modification (`GET`/`PUT` `/api/clients/[id]`, `/api/fournisseurs/[id]`) : fiche à lui (`peutConsulterClient/Fournisseur`) ou sans créateur, sinon 404 « introuvable ». Les fiches sans créateur restent consultables par tous mais ne comptent pas dans « Mes … ». DELETE reste admin.
- Factures : `GET /api/factures` et `[id]` accessibles au commercial, filtrés sur ses clients (`filtreCreateur` + `idsClientsTravailles`, ou sans `clientId`).

## Sécurité (durcissements)

- **Rôles** : `type` utilisateur validé contre `ROLE_LABELS` (adminsuper jamais attribuable via API ni profil) ; seul un vrai admin crée/modifie des comptes admin — un délégué `gestion_utilisateurs` ne peut pas s'auto-promouvoir. `matchesAllowedRoles` n'imite jamais admin/adminsuper.
- **Anti-assignation massive** : les PUT métier suppriment les champs financiers/statuts/audit du body — soldes (client, fournisseur), `totalPaye`/`statutC`/`resteAPaye` (facture), champs de circuit (`serviceAchat`, `renvoyee`, `cloture*`, `serviceComptable`, `chequeEdite`…) et totaux recalculés. `payePar`/`creerPar`/`saisiePar` fixés côté serveur.
- **Documents joints** : extensions limitées à pdf/images/txt, ~5 Mo max, `Content-Type` servi depuis la table serveur (jamais le data URI client → pas de XSS stockée), portée `peutVoirSaisie` sur les deux GET.
- **Sessions** : `user.tokenVersion` dans le JWT (`tv`) — incrémenté au changement de mot de passe → révoque les anciens jetons.
- **Login** : types validés + 30 tentatives/min par IP (429), en plus du verrouillage par compte.
- **Licence** : essai activable une seule fois (`DateControle.essaiC`) ; signature vérifiée en `timingSafeEqual`.
- **Encaissement** : montant plafonné au reste à payer de la facture, facture/client cohérents.
- **Divers** : `GET /api/profils` et `/api/entreprise` tronqués pour les non-admins ; en-têtes `nosniff`/`SAMEORIGIN`/`Referrer-Policy` dans `next.config.ts` ; demandes d'annulation filtrées par `demandeurId`.

## Fiche des rôles

`/dashboard/profils` affiche sous la liste une « Fiche des rôles » : pour chaque profil, description du rôle dans le circuit, services accessibles (`ROLE_SERVICES`) et actions sensibles (`ROLE_ACTIONS`/`PERMISSION_ACTIONS`). Les textes sont dans `ROLE_DESCRIPTIONS` de `app/dashboard/profils/page.tsx` — à mettre à jour si le catalogue de permissions évolue.

## Profils = modèles de droits

- Le modèle `Profil` porte `profil` (nom), `type` (rôle de base, clé `ROLE_LABELS`), et en option `customized` + `services`/`actions` (jeu personnalisé, validé par `lireDroitsProfil` dans `lib/permissions.ts`).
- La fiche profil (`/dashboard/profils`) permet de choisir le rôle et de cocher des permissions personnalisées — mêmes cases que la modale permissions de l'utilisateur.
- Attribuer un profil à un utilisateur (select « Profil » de la fiche utilisateur) **impose** son rôle et ses permissions : `POST|PUT /api/utilisateurs*` applique `droitsDuProfil` (`lib/droitsProfil.ts`) côté serveur, qui écrase `type`/`permissions` du payload. `profilId` vide → `null`. La personnalisation par utilisateur (modale Permissions) reste possible en plus.

## Calcul des lignes de devis

- `lib/calculDevis.ts` (`calculerLigne`) : Marge, Douane, Transport et Banque sont de vrais pourcentages, calculés sur la même base qui fait elle-même partie du PU HT : `PU HT = base + base × (Marge + Douane + Transport + Banque) % + Autre montant` avec `base = PU × Valeur` (ou `PU` seul si `Valeur (FCFA) = 0`) ; `Montant HT = Qté × PU HT`.
- Grille : `components/devis/FicheDevis.tsx`, conteneur `.grille-devis` (défilement horizontal propre, `#` sticky à gauche, actions sticky à droite) — ne doit jamais faire défiler la page.

## Bon de commande — transitaire, transport, douane

- Totaux calculés par `lib/calculAchat.ts` (`calculerTotauxAchat`), utilisé côté écran (modal `/dashboard/service-achat`) et côté serveur (POST/PUT `/api/achats`) :
  Sous-total articles HT = Σ qté × prix d'achat ; Douane = sous-total × tauxDouane % (base : articles seuls) ; Total HT = sous-total + Transport + Autre montant + Douane ; TVA = Total HT × taux % ; TTC = HT + TVA.
- Bon : `transitaireId` (ref Transitaire), `transitaire` (nom), `sousTotalHT`, `fraisTransport`, `autreMontant`, `tauxDouane`, `montantDouane`. `resteAPaye = totalTTC`.
- Transitaires : modèle `models/transitaire.ts`, API `/api/transitaires` (GET admin/achat/comptable, POST admin/achat), modal `components/tiers/FicheTransitaireModal.tsx`.
- PDF/HTML : détail des totaux via `totaux.detail` / `detailTotaux` (uniquement valeurs > 0), libellé `TVA (X %)`, ligne « Transitaire : nom — tél. » en complément.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
