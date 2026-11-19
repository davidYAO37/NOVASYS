import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { LigneCde } from "@/models/ligneCde";
import { DocumentDevis } from "@/models/documentDevis";
import { achatsActifs, quantitesCommandees } from "@/lib/commandeAchat";
import { calculerLigne, calculerTotaux } from "@/lib/calculDevis";
import { peutVoirSaisie } from "@/lib/portee";

const ROLES = ["admin", "commercial", "achat"];

type Ctx = { params: Promise<{ id: string }> };

/** Détail d'une commande + ses lignes + documents joints (proforma). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id).lean();
  if (!commande || !peutVoirSaisie(user, commande)) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  const lignes = await LigneCde.find({ commandeId: id }).lean();
  const documents = await DocumentDevis.find({ commandeId: id }).lean();
  const commandees = await quantitesCommandees(id);
  const achats = await achatsActifs(id);
  const lignesEnrichies = lignes.map((l) => {
    const qteCommandee = commandees.get(String(l._id)) || 0;
    return {
      ...l,
      qteCommandee,
      qteRestante: Math.max(0, l.quantite - qteCommandee),
    };
  });
  return NextResponse.json({
    ...commande,
    lignes: lignesEnrichies,
    documents,
    achats: achats.map((a) => ({
      _id: a._id,
      numAchat: a.numAchat,
      dateAchat: a.dateAchat,
      fournisseur: a.fournisseur,
      totalTTC: a.totalTTC,
      statutAchat: a.statutAchat,
    })),
  });
}

/** Actualiser une commande (en-tête et lignes) — tant qu'elle n'est pas traitée. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id);
  if (!commande || !peutVoirSaisie(user, commande)) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  if (commande.statutC === "traitee") {
    return NextResponse.json(
      { message: "Cette commande est déjà traitée et ne peut plus être modifiée" },
      { status: 409 }
    );
  }
  const achatsExistants = await achatsActifs(commande._id);
  if (achatsExistants.length) {
    return NextResponse.json(
      { message: "Des bons de commande existent déjà pour ce devis" },
      { status: 409 }
    );
  }

  const data = await req.json();
  const { lignes, ...entete } = data;
  // Circuit (transfert, traitement, renvoi, clôture) et montants : gérés par
  // les routes dédiées et le recalcul, jamais par la fiche
  for (const k of [
    "numCommande", "saisiePar", "creerPar", "statutC", "serviceAchat",
    "envoyeAchatPar", "envoyeLe", "renvoyee", "motifRenvoi", "renvoyeLe",
    "renvoyePar", "clotureManuelle", "clotureLe", "cloturePar", "factureEditee",
    "bonAchat", "numAchat", "totalPaye", "totalHT", "remise", "totalAvecRemise",
    "totalTVA", "totalTTC", "resteAPaye", "heureAjout",
  ]) {
    delete entete[k];
  }

  if (entete.numComm !== undefined) {
    const numComm = (entete.numComm || "").trim();
    if (numComm) {
      const existe = await Commande.findOne({
        numComm,
        _id: { $ne: commande._id },
      }).select("_id").lean();
      if (existe) {
        return NextResponse.json(
          { message: "N° proforma déjà utilisé" },
          { status: 409 }
        );
      }
    }
    entete.numComm = numComm || commande.numComm;
  }

  Object.assign(commande, entete);

  const lignesRecalc = Array.isArray(lignes) ? lignes.map((l: any) => calculerLigne(l)) : null;
  const totaux = calculerTotaux(lignesRecalc || (await LigneCde.find({ commandeId: commande._id }).lean()), {
    mainDoeuvre: commande.mainDoeuvre,
    tauxRemise: commande.tauxRemise,
    taux: commande.taux,
    totalPaye: commande.totalPaye,
  });
  commande.totalHT = totaux.totalHT;
  commande.remise = totaux.remise;
  commande.totalAvecRemise = totaux.totalAvecRemise;
  commande.totalTVA = totaux.totalTVA;
  commande.totalTTC = totaux.totalTTC;
  commande.totalPaye = totaux.totalPaye;
  commande.resteAPaye = totaux.resteAPaye;
  await commande.save();

  if (lignesRecalc) {
    await LigneCde.deleteMany({ commandeId: commande._id });
    if (lignesRecalc.length) {
      await LigneCde.insertMany(
        lignesRecalc.map((l: any) => ({
          ...l,
          _id: undefined,
          articleId: l.articleId || undefined,
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
  const { user, error } = await requireAuth(req, ["admin"], { actions: ["suppression_documents"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const commande = await Commande.findById(id).select("saisiePar").lean();
  if (commande && !peutVoirSaisie(user, commande)) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  await LigneCde.deleteMany({ commandeId: id });
  await DocumentDevis.deleteMany({ commandeId: id });
  await Commande.findByIdAndDelete(id);
  return NextResponse.json({ message: "Commande supprimée" });
}
