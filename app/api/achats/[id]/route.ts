import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Achat } from "@/models/achat";
import { LigneAchat } from "@/models/ligneAchat";
import { LigneCde } from "@/models/ligneCde";
import { quantitesCommandees, recalculerStatutCommande } from "@/lib/commandeAchat";

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

  let lignesRecalc: any[] | null = null;
  if (Array.isArray(lignes) && achat.commandeId) {
    const lignesCde = await LigneCde.find({ commandeId: achat.commandeId }).lean();
    const lignesCdeParId = new Map(lignesCde.map((l) => [String(l._id), l]));
    const commandees = await quantitesCommandees(achat.commandeId, achat._id);
    const EPS = 1e-9;
    for (const l of lignes) {
      const quantite = Number(l.quantite);
      if (!(quantite > 0)) {
        return NextResponse.json(
          { message: `Quantité invalide pour « ${l.articleM || "article"} »` },
          { status: 400 }
        );
      }
      if (l.ligneCdeId) {
        const lc = lignesCdeParId.get(String(l.ligneCdeId));
        if (!lc) {
          return NextResponse.json(
            { message: `La ligne « ${l.articleM || "article"} » n'appartient pas à cette commande` },
            { status: 400 }
          );
        }
        const reste = lc.quantite - (commandees.get(String(l.ligneCdeId)) || 0);
        if (quantite - reste > EPS) {
          return NextResponse.json(
            {
              message: `Quantité trop élevée pour « ${lc.articleM || l.articleM} » : reste ${reste}`,
            },
            { status: 400 }
          );
        }
      }
    }
    const taux = Number(data.taux ?? achat.taux) || 0;
    lignesRecalc = lignes.map((l: any) => {
      const prixTHT = Number(l.quantite) * (Number(l.prixAchat) || 0);
      const tvaEntree = (prixTHT * taux) / 100;
      return { ...l, prixTHT, tvaEntree, montantTTCE: prixTHT + tvaEntree };
    });
    entete.totalHT = lignesRecalc.reduce((s, l) => s + l.prixTHT, 0);
    entete.totalTVA = lignesRecalc.reduce((s, l) => s + l.tvaEntree, 0);
    entete.totalTTC = entete.totalHT + entete.totalTVA;
    entete.resteAPaye = entete.totalTTC - (achat.totalPaye || 0);
  }

  Object.assign(achat, entete);
  await achat.save();

  if (Array.isArray(lignes)) {
    await LigneAchat.deleteMany({ achatId: achat._id });
    const aInserer = lignesRecalc ?? lignes;
    if (aInserer.length) {
      await LigneAchat.insertMany(
        aInserer.map((l: any) => ({
          ...l,
          _id: undefined,
          achatId: achat._id,
          numAchat: achat.numAchat,
        }))
      );
    }
  }

  if (achat.commandeId) {
    await recalculerStatutCommande(achat.commandeId);
  }

  const lignesMAJ = await LigneAchat.find({ achatId: achat._id }).lean();
  return NextResponse.json({ ...achat.toObject(), lignes: lignesMAJ });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["suppression_documents"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const achat = await Achat.findById(id).lean();
  await LigneAchat.deleteMany({ achatId: id });
  await Achat.findByIdAndDelete(id);
  if (achat?.commandeId) {
    await recalculerStatutCommande(achat.commandeId);
  }
  return NextResponse.json({ message: "Bon de commande supprimé" });
}
