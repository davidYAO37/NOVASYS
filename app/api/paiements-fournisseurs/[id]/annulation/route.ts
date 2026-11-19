import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { PaiementFournisseur } from "@/models/paiementFournisseur";
import { ReglementFournisseur } from "@/models/reglementFournisseur";
import { DemandeAnnulation } from "@/models/demandeAnnulation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Demande d'annulation d'un décaissement : réservée à celui qui a fait
 * le décaissement (ou l'admin). Motif obligatoire, une seule demande
 * en attente par paiement.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "comptable", "caisse"], {
    actions: ["decaissement"],
  });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();
  const motif = (data.motif || "").trim();
  if (!motif) {
    return NextResponse.json({ message: "Le motif est obligatoire" }, { status: 400 });
  }

  const paiement = await PaiementFournisseur.findById(id);
  if (!paiement) {
    return NextResponse.json({ message: "Décaissement introuvable" }, { status: 404 });
  }
  if (paiement.annule) {
    return NextResponse.json({ message: "Décaissement déjà annulé" }, { status: 409 });
  }

  const saisiPar = `${user.nom} ${user.prenom}`.trim();
  const estAdmin = user.type === "admin" || user.type === "adminsuper";
  if (!estAdmin && paiement.payePar !== saisiPar) {
    return NextResponse.json(
      { message: "Seul celui qui a fait le décaissement peut demander son annulation" },
      { status: 403 }
    );
  }

  const enAttente = await DemandeAnnulation.findOne({
    paiementFournisseurId: id,
    statut: "en_attente",
  });
  if (enAttente) {
    return NextResponse.json(
      { message: "Une demande d'annulation est déjà en attente pour ce décaissement" },
      { status: 409 }
    );
  }

  const emission = paiement.reglementFournisseurId
    ? await ReglementFournisseur.findById(paiement.reglementFournisseurId).lean()
    : null;

  const demande = await DemandeAnnulation.create({
    paiementFournisseurId: paiement._id,
    reglementFournisseurId: paiement.reglementFournisseurId,
    numEmission: emission?.numEmission,
    fournisseur: paiement.fournisseur,
    montant: paiement.montantPaye,
    motif,
    demandePar: saisiPar,
    demandeurId: user._id,
  });

  return NextResponse.json(demande, { status: 201 });
}
