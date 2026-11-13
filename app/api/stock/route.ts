import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Stock } from "@/models/stock";
import { EntreeStock } from "@/models/entreeStock";
import { SortieStock } from "@/models/sortieStock";
import { Article } from "@/models/article";

const ROLES = ["admin", "stock", "caisse"];

/** Stock courant + alertes (FI_Alerte_Stock). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const alertes = searchParams.get("alertes");

  const filtre: any = {};
  if (alertes === "1") {
    filtre.$expr = { $lte: ["$qteEnStock", "$seuilAlerte"] };
    filtre.seuilAlerte = { $gt: 0 };
  }

  const stocks = await Stock.find(filtre).sort({ designation: 1 }).limit(1000).lean();
  return NextResponse.json(stocks);
}

/**
 * Mouvement de stock : { sens: "entree"|"sortie", reference, quantite,
 * prixAchat|prixUnitaire, motif, ... }.
 * Une sortie supérieure au stock est refusée.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "stock", "caisse"]);
  if (error) return error;
  await db();

  const data = await req.json();
  const quantite = Number(data.quantite) || 0;
  if (!data.reference?.trim() || quantite <= 0 || !["entree", "sortie"].includes(data.sens)) {
    return NextResponse.json({ message: "Référence, sens ou quantité invalide" }, { status: 400 });
  }

  const saisiPar = `${user.nom} ${user.prenom}`.trim();
  const ref = data.reference.trim();

  const article = await Article.findOne({ reference: ref }).lean();
  const designation = article?.designationA || data.articleS || ref;

  let stock = await Stock.findOne({ reference: ref });

  if (data.sens === "sortie") {
    if (!stock || (stock.qteEnStock || 0) < quantite) {
      return NextResponse.json(
        { message: "Stock insuffisant pour cette sortie", code: "STOCK_INSUFFISANT" },
        { status: 409 }
      );
    }
    stock.qteEnStock -= quantite;
  } else {
    if (!stock) {
      stock = new Stock({ reference: ref, designation, qteEnStock: 0 });
    }
    stock.qteEnStock = (stock.qteEnStock || 0) + quantite;
  }
  stock.auteurModif = saisiPar;
  stock.dateModif = new Date();
  await stock.save();

  if (data.sens === "entree") {
    const prixAchat = Number(data.prixAchat) || 0;
    await EntreeStock.create({
      dateAppro: data.dateAppro || new Date(),
      quantite,
      prixAchat,
      prixTHT: quantite * prixAchat,
      tvaEntree: Number(data.tvaEntree) || 0,
      montantTTCE: quantite * prixAchat + (Number(data.tvaEntree) || 0),
      saisiPar,
      observations: data.observations,
      fournisseurId: data.fournisseurId || undefined,
      fournisseur: data.fournisseur,
      reference: ref,
      numAchat: data.numAchat,
    });
  } else {
    const prixUnitaire = Number(data.prixUnitaire) || article?.prixVente || 0;
    await SortieStock.create({
      dateSortie: data.dateSortie || new Date(),
      reference: ref,
      quantite,
      prixUnitaire,
      prixTotalS: quantite * prixUnitaire,
      motif: data.motif,
      observations: data.observations,
      saisiPar,
      articleS: designation,
      numCommandeS: data.numCommandeS,
    });
  }

  return NextResponse.json(stock);
}
