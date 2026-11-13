import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { LigneCde } from "@/models/ligneCde";
import { DocumentDevis } from "@/models/documentDevis";

const ROLES = ["admin", "commercial", "achat"];

type Ctx = { params: Promise<{ id: string }> };

/** Détail d'une commande + ses lignes + documents joints (proforma). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id).lean();
  if (!commande) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  const lignes = await LigneCde.find({ commandeId: id }).lean();
  const documents = await DocumentDevis.find({ commandeId: id }).lean();
  return NextResponse.json({ ...commande, lignes, documents });
}

/** Actualiser une commande (en-tête et lignes) — tant qu'elle n'est pas traitée. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id);
  if (!commande) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  if (commande.statutC === "traitee") {
    return NextResponse.json(
      { message: "Cette commande est déjà traitée et ne peut plus être modifiée" },
      { status: 409 }
    );
  }

  const data = await req.json();
  const { lignes, ...entete } = data;
  delete entete.numCommande;

  Object.assign(commande, entete);
  await commande.save();

  if (Array.isArray(lignes)) {
    await LigneCde.deleteMany({ commandeId: commande._id });
    if (lignes.length) {
      await LigneCde.insertMany(
        lignes.map((l: any) => ({
          ...l,
          _id: undefined,
          commandeId: commande._id,
          numCommande: commande.numCommande,
        }))
      );
    }
  }

  const lignesMAJ = await LigneCde.find({ commandeId: commande._id }).lean();
  return NextResponse.json({ ...commande.toObject(), lignes: lignesMAJ });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["suppression_documents"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  await LigneCde.deleteMany({ commandeId: id });
  await DocumentDevis.deleteMany({ commandeId: id });
  await Commande.findByIdAndDelete(id);
  return NextResponse.json({ message: "Commande supprimée" });
}
