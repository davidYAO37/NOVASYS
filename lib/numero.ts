import type { Model } from "mongoose";

/**
 * Génère un numéro de document séquentiel par année, ex: CDE-2026-0001.
 * Équivalent des numérotations WinDev (NumCommande, NumAchat, NumFacture).
 */
export async function nextNumero(
  model: Model<any>,
  champ: string,
  prefixe: string
): Promise<string> {
  const annee = new Date().getFullYear();
  const regex = new RegExp(`^${prefixe}-${annee}-`);
  const dernier = await model
    .findOne({ [champ]: regex })
    .sort({ [champ]: -1 })
    .select(champ)
    .lean() as any;

  let seq = 1;
  if (dernier?.[champ]) {
    const m = String(dernier[champ]).match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefixe}-${annee}-${String(seq).padStart(4, "0")}`;
}

/** Formate un montant en FCFA lisible (1 234 567). */
export function formatMontant(n: number | null | undefined): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
}
