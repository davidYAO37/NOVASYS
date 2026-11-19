import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { ReglementFournisseur } from "@/models/reglementFournisseur";
import { PaiementFournisseur } from "@/models/paiementFournisseur";
import { Fournisseur } from "@/models/fournisseur";
import { Caisse } from "@/models/caisse";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Décaissement d'une émission par la comptabilité : enregistre le
 * paiement fournisseur, met à jour les soldes et écrit en caisse.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "comptable", "caisse"], {
    actions: ["decaissement"],
  });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();
  const montant = Number(data.montantPaye) || 0;
  if (montant <= 0) {
    return NextResponse.json({ message: "Montant invalide" }, { status: 400 });
  }

  const emission = await ReglementFournisseur.findById(id);
  if (!emission) {
    return NextResponse.json({ message: "Émission introuvable" }, { status: 404 });
  }
  if (emission.statut === "renvoyee") {
    return NextResponse.json(
      { message: "Émission renvoyée au service achat : décaissement impossible" },
      { status: 409 }
    );
  }
  if ((emission.resteAPaye || 0) < montant) {
    return NextResponse.json(
      { message: "Le montant dépasse le reste à payer de l'émission" },
      { status: 409 }
    );
  }

  const saisiPar = `${user.nom} ${user.prenom}`.trim();
  const mode = data.modeReglement || emission.modeReglement;
  // Ne conserver que les références du mode choisi
  const banque = ["Chèque", "Virement", "Carte bancaire"].includes(mode)
    ? data.banque || emission.banque
    : "";
  const numCheque = mode === "Chèque" ? data.numCheque || emission.numCheque : "";
  const numVirement = mode === "Virement" ? data.numVirement || emission.numVirement : "";
  const numTel = mode === "Mobile Money" ? data.numTel || emission.numTel : "";

  const paiement = await PaiementFournisseur.create({
    datePaiement: data.datePaiement || new Date(),
    heureAjout: new Date().toLocaleTimeString("fr-FR"),
    payePar: saisiPar,
    recuDe: data.recuDe || emission.fournisseur,
    totalAPayer: emission.montantTotal,
    montantPaye: montant,
    resteAPaye: (emission.resteAPaye || 0) - montant,
    modeReglement: mode,
    banque,
    numCheque,
    numVirement,
    numTel,
    objetAchat: data.objetAchat || `Émission ${emission.numEmission || ""}`,
    reglementFournisseurId: emission._id,
    fournisseurId: emission.fournisseurId,
    fournisseur: emission.fournisseur,
    alOrdreDe: emission.alOrdreDe,
    delaisDeReglement: emission.delaisDeReglement,
  });

  emission.totalPaye = (emission.totalPaye || 0) + montant;
  emission.resteAPaye = (emission.montantTotal || 0) - emission.totalPaye;
  emission.statut = (emission.resteAPaye || 0) <= 0 ? "decaisse" : "transfere_compta";
  await emission.save();

  if (emission.fournisseurId) {
    await Fournisseur.findByIdAndUpdate(emission.fournisseurId, {
      $inc: { montantPaye: montant, resteAPaye: -montant },
    });
  }

  // Écriture en caisse (sortie)
  const dernierMouvement = await Caisse.findOne().sort({ dateC: -1, createdAt: -1 }).lean();
  const solde = (dernierMouvement?.solde || 0) - montant;
  await Caisse.create({
    typeC: "sortie",
    operation: "Décaissement fournisseur",
    motif: `Émission ${emission.numEmission || ""} — ${emission.fournisseur || ""}`,
    montantC: montant,
    dateC: paiement.datePaiement,
    heureC: new Date().toLocaleTimeString("fr-FR"),
    nomPrenoms: emission.fournisseur,
    solde,
    ajouterParC: saisiPar,
  });

  return NextResponse.json({ paiement, emission }, { status: 201 });
}
