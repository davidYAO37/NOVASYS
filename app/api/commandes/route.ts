import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { LigneCde } from "@/models/ligneCde";
import { nextNumero } from "@/lib/numero";

const ROLES = ["admin", "commercial", "achat"];

/**
 * Liste des commandes/devis — filtre par période et statut
 * (équivalent "liste des commandes de la période" de FEN_GESTION_DES_DEVIS).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const du = searchParams.get("du");
  const au = searchParams.get("au");
  const statut = searchParams.get("statut");
  const enAttente = searchParams.get("enAttente"); // proformas non transférés
  const recues = searchParams.get("recues"); // reçues par le service achat

  const filtre: any = {};
  if (du || au) {
    filtre.dateCommande = {};
    if (du) filtre.dateCommande.$gte = new Date(du);
    if (au) {
      const fin = new Date(au);
      fin.setHours(23, 59, 59, 999);
      filtre.dateCommande.$lte = fin;
    }
  }
  if (statut) filtre.statutC = statut;
  if (enAttente === "1") filtre.serviceAchat = { $ne: true };
  if (recues === "1") filtre.serviceAchat = true;

  const commandes = await Commande.find(filtre)
    .sort({ dateCommande: -1 })
    .limit(500)
    .lean();
  return NextResponse.json(commandes);
}

/**
 * Fiche de saisie du devis : en-tête + lignes d'articles
 * (référence, article, quantité, prix unitaire, marges...).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const data = await req.json();
  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  if (!lignes.length) {
    return NextResponse.json(
      { message: "Le devis doit contenir au moins une ligne" },
      { status: 400 }
    );
  }

  const saisiePar = `${user.nom} ${user.prenom}`.trim();
  const numCommande = data.numCommande || (await nextNumero(Commande, "numCommande", "DEV"));

  const commande = await Commande.create({
    numCommande,
    numComm: data.numComm || numCommande,
    dateCommande: data.dateCommande || new Date(),
    heureAjout: new Date().toLocaleTimeString("fr-FR"),
    totalHT: data.totalHT || 0,
    mainDoeuvre: data.mainDoeuvre || 0,
    remise: data.remise || 0,
    totalAvecRemise: data.totalAvecRemise || 0,
    totalTVA: data.totalTVA || 0,
    totalTTC: data.totalTTC || 0,
    totalPaye: 0,
    resteAPaye: data.totalTTC || 0,
    clientId: data.clientId || undefined,
    clientC: data.clientC,
    contactC: data.contactC,
    statutC: "brouillon",
    saisiePar,
    delaisExecution: data.delaisExecution,
    validiteCommande: data.validiteCommande,
    objetCommande: data.objetCommande,
    garantie: data.garantie,
    tauxRemise: data.tauxRemise || 0,
    taux: data.taux || 0,
    telephone: data.telephone,
    mail: data.mail,
    boitePostale: data.boitePostale,
    deviseM: data.deviseM || "FCFA",
  });

  await LigneCde.insertMany(
    lignes.map((l: any) => ({
      commandeId: commande._id,
      numCommande,
      reference: l.reference,
      articleM: l.articleM,
      description: l.description,
      quantite: Number(l.quantite) || 0,
      prixUnitaire: Number(l.prixUnitaire) || 0,
      prixUnitaireHT: Number(l.prixUnitaireHT) || 0,
      fraisTransport: Number(l.fraisTransport) || 0,
      prixTotalHT: Number(l.prixTotalHT) || 0,
      numSerie: l.numSerie,
      tauxDeDouanement: Number(l.tauxDeDouanement) || 0,
      tauxMarge: Number(l.tauxMarge) || 0,
      valeurConvertisseur: Number(l.valeurConvertisseur) || 0,
      autreMontant: Number(l.autreMontant) || 0,
      tauxBancaire: Number(l.tauxBancaire) || 0,
      fournisseur: l.fournisseur,
      fournisseurId: l.fournisseurId || undefined,
      deviseM: data.deviseM || "FCFA",
    }))
  );

  const lignesCrees = await LigneCde.find({ commandeId: commande._id }).lean();
  return NextResponse.json({ ...commande.toObject(), lignes: lignesCrees }, { status: 201 });
}
