/**
 * Formules WinDev de l'écran « NOUVEAU DEVIS » : les champs « % » des
 * lignes sont en réalité des coefficients multiplicateurs (0 = sans effet),
 * et le Total HT inclut la main d'œuvre. Utilisé côté client (affichage
 * temps réel) et côté serveur (recalcul à l'enregistrement).
 */
const coef = (v: any): number => {
  const n = Number(v) || 0;
  return n === 0 ? 1 : n;
};

export function calculerLigne(l: any) {
  const puHT =
    (Number(l.prixUnitaire) || 0) *
      coef(l.valeurConvertisseur) *
      coef(l.tauxDeDouanement) *
      coef(l.fraisTransport) *
      coef(l.tauxMarge) *
      coef(l.tauxBancaire) +
    (Number(l.autreMontant) || 0);
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
