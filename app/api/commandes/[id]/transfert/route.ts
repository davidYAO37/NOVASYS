import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { achatsActifs } from "@/lib/commandeAchat";
import { peutVoirSaisie } from "@/lib/portee";
import { hasActionPermission } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Transférer la commande au service achat après validation du client
 * (bouton "transférer" de FEN_GESTION_DES_DEVIS).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "commercial"]);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id);
  if (!commande || !peutVoirSaisie(user, commande)) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  if (commande.serviceAchat) {
    return NextResponse.json(
      { message: "Cette commande est déjà transférée au service achat" },
      { status: 409 }
    );
  }

  commande.serviceAchat = true;
  commande.statutC = "en_cours";
  commande.renvoyee = false;
  commande.envoyeAchatPar = `${user.nom} ${user.prenom}`.trim();
  commande.envoyeLe = new Date();
  await commande.save();

  return NextResponse.json(commande);
}

/**
 * Annuler le transfert d'une commande
 * (action réservée — permission "annulation_transfert").
 * Le commercial peut aussi reprendre son propre devis tant que le service
 * achat ne l'a pas traité (aucun bon de commande).
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const autorise =
    ["admin", "adminsuper", "commercial"].includes(user.type) ||
    hasActionPermission(user, "annulation_transfert");
  if (!autorise) {
    return NextResponse.json({ message: "Accès interdit" }, { status: 403 });
  }
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id);
  if (!commande || !peutVoirSaisie(user, commande)) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  if (commande.statutC === "traitee") {
    return NextResponse.json(
      { message: "Commande déjà traitée : annulation du transfert impossible" },
      { status: 409 }
    );
  }
  const achats = await achatsActifs(commande._id);
  if (achats.length) {
    return NextResponse.json(
      { message: "Des bons de commande existent déjà pour ce devis" },
      { status: 409 }
    );
  }

  commande.serviceAchat = false;
  commande.statutC = "brouillon";
  commande.envoyeAchatPar = undefined;
  commande.envoyeLe = undefined;
  await commande.save();

  return NextResponse.json(commande);
}
