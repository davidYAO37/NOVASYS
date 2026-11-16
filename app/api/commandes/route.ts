import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { LigneCde } from "@/models/ligneCde";
import { nextNumero } from "@/lib/numero";
import { calculerLigne, calculerTotaux } from "@/lib/calculDevis";
import { prochainNumeroProforma } from "@/lib/numeroProforma";
import { filtreSaisie } from "@/lib/portee";

const ROLES = ["admin", "commercial", "achat"];

/**
 * Liste des commandes/devis — filtre par période et statut
 * (équivalent "liste des commandes de la période" de FEN_GESTION_DES_DEVIS).
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
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

  const commandes = await Commande.find({ ...filtre, ...filtreSaisie(user) })
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

  let numComm = (data.numComm || "").trim();
  if (numComm) {
    const existe = await Commande.findOne({ numComm }).select("_id").lean();
    if (existe) {
      return NextResponse.json(
        { message: "N° proforma déjà utilisé" },
        { status: 409 }
      );
    }
  } else {
    numComm = await prochainNumeroProforma(user);
  }

  const lignesRecalc = lignes.map((l: any) => calculerLigne(l));
  const totaux = calculerTotaux(lignesRecalc, {
    mainDoeuvre: data.mainDoeuvre,
    tauxRemise: data.tauxRemise,
    taux: data.taux,
    totalPaye: 0,
  });

  const commande = await Commande.create({
    numCommande,
    numComm,
    dateCommande: data.dateCommande || new Date(),
    heureAjout: new Date().toLocaleTimeString("fr-FR"),
    totalHT: totaux.totalHT,
    mainDoeuvre: data.mainDoeuvre || 0,
    remise: totaux.remise,
    totalAvecRemise: totaux.totalAvecRemise,
    totalTVA: totaux.totalTVA,
    totalTTC: totaux.totalTTC,
    totalPaye: 0,
    resteAPaye: totaux.resteAPaye,
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
    modeReglement: data.modeReglement,
    deviseM: data.deviseM || "FCFA",
  });

  await LigneCde.insertMany(
    lignesRecalc.map((l: any) => ({
      commandeId: commande._id,
      numCommande,
      reference: l.reference,
      articleM: l.articleM,
      description: l.description,
      quantite: Number(l.quantite) || 0,
      prixUnitaire: Number(l.prixUnitaire) || 0,
      prixUnitaireHT: l.prixUnitaireHT,
      fraisTransport: Number(l.fraisTransport) || 0,
      prixTotalHT: l.prixTotalHT,
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
