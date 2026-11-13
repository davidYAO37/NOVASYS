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
