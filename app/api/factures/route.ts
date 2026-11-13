import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { FactureClient } from "@/models/factureClient";
import { LigneFacture } from "@/models/ligneFacture";
import { Commande } from "@/models/commande";
import { Client } from "@/models/client";
import { nextNumero } from "@/lib/numero";

const ROLES = ["admin", "achat", "caisse", "comptable"];

/** Liste des factures — période, client, statut (FEN_FIche_Nouvelle_Facture / liste). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const du = searchParams.get("du");
  const au = searchParams.get("au");
  const clientId = searchParams.get("clientId");
  const statut = searchParams.get("statut");
  const nonSoldees = searchParams.get("nonSoldees");

  const filtre: any = {};
  if (du || au) {
    filtre.dateFacture = {};
    if (du) filtre.dateFacture.$gte = new Date(du);
    if (au) {
      const fin = new Date(au);
      fin.setHours(23, 59, 59, 999);
      filtre.dateFacture.$lte = fin;
    }
  }
  if (clientId) filtre.clientId = clientId;
  if (statut) filtre.statutC = statut;
  if (nonSoldees === "1") filtre.resteAPaye = { $gt: 0 };

  const factures = await FactureClient.find(filtre).sort({ dateFacture: -1 }).limit(500).lean();
  return NextResponse.json(factures);
}

/**
 * Nouvelle facture à partir d'une proforma : choisir le client, reprendre
 * les lignes, renseigner le numéro ; à l'enregistrement le bon de
 * livraison est automatiquement créé (numBonFacture).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "achat", "caisse"]);
  if (error) return error;
  await db();

  const data = await req.json();
  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  if (!lignes.length) {
    return NextResponse.json(
      { message: "La facture doit contenir au moins une ligne" },
      { status: 400 }
    );
  }

  const saisiePar = `${user.nom} ${user.prenom}`.trim();
  const numFacture = data.numFacture || (await nextNumero(FactureClient, "numFacture", "FAC"));
  const numBonFacture = data.numBonFacture || numFacture.replace(/^FAC/, "BL");

  const facture = await FactureClient.create({
    numFacture,
    numBonFacture,
    dateFacture: data.dateFacture || new Date(),
    heureAjout: new Date().toLocaleTimeString("fr-FR"),
    totalHTFacture: data.totalHTFacture || 0,
    mainDoeuvre: data.mainDoeuvre || 0,
    remise: data.remise || 0,
    totalAvecRemise: data.totalAvecRemise || 0,
    totalTVA: data.totalTVA || 0,
    totalTTC: data.totalTTC || 0,
    totalPaye: data.totalPaye || 0,
    resteAPaye: (data.totalTTC || 0) - (data.totalPaye || 0),
    statutC: (data.totalPaye || 0) >= (data.totalTTC || 0) ? "soldee" : "en_attente",
    saisiePar,
    clientId: data.clientId || undefined,
    objetFacture: data.objetFacture,
    numComm: data.numComm,
    commandeId: data.commandeId || undefined,
    numCommande: data.numCommande,
    tauxRemise: data.tauxRemise || 0,
    taux: data.taux || 0,
    clientC: data.clientC,
    mail: data.mail,
    contactC: data.contactC,
    adresseGeo: data.adresseGeo,
    observationFacture: data.observationFacture,
    deviseM: data.deviseM || "FCFA",
    dateLivraison: data.dateLivraison || undefined,
    agentUtilisateur: data.agentUtilisateur,
    modeReglement: data.modeReglement,
  });

  await LigneFacture.insertMany(
    lignes.map((l: any) => ({
      factureId: facture._id,
      articleM: l.articleM,
      description: l.description,
      reference: l.reference,
      quantite: Number(l.quantite) || 0,
      prixUnitaire: Number(l.prixUnitaire) || 0,
      prixUnitaireHT: Number(l.prixUnitaireHT) || 0,
      fraisTransport: Number(l.fraisTransport) || 0,
      prixTotalHT: Number(l.prixTotalHT) || 0,
      numSerie: l.numSerie,
      tauxDeDouanement: Number(l.tauxDeDouanement) || 0,
      tauxMarge: Number(l.tauxMarge) || 0,
      valeurConvertisseur: Number(l.valeurConvertisseur) || 0,
      tauxBancaire: Number(l.tauxBancaire) || 0,
      autreMontant: Number(l.autreMontant) || 0,
      nSerie: l.nSerie,
    }))
  );

  // Marquer la commande comme facturée
  if (data.commandeId) {
    await Commande.findByIdAndUpdate(data.commandeId, { factureEditee: true });
  }

  // Mettre à jour le reste à payer du client
  if (data.clientId) {
    const reste = (data.totalTTC || 0) - (data.totalPaye || 0);
    await Client.findByIdAndUpdate(data.clientId, {
      $inc: { resteAPaye: reste, montantPaye: data.totalPaye || 0 },
    });
  }

  const lignesCrees = await LigneFacture.find({ factureId: facture._id }).lean();
  return NextResponse.json({ ...facture.toObject(), lignes: lignesCrees }, { status: 201 });
}
