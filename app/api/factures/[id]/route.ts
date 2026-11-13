import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { FactureClient } from "@/models/factureClient";
import { LigneFacture } from "@/models/ligneFacture";
import { PaiementClient } from "@/models/paiementClient";

const ROLES = ["admin", "achat", "caisse", "comptable"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const facture = await FactureClient.findById(id).lean();
  if (!facture) {
    return NextResponse.json({ message: "Facture introuvable" }, { status: 404 });
  }
  const lignes = await LigneFacture.find({ factureId: id }).lean();
  const paiements = await PaiementClient.find({ factureId: id }).sort({ datePaiement: -1 }).lean();
  return NextResponse.json({ ...facture, lignes, paiements });
}

/** Actualiser la facture (FEN_Modifier_Facture). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin", "achat", "caisse"]);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const facture = await FactureClient.findById(id);
  if (!facture) {
    return NextResponse.json({ message: "Facture introuvable" }, { status: 404 });
  }

  const data = await req.json();
  const { lignes, ...entete } = data;
  delete entete.numFacture;

  Object.assign(facture, entete);
  facture.resteAPaye = (facture.totalTTC || 0) - (facture.totalPaye || 0);
  if ((facture.resteAPaye || 0) <= 0) facture.statutC = "soldee";
  await facture.save();

  if (Array.isArray(lignes)) {
    await LigneFacture.deleteMany({ factureId: facture._id });
    if (lignes.length) {
      await LigneFacture.insertMany(
        lignes.map((l: any) => ({
          ...l,
          _id: undefined,
          factureId: facture._id,
        }))
      );
    }
  }

  const lignesMAJ = await LigneFacture.find({ factureId: facture._id }).lean();
  return NextResponse.json({ ...facture.toObject(), lignes: lignesMAJ });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["suppression_documents"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  await LigneFacture.deleteMany({ factureId: id });
  await FactureClient.findByIdAndDelete(id);
  return NextResponse.json({ message: "Facture supprimée" });
}
