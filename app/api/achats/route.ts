import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Achat } from "@/models/achat";
import { LigneAchat } from "@/models/ligneAchat";
import { Commande } from "@/models/commande";
import { nextNumero } from "@/lib/numero";

const ROLES = ["admin", "achat", "comptable"];

/** Liste des bons de commande fournisseur (période + statut). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const du = searchParams.get("du");
  const au = searchParams.get("au");
  const statut = searchParams.get("statut");
  const fournisseurId = searchParams.get("fournisseurId");

  const filtre: any = {};
  if (du || au) {
    filtre.dateAchat = {};
    if (du) filtre.dateAchat.$gte = new Date(du);
    if (au) {
      const fin = new Date(au);
      fin.setHours(23, 59, 59, 999);
      filtre.dateAchat.$lte = fin;
    }
  }
  if (statut) filtre.statutAchat = statut;
  if (fournisseurId) filtre.fournisseurId = fournisseurId;

  const achats = await Achat.find(filtre).sort({ dateAchat: -1 }).limit(500).lean();
  return NextResponse.json(achats);
}

/**
 * Édition d'un bon de commande fournisseur à partir d'un devis :
 * choisir le fournisseur, cocher les lignes trouvées, TVA, objet,
 * date de livraison (FEN_NOUVEAU_ACHAT).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "achat"]);
  if (error) return error;
  await db();

  const data = await req.json();
  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  if (!lignes.length) {
    return NextResponse.json(
      { message: "Le bon de commande doit contenir au moins une ligne" },
      { status: 400 }
    );
  }

  const saisiePar = `${user.nom} ${user.prenom}`.trim();
  const numAchat = data.numAchat || (await nextNumero(Achat, "numAchat", "BC"));

  const achat = await Achat.create({
    numAchat,
    dateAchat: data.dateAchat || new Date(),
    totalHT: data.totalHT || 0,
    totalTVA: data.totalTVA || 0,
    totalTTC: data.totalTTC || 0,
    fournisseur: data.fournisseur,
    fournisseurId: data.fournisseurId || undefined,
    statutAchat: "brouillon",
    contactF: data.contactF,
    dateLivraison: data.dateLivraison || undefined,
    duree: data.duree,
    saisiePar,
    totalPaye: 0,
    resteAPaye: data.totalTTC || 0,
    numAchatProfor: data.numAchatProfor,
    taux: data.taux || 0,
    commandeId: data.commandeId || undefined,
    numCommande: data.numCommande,
    numComm: data.numComm,
    agentUtilisateur: data.agentUtilisateur,
    deviseM: data.deviseM || "FCFA",
  });

  await LigneAchat.insertMany(
    lignes.map((l: any) => ({
      achatId: achat._id,
      numAchat,
      articleM: l.articleM,
      description: l.description,
      reference: l.reference,
      quantite: Number(l.quantite) || 0,
      prixAchat: Number(l.prixAchat) || 0,
      prixTHT: Number(l.prixTHT) || 0,
      tvaEntree: Number(l.tvaEntree) || 0,
      montantTTCE: Number(l.montantTTCE) || 0,
      taux: Number(l.taux) || 0,
      observations: l.observations,
      fournisseur: data.fournisseur,
      fournisseurId: data.fournisseurId || undefined,
      saisiPar: saisiePar,
      ligneCdeId: l.ligneCdeId || undefined,

      numCommande: data.numCommande,
      deviseM: data.deviseM || "FCFA",
    }))
  );

  // Marquer la commande d'origine comme traitée par le service achat
  if (data.commandeId) {
    await Commande.findByIdAndUpdate(data.commandeId, {
      statutC: "traitee",
      numAchat,
      bonAchat: numAchat,
    });
  }

  const lignesCrees = await LigneAchat.find({ achatId: achat._id }).lean();
  return NextResponse.json({ ...achat.toObject(), lignes: lignesCrees }, { status: 201 });
}
