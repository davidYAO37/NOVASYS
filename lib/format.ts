/** Formatage montant FCFA côté client et serveur. */
export function fmtMontant(n: number | null | undefined): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0));
}

export function fmtDate(d?: string | Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString("fr-FR");
}

export const STATUTS_COMMANDE: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Pas encore envoyé", color: "secondary" },
  en_cours: { label: "En cours de traitement", color: "warning" },
  traitee: { label: "Traitée", color: "success" },
  annulee: { label: "Annulée", color: "danger" },
};

export const STATUTS_ACHAT: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "secondary" },
  transfere_compta: { label: "Transféré comptabilité", color: "info" },
  paye: { label: "Payé", color: "success" },
  annule: { label: "Annulé", color: "danger" },
};

export const STATUTS_FACTURE: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "warning" },
  partielle: { label: "Partiellement payée", color: "info" },
  soldee: { label: "Soldée", color: "success" },
  annulee: { label: "Annulée", color: "danger" },
};

export const MODES_REGLEMENT = [
  "Espèces",
  "Chèque",
  "Virement",
  "Mobile Money",
  "Carte bancaire",
];
