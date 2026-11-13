import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { PaiementClient } from "@/models/paiementClient";
import { FactureClient } from "@/models/factureClient";
import { Client } from "@/models/client";
import { Caisse } from "@/models/caisse";

const ROLES = ["admin", "caisse", "comptable", "commercial"];

/** Liste des encaissements clients de la période. */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const du = searchParams.get("du");
  const au = searchParams.get("au");
  const clientId = searchParams.get("clientId");
  const factureId = searchParams.get("factureId");

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
  if (clientId) filtre.clientId = clientId;
  if (factureId) filtre.factureId = factureId;

  const paiements = await PaiementClient.find(filtre).sort({ datePaiement: -1 }).limit(500).lean();
  return NextResponse.json(paiements);
}

/** Encaissement d'une facture/commande client (reçu — ETAT_Recu). */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "caisse", "comptable"]);
  if (error) return error;
  await db();

  const data = await req.json();
  const montant = Number(data.montantPaye) || 0;
  if (montant <= 0) {
    return NextResponse.json({ message: "Montant invalide" }, { status: 400 });
  }

  const saisiPar = `${user.nom} ${user.prenom}`.trim();
  const paiement = await PaiementClient.create({
    datePaiement: data.datePaiement || new Date(),
    heureAjout: new Date().toLocaleTimeString("fr-FR"),
    payePar: data.payePar || saisiPar,
    recuDe: data.recuDe || data.clientC,
    montantPaye: montant,
    clientId: data.clientId || undefined,
    commandeId: data.commandeId || undefined,
    numCommande: data.numCommande,
    modeReglement: data.modeReglement,
    totalTTC: data.totalTTC,
    resteAPaye: data.resteAPaye,
    clientC: data.clientC,
    banque: data.banque,
    numCheque: data.numCheque,
    numVirement: data.numVirement,
    numComm: data.numComm,
    objetCommande: data.objetCommande,
    deviseM: data.deviseM || "FCFA",
    numeroFactBL: data.numeroFactBL,
    factureId: data.factureId || undefined,
  });

  // Mettre à jour la facture
  if (data.factureId) {
    const facture = await FactureClient.findById(data.factureId);
    if (facture) {
      facture.totalPaye = (facture.totalPaye || 0) + montant;
      facture.resteAPaye = (facture.totalTTC || 0) - facture.totalPaye;
      facture.statutC = (facture.resteAPaye || 0) <= 0 ? "soldee" : "partielle";
      await facture.save();
    }
  }

  // Mettre à jour le solde du client
  if (data.clientId) {
    await Client.findByIdAndUpdate(data.clientId, {
      $inc: { montantPaye: montant, resteAPaye: -montant },
    });
  }

  // Écriture en caisse (entrée)
  const dernierMouvement = await Caisse.findOne().sort({ dateC: -1, createdAt: -1 }).lean();
  const solde = (dernierMouvement?.solde || 0) + montant;
  await Caisse.create({
    typeC: "entree",
    operation: "Encaissement client",
    motif: data.numeroFactBL
      ? `Règlement facture ${data.numeroFactBL}`
      : `Encaissement ${data.clientC || "client"}`,
    montantC: montant,
    dateC: paiement.datePaiement,
    heureC: new Date().toLocaleTimeString("fr-FR"),
    nomPrenoms: data.clientC,
    solde,
    ajouterParC: saisiPar,
    detteClient: data.resteAPaye,
    dettePaye: montant,
  });

  return NextResponse.json(paiement, { status: 201 });
}
