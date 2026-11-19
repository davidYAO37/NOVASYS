import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Fournisseur } from "@/models/fournisseur";
import { Achat } from "@/models/achat";
import { ReglementFournisseur } from "@/models/reglementFournisseur";
import { peutVoirCreateur, peutConsulterFournisseur } from "@/lib/portee";

const ROLES = ["admin", "commercial", "achat", "comptable"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const fournisseur = await Fournisseur.findById(id).lean();
  if (!fournisseur || !(await peutConsulterFournisseur(user, fournisseur))) {
    return NextResponse.json({ message: "Fournisseur introuvable" }, { status: 404 });
  }

  // Liste des commandes (bons de commande) et émissions du fournisseur
  const achats = await Achat.find({ fournisseurId: id }).sort({ dateAchat: -1 }).lean();
  const emissions = await ReglementFournisseur.find({ fournisseurId: id })
    .sort({ datePaiement: -1 })
    .lean();

  return NextResponse.json({ ...fournisseur, achats, emissions });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();
  for (const k of [
    "saisiePar", "creerPar", "modifiePar", "compteFournisseur", "montantPaye", "resteAPaye",
  ]) {
    delete data[k];
  }
  const existant = await Fournisseur.findById(id).select("creerPar").lean();
  if (!existant || !(await peutConsulterFournisseur(user, existant))) {
    return NextResponse.json({ message: "Fournisseur introuvable" }, { status: 404 });
  }
  const fournisseur = await Fournisseur.findByIdAndUpdate(
    id,
    { ...data, modifiePar: `${user.nom} ${user.prenom}`.trim() },
    { new: true }
  );
  if (!fournisseur) {
    return NextResponse.json({ message: "Fournisseur introuvable" }, { status: 404 });
  }
  return NextResponse.json(fournisseur);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin"]);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const fournisseur = await Fournisseur.findById(id).select("creerPar").lean();
  if (fournisseur && !peutVoirCreateur(user, fournisseur)) {
    return NextResponse.json({ message: "Fournisseur introuvable" }, { status: 404 });
  }
  const nbAchats = await Achat.countDocuments({ fournisseurId: id });
  if (nbAchats > 0) {
    return NextResponse.json(
      { message: "Impossible : ce fournisseur possède des bons de commande" },
      { status: 409 }
    );
  }
  await Fournisseur.findByIdAndDelete(id);
  return NextResponse.json({ message: "Fournisseur supprimé" });
}
