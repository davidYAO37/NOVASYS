import { Types } from "mongoose";
import { Achat } from "@/models/achat";
import { LigneAchat } from "@/models/ligneAchat";
import { LigneCde } from "@/models/ligneCde";
import { Commande } from "@/models/commande";

/** Bons de commande fournisseur actifs (non annulés) d'un devis. */
export async function achatsActifs(commandeId: string | Types.ObjectId) {
  return Achat.find({ commandeId, statutAchat: { $ne: "annule" } })
    .sort({ dateAchat: 1, createdAt: 1 })
    .lean();
}

/**
 * Quantités déjà commandées par ligne de devis (somme des LigneAchat
 * des bons actifs), indexée par ligneCdeId en chaîne.
 */
export async function quantitesCommandees(
  commandeId: string | Types.ObjectId,
  excludeAchatId?: string | Types.ObjectId
): Promise<Map<string, number>> {
  const filtre: any = { commandeId, statutAchat: { $ne: "annule" } };
  if (excludeAchatId) filtre._id = { $ne: excludeAchatId };
  const achats = await Achat.find(filtre).select("_id").lean();
  const achatIds = achats.map((a) => a._id);
  const map = new Map<string, number>();
  if (!achatIds.length) return map;

  const lignes = await LigneAchat.find({ achatId: { $in: achatIds } })
    .select("ligneCdeId quantite")
    .lean();
  for (const l of lignes) {
    if (!l.ligneCdeId) continue;
    const k = String(l.ligneCdeId);
    map.set(k, (map.get(k) || 0) + (Number(l.quantite) || 0));
  }
  return map;
}

/**
 * Recalcule le statut d'un devis selon les bons de commande émis :
 * - clôture manuelle → traitee ;
 * - aucun bon actif → en_cours si transféré, sinon brouillon ;
 * - toutes les lignes commandées → traitee ; sinon partielle.
 * Met aussi à jour bonAchat (liste des N°) et numAchat (dernier).
 */
export async function recalculerStatutCommande(commandeId: string | Types.ObjectId) {
  const commande = await Commande.findById(commandeId);
  if (!commande) return null;

  const achats = await achatsActifs(commandeId);
  const lignes = await LigneCde.find({ commandeId }).lean();
  const commandees = await quantitesCommandees(commandeId);

  let statut: string;
  if (commande.clotureManuelle) {
    statut = "traitee";
  } else if (!achats.length) {
    statut = commande.serviceAchat ? "en_cours" : "brouillon";
  } else {
    const toutCommande = lignes.every(
      (l) => l.quantite - (commandees.get(String(l._id)) || 0) <= 0
    );
    statut = toutCommande ? "traitee" : "partielle";
  }

  commande.statutC = statut;
  const numeros = achats.map((a) => a.numAchat);
  commande.bonAchat = numeros.length ? numeros.join(", ") : undefined;
  commande.numAchat = numeros.length ? numeros[numeros.length - 1] : undefined;
  await commande.save();
  return commande;
}
