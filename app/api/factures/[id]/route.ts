import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { FactureClient } from "@/models/factureClient";
import { LigneFacture } from "@/models/ligneFacture";
import { PaiementClient } from "@/models/paiementClient";
import { DemandeAnnulation } from "@/models/demandeAnnulation";
import { Client } from "@/models/client";
import { peutConsulterClient } from "@/lib/portee";

const ROLES = ["admin", "achat", "caisse", "comptable", "commercial"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const facture = await FactureClient.findById(id).lean();
  if (!facture) {
    return NextResponse.json({ message: "Facture introuvable" }, { status: 404 });
  }
  const client = facture.clientId ? await Client.findById(facture.clientId).lean() : null;
  if (!(await peutConsulterClient(user, client))) {
    return NextResponse.json({ message: "Facture introuvable" }, { status: 404 });
  }
  const lignes = await LigneFacture.find({ factureId: id }).lean();
  const paiements = await PaiementClient.find({ factureId: id }).sort({ datePaiement: -1 }).lean();

  // Dernier statut de demande d'annulation par encaissement
  const demandes = await DemandeAnnulation.find({
    paiementClientId: { $in: paiements.map((p) => p._id) },
  }).sort({ createdAt: -1 }).lean();
  const statutParPaiement = new Map<string, string>();
  for (const d of demandes) {
    const k = String(d.paiementClientId);
    if (!statutParPaiement.has(k)) statutParPaiement.set(k, d.statut);
  }

  return NextResponse.json({
    ...facture,
    lignes,
    paiements: paiements.map((p) => ({
      ...p,
      demandeAnnulationStatut: statutParPaiement.get(String(p._id)),
    })),
  });
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
  // Montants payés, statut de règlement et audit : écrits uniquement par les
  // écritures de règlement, jamais via cette fiche
  for (const k of [
    "numFacture", "totalPaye", "statutC", "resteAPaye", "saisiePar", "serviceAchat",
    "commandeId", "numCommande", "numComm", "agentUtilisateur", "heureAjout",
  ]) {
    delete entete[k];
  }

  Object.assign(facture, entete);
  facture.resteAPaye = (facture.totalTTC || 0) - (facture.totalPaye || 0);
  if ((facture.resteAPaye || 0) <= 0) facture.statutC = "soldee";
  else if (facture.statutC === "soldee" && (facture.resteAPaye || 0) > 0) {
    facture.statutC = (facture.totalPaye || 0) > 0 ? "partielle" : "en_attente";
  }
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
