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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
