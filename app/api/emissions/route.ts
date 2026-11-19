import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { ReglementFournisseur } from "@/models/reglementFournisseur";
import { Achat } from "@/models/achat";
import { nextNumero } from "@/lib/numero";

const ROLES = ["admin", "achat", "comptable", "caisse"];

/** Liste des émissions de chèque de la période (FEN_EMISSION_DE_CHEQUE). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const du = searchParams.get("du");
  const au = searchParams.get("au");
  const fournisseurId = searchParams.get("fournisseurId");

  const filtre: any = {};
  if (du || au) {
    filtre.datePaiement = {};
    if (du) filtre.datePaiement.$gte = new Date(du);
    if (au) {
      const fin = new Date(au);
      fin.setHours(23, 59, 59, 999);
      filtre.datePaiement.$lte = fin;
    }
  }
  if (fournisseurId) filtre.fournisseurId = fournisseurId;

  const emissions = await ReglementFournisseur.find(filtre)
    .sort({ datePaiement: -1 })
    .limit(500)
    .lean();
  return NextResponse.json(emissions);
}

/**
 * Nouvelle émission : sélectionner le fournisseur, cocher ses bons de
 * commande validés, renseigner banque/chèque/ordre, puis envoyer à la
 * comptabilité pour décaissement.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "achat"]);
  if (error) return error;
  await db();

  const data = await req.json();
  const achatIds: string[] = Array.isArray(data.achatIds) ? data.achatIds : [];
  if (!data.fournisseurId || !achatIds.length) {
    return NextResponse.json(
      { message: "Sélectionnez un fournisseur et au moins un bon de commande" },
      { status: 400 }
    );
  }

  // Vérifier que les bons appartiennent au fournisseur et sont transférés
  const achats = await Achat.find({
    _id: { $in: achatIds },
    fournisseurId: data.fournisseurId,
    serviceComptable: true,
    chequeEdite: { $ne: true },
  }).lean();

  if (!achats.length) {
    return NextResponse.json(
      { message: "Aucun bon de commande valide sélectionné (doivent être transférés à la compta)" },
      { status: 409 }
    );
  }

  const montantTotal = achats.reduce((s, a) => s + (a.totalTTC || 0), 0);
  const numEmission = await nextNumero(ReglementFournisseur, "numEmission", "EMI");

  const mode = data.modeReglement || "Chèque";
  // Ne conserver que les références du mode choisi
  const banque = ["Chèque", "Virement", "Carte bancaire"].includes(mode) ? data.banque : "";
  const numCheque = mode === "Chèque" ? data.numCheque : "";
  const numVirement = mode === "Virement" ? data.numVirement : "";
  const numTel = mode === "Mobile Money" ? data.numTel : "";

  const emission = await ReglementFournisseur.create({
    numEmission,
    datePaiement: data.datePaiement || new Date(),
    heurePaiement: new Date().toLocaleTimeString("fr-FR"),
    payePar: `${user.nom} ${user.prenom}`.trim(),
    recuPar: data.recuPar,
    montantTotal,
    fournisseurId: data.fournisseurId,
    fournisseur: data.fournisseur,
    modeReglement: mode,
    banque,
    numCheque,
    numVirement,
    numTel,
    delaisDeReglement: data.delaisDeReglement,
    alOrdreDe: data.alOrdreDe,
    totalPaye: 0,
    resteAPaye: montantTotal,
    remise: data.remise || 0,
    achatIds: achats.map((a) => a._id),
    statut: "transfere_compta",
  });

  await Achat.updateMany(
    { _id: { $in: achats.map((a) => a._id) } },
    { chequeEdite: true, paiementFournisseurId: emission._id }
  );

  return NextResponse.json(emission, { status: 201 });
}
