import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { PaiementClient } from "@/models/paiementClient";
import { DemandeAnnulation } from "@/models/demandeAnnulation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Demande d'annulation d'un encaissement client : réservée à celui qui
 * a encaissé (ou l'admin). Motif obligatoire, une seule demande en
 * attente par paiement.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "caisse", "comptable"], {
    actions: ["annulation_encaissement"],
  });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();
  const motif = (data.motif || "").trim();
  if (!motif) {
    return NextResponse.json({ message: "Le motif est obligatoire" }, { status: 400 });
  }

  const paiement = await PaiementClient.findById(id);
  if (!paiement) {
    return NextResponse.json({ message: "Encaissement introuvable" }, { status: 404 });
  }
  if (paiement.annule) {
    return NextResponse.json({ message: "Encaissement déjà annulé" }, { status: 409 });
  }

  const saisiPar = `${user.nom} ${user.prenom}`.trim();
  const estAdmin = user.type === "admin" || user.type === "adminsuper";
  if (!estAdmin && paiement.payePar !== saisiPar) {
    return NextResponse.json(
      { message: "Seul celui qui a encaissé peut demander l'annulation" },
      { status: 403 }
    );
  }

  const enAttente = await DemandeAnnulation.findOne({
    paiementClientId: id,
    statut: "en_attente",
  });
  if (enAttente) {
    return NextResponse.json(
      { message: "Une demande d'annulation est déjà en attente pour cet encaissement" },
      { status: 409 }
    );
  }

  const demande = await DemandeAnnulation.create({
    type: "encaissement",
    paiementClientId: paiement._id,
    factureId: paiement.factureId,
    numFacture: paiement.numeroFactBL || paiement.numCommande,
    clientC: paiement.clientC,
    montant: paiement.montantPaye,
    motif,
    demandePar: saisiPar,
    demandeurId: user._id,
  });

  return NextResponse.json(demande, { status: 201 });
}
