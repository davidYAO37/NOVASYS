import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { DemandeAnnulation } from "@/models/demandeAnnulation";
import { PaiementFournisseur } from "@/models/paiementFournisseur";
import { ReglementFournisseur } from "@/models/reglementFournisseur";
import { PaiementClient } from "@/models/paiementClient";
import { FactureClient } from "@/models/factureClient";
import { Client } from "@/models/client";
import { Fournisseur } from "@/models/fournisseur";
import { Caisse } from "@/models/caisse";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Traitement d'une demande d'annulation par l'admin :
 * - approuver → annulation effective : paiement marqué annulé, émission
 *   et fournisseur recrédités, écriture inverse en caisse ;
 * - rejeter → motif de refus optionnel.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin"]);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();
  const decision = data.decision;
  if (!["approuver", "rejeter"].includes(decision)) {
    return NextResponse.json({ message: "Décision invalide" }, { status: 400 });
  }

  const demande = await DemandeAnnulation.findById(id);
  if (!demande) {
    return NextResponse.json({ message: "Demande introuvable" }, { status: 404 });
  }
  if (demande.statut !== "en_attente") {
    return NextResponse.json({ message: "Demande déjà traitée" }, { status: 409 });
  }

  const traitePar = `${user.nom} ${user.prenom}`.trim();
  demande.statut = decision === "approuver" ? "approuvee" : "rejetee";
  demande.traitePar = traitePar;
  demande.traiteLe = new Date();
  if (decision === "rejeter") demande.motifRefus = (data.motifRefus || "").trim();
  await demande.save();

  if (decision === "rejeter") return NextResponse.json(demande);

  if (demande.type === "encaissement") {
    // Annulation d'un encaissement client (facture)
    const paiement = await PaiementClient.findById(demande.paiementClientId);
    if (!paiement || paiement.annule) {
      return NextResponse.json(demande); // déjà annulé ou supprimé
    }
    const montant = paiement.montantPaye || 0;

    paiement.annule = true;
    await paiement.save();

    if (paiement.factureId) {
      const facture = await FactureClient.findById(paiement.factureId);
      if (facture) {
        facture.totalPaye = Math.max(0, (facture.totalPaye || 0) - montant);
        facture.resteAPaye = (facture.totalTTC || 0) - facture.totalPaye;
        facture.statutC = (facture.totalPaye || 0) <= 0 ? "en_attente" : "partielle";
        await facture.save();
      }
    }

    if (paiement.clientId) {
      await Client.findByIdAndUpdate(paiement.clientId, {
        $inc: { montantPaye: -montant, resteAPaye: montant },
      });
    }

    // Contre-écriture en caisse (sortie) pour annuler l'entrée
    const dernierMouvement = await Caisse.findOne().sort({ dateC: -1, createdAt: -1 }).lean();
    await Caisse.create({
      typeC: "sortie",
      operation: "Annulation encaissement client",
      motif: `${demande.numFacture ? `Facture ${demande.numFacture}` : "Encaissement"} — ${paiement.clientC || ""} — demande de ${demande.demandePar}`,
      montantC: montant,
      dateC: new Date(),
      heureC: new Date().toLocaleTimeString("fr-FR"),
      nomPrenoms: paiement.clientC,
      solde: (dernierMouvement?.solde || 0) - montant,
      ajouterParC: traitePar,
    });

    return NextResponse.json(demande);
  }

  const paiement = await PaiementFournisseur.findById(demande.paiementFournisseurId);
  if (!paiement || paiement.annule) {
    return NextResponse.json(demande); // déjà annulé ou supprimé
  }
  const montant = paiement.montantPaye || 0;

  paiement.annule = true;
  await paiement.save();

  if (paiement.reglementFournisseurId) {
    const emission = await ReglementFournisseur.findById(paiement.reglementFournisseurId);
    if (emission) {
      emission.totalPaye = Math.max(0, (emission.totalPaye || 0) - montant);
      emission.resteAPaye = (emission.montantTotal || 0) - emission.totalPaye;
      if (emission.statut === "decaisse") emission.statut = "transfere_compta";
      await emission.save();
    }
  }

  if (paiement.fournisseurId) {
    await Fournisseur.findByIdAndUpdate(paiement.fournisseurId, {
      $inc: { montantPaye: -montant, resteAPaye: montant },
    });
  }

  // Contre-écriture en caisse (entrée) pour annuler la sortie
  const dernierMouvement = await Caisse.findOne().sort({ dateC: -1, createdAt: -1 }).lean();
  await Caisse.create({
    typeC: "entree",
    operation: "Annulation décaissement fournisseur",
    motif: `Émission ${demande.numEmission || ""} — ${paiement.fournisseur || ""} — demande de ${demande.demandePar}`,
    montantC: montant,
    dateC: new Date(),
    heureC: new Date().toLocaleTimeString("fr-FR"),
    nomPrenoms: paiement.fournisseur,
    solde: (dernierMouvement?.solde || 0) + montant,
    ajouterParC: traitePar,
  });

  return NextResponse.json(demande);
}
