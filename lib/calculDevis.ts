/**
 * Formules WinDev de l'écran « NOUVEAU DEVIS » : Marge, Douane, Transport
 * et Banque sont de vrais pourcentages, calculés chacun sur la même base
 * (Prix unitaire × Valeur FCFA, ou le Prix unitaire seul si Valeur = 0) ;
 * la base fait elle-même partie du PU HT : PU HT = base + base × (Σ%) / 100
 * + Autre montant ; le Total HT inclut la main d'œuvre.
 * Utilisé côté client (affichage temps réel) et côté serveur (recalcul à
 * l'enregistrement).
 */
export function calculerLigne(l: any) {
  const pu = Number(l.prixUnitaire) || 0;
  const valeur = Number(l.valeurConvertisseur) || 0;
  const base = valeur === 0 ? pu : pu * valeur;
  const pct = (v: any) => Number(v) || 0;
  const majorations =
    (base * (pct(l.tauxMarge) + pct(l.tauxDeDouanement) + pct(l.fraisTransport) + pct(l.tauxBancaire))) / 100;
  const puHT = base + majorations + (Number(l.autreMontant) || 0);
  return { ...l, prixUnitaireHT: puHT, prixTotalHT: (Number(l.quantite) || 0) * puHT };
}

export function calculerTotaux(
  lignes: any[],
  {
    mainDoeuvre,
    tauxRemise,
    taux,
    totalPaye,
  }: { mainDoeuvre?: any; tauxRemise?: any; taux?: any; totalPaye?: any }
) {
  const somme = lignes.reduce((s, l) => s + (Number(l.prixTotalHT) || 0), 0);
  const totalHT = somme + (Number(mainDoeuvre) || 0);
  const remise = ((Number(tauxRemise) || 0) * totalHT) / 100;
  const totalAvecRemise = totalHT - remise;
  const totalTVA = ((Number(taux) || 0) * totalAvecRemise) / 100;
  const totalTTC = totalAvecRemise + totalTVA;
  const paye = Math.min(Number(totalPaye) || 0, totalTTC);
  return {
    totalHT,
    remise,
    totalAvecRemise,
    totalTVA,
    totalTTC,
    totalPaye: paye,
    resteAPaye: totalTTC - paye,
  };
}
