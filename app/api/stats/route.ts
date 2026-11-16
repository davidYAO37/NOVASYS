import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { FactureClient } from "@/models/factureClient";
import { Achat } from "@/models/achat";
import { Client } from "@/models/client";
import { Fournisseur } from "@/models/fournisseur";
import { Stock } from "@/models/stock";
import { filtreSaisie, filtreCreateur } from "@/lib/portee";

/**
 * Bilan de l'écran d'accueil (FEN_MENU WinDev) :
 * commandes enregistrées / envoyées au service achat / en cours / traitées,
 * plus les totaux de facturation et les alertes stock.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  await db();

  const filtreCommercial = filtreSaisie(user);
  const filtreTiers = filtreCreateur(user);

  const [
    totalEnregistrees,
    totalEnvoyees,
    totalEnCours,
    totalTraitees,
    proformasEnAttente,
    caFacture,
    creances,
    dettes,
    nbClients,
    nbFournisseurs,
    alertesStock,
  ] = await Promise.all([
    Commande.countDocuments(filtreCommercial),
    Commande.countDocuments({ ...filtreCommercial, serviceAchat: true }),
    Commande.countDocuments({
      ...filtreCommercial,
      statutC: { $in: ["en_cours", "partielle"] },
    }),
    Commande.countDocuments({ ...filtreCommercial, statutC: "traitee" }),
    Commande.countDocuments({ ...filtreCommercial, serviceAchat: { $ne: true } }),
    FactureClient.aggregate([
      { $match: filtreCommercial },
      { $group: { _id: null, total: { $sum: "$totalTTC" } } },
    ]),
    Client.aggregate([
      { $match: filtreTiers },
      { $group: { _id: null, total: { $sum: "$resteAPaye" } } },
    ]),
    Fournisseur.aggregate([
      { $match: filtreTiers },
      { $group: { _id: null, total: { $sum: "$resteAPaye" } } },
    ]),
    Client.countDocuments(filtreTiers),
    Fournisseur.countDocuments(filtreTiers),
    Stock.countDocuments({
      $expr: { $lte: ["$qteEnStock", "$seuilAlerte"] },
      seuilAlerte: { $gt: 0 },
    }),
  ]);

  return NextResponse.json({
    commandes: {
      enregistrees: totalEnregistrees,
      envoyees: totalEnvoyees,
      enCours: totalEnCours,
      traitees: totalTraitees,
      nonTraitees: proformasEnAttente,
    },
    caFacture: caFacture[0]?.total || 0,
    creancesClients: creances[0]?.total || 0,
    dettesFournisseurs: dettes[0]?.total || 0,
    nbClients,
    nbFournisseurs,
    alertesStock,
  });
}
