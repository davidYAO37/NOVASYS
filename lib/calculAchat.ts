/**
 * Totaux d'un bon de commande fournisseur (FEN_NOUVEAU_ACHAT) :
 *   Sous-total articles HT = Σ (quantité × prix d'achat)
 *   Douane      = Sous-total articles HT × tauxDouane / 100  (base : articles seuls)
 *   Total HT    = Sous-total articles + Transport + Autre montant + Douane
 *   TVA         = Total HT × taux / 100
 *   Total TTC   = Total HT + TVA
 * Utilisé côté client (affichage temps réel) et côté serveur (recalcul à
 * l'enregistrement).
 */
export function calculerTotauxAchat(
  lignes: { quantite: any; prixAchat: any }[],
  o: { fraisTransport?: any; autreMontant?: any; tauxDouane?: any; taux?: any }
) {
  const sousTotalHT = lignes.reduce(
    (s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixAchat) || 0),
    0
  );
  const fraisTransport = Number(o.fraisTransport) || 0;
  const autreMontant = Number(o.autreMontant) || 0;
  const tauxDouane = Number(o.tauxDouane) || 0;
  const montantDouane = (sousTotalHT * tauxDouane) / 100;
  const totalHT = sousTotalHT + fraisTransport + autreMontant + montantDouane;
  const totalTVA = (totalHT * (Number(o.taux) || 0)) / 100;
  return {
    sousTotalHT,
    fraisTransport,
    autreMontant,
    tauxDouane,
    montantDouane,
    totalHT,
    totalTVA,
    totalTTC: totalHT + totalTVA,
  };
}
