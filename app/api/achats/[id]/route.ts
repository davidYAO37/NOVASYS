import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Achat } from "@/models/achat";
import { LigneAchat } from "@/models/ligneAchat";

const ROLES = ["admin", "achat", "comptable"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const achat = await Achat.findById(id).lean();
  if (!achat) {
    return NextResponse.json({ message: "Bon de commande introuvable" }, { status: 404 });
  }
  const lignes = await LigneAchat.find({ achatId: id }).lean();
  return NextResponse.json({ ...achat, lignes });
}

/** Actualiser un bon de commande (tant qu'il n'est pas transféré à la compta). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin", "achat"]);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const achat = await Achat.findById(id);
  if (!achat) {
    return NextResponse.json({ message: "Bon de commande introuvable" }, { status: 404 });
  }
  if (achat.serviceComptable) {
    return NextResponse.json(
      { message: "Déjà transféré à la comptabilité : modification impossible" },
      { status: 409 }
    );
  }

  const data = await req.json();
  const { lignes, ...entete } = data;
  delete entete.numAchat;

  Object.assign(achat, entete);
  await achat.save();

  if (Array.isArray(lignes)) {
    await LigneAchat.deleteMany({ achatId: achat._id });
    if (lignes.length) {
      await LigneAchat.insertMany(
        lignes.map((l: any) => ({
          ...l,
          _id: undefined,
          achatId: achat._id,
          numAchat: achat.numAchat,
        }))
      );
    }
  }

  const lignesMAJ = await LigneAchat.find({ achatId: achat._id }).lean();
  return NextResponse.json({ ...achat.toObject(), lignes: lignesMAJ });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["suppression_documents"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  await LigneAchat.deleteMany({ achatId: id });
  await Achat.findByIdAndDelete(id);
  return NextResponse.json({ message: "Bon de commande supprimé" });
}
