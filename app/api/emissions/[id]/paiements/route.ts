import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { ReglementFournisseur } from "@/models/reglementFournisseur";
import { PaiementFournisseur } from "@/models/paiementFournisseur";
import { DemandeAnnulation } from "@/models/demandeAnnulation";

type Ctx = { params: Promise<{ id: string }> };

/** Décaissements (reçus) enregistrés sur une émission. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin", "achat", "comptable", "caisse"]);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const emission = await ReglementFournisseur.findById(id).lean();
  if (!emission) {
    return NextResponse.json({ message: "Émission introuvable" }, { status: 404 });
  }

  const paiements = await PaiementFournisseur.find({ reglementFournisseurId: id })
    .sort({ datePaiement: -1, createdAt: -1 })
    .lean();

  // Dernier statut de demande d'annulation par décaissement
  const demandes = await DemandeAnnulation.find({
    paiementFournisseurId: { $in: paiements.map((p) => p._id) },
  }).sort({ createdAt: -1 }).lean();
  const statutParPaiement = new Map<string, string>();
  for (const d of demandes) {
    const k = String(d.paiementFournisseurId);
    if (!statutParPaiement.has(k)) statutParPaiement.set(k, d.statut);
  }

  return NextResponse.json(
    paiements.map((p) => ({
      ...p,
      demandeAnnulationStatut: statutParPaiement.get(String(p._id)),
    }))
  );
}
