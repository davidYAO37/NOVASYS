import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Achat } from "@/models/achat";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Transférer le bon de commande pour l'émission du chèque / vers la
 * comptabilité (guide service achat : "transférer le bon de commande
 * pour l'édition du chèque").
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "achat"]);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const achat = await Achat.findById(id);
  if (!achat) {
    return NextResponse.json({ message: "Bon de commande introuvable" }, { status: 404 });
  }
  if (achat.serviceComptable) {
    return NextResponse.json(
      { message: "Déjà transféré à la comptabilité" },
      { status: 409 }
    );
  }

  achat.serviceComptable = true;
  achat.statutAchat = "transfere_compta";
  achat.comptaEnvoieLe = new Date();
  achat.comptaEnvoiePar = `${user.nom} ${user.prenom}`.trim();
  await achat.save();

  return NextResponse.json(achat);
}
