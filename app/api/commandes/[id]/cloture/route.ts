import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { recalculerStatutCommande } from "@/lib/commandeAchat";
import { peutVoirSaisie } from "@/lib/portee";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Clôturer manuellement un devis au service achat
 * (les lignes restantes ne seront plus commandées).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "achat"], {
    actions: ["cloture_commande"],
  });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id);
  if (!commande || !peutVoirSaisie(user, commande)) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  if (!commande.serviceAchat) {
    return NextResponse.json(
      { message: "Cette commande n'est pas transférée au service achat" },
      { status: 409 }
    );
  }

  commande.clotureManuelle = true;
  commande.statutC = "traitee";
  commande.clotureLe = new Date();
  commande.cloturePar = `${user.nom} ${user.prenom}`.trim();
  await commande.save();

  return NextResponse.json(commande);
}

/** Rouvrir un devis clôturé manuellement (statut recalculé). */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "achat"], {
    actions: ["cloture_commande"],
  });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id);
  if (!commande || !peutVoirSaisie(user, commande)) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }

  commande.clotureManuelle = false;
  commande.clotureLe = undefined;
  commande.cloturePar = undefined;
  await commande.save();

  const maj = await recalculerStatutCommande(id);
  return NextResponse.json(maj);
}
