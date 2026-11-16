import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Achat } from "@/models/achat";
import { LigneAchat } from "@/models/ligneAchat";
import { Commande } from "@/models/commande";
import { LigneCde } from "@/models/ligneCde";
import { nextNumero } from "@/lib/numero";
import { quantitesCommandees, recalculerStatutCommande } from "@/lib/commandeAchat";

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
  if (!data.fournisseurId) {
    return NextResponse.json(
      { message: "Le fournisseur est obligatoire" },
      { status: 400 }
    );
  }

  let commande = null;
  if (data.commandeId) {
    commande = await Commande.findById(data.commandeId);
    if (!commande) {
      return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
    }
    if (!commande.serviceAchat) {
      return NextResponse.json(
        { message: "Cette commande n'est pas transférée au service achat" },
        { status: 409 }
      );
    }
    if (commande.statutC === "traitee") {
      return NextResponse.json(
        { message: "Commande déjà traitée/clôturée" },
        { status: 409 }
      );
    }
  }

  const lignesCde = data.commandeId
    ? await LigneCde.find({ commandeId: data.commandeId }).lean()
    : [];
  const lignesCdeParId = new Map(lignesCde.map((l) => [String(l._id), l]));
  const commandees = data.commandeId
    ? await quantitesCommandees(data.commandeId)
    : new Map<string, number>();
  const EPS = 1e-9;
  const taux = Number(data.taux) || 0;

  for (const l of lignes) {
    const quantite = Number(l.quantite);
    if (!(quantite > 0)) {
      return NextResponse.json(
        { message: `Quantité invalide pour « ${l.articleM || "article"} »` },
        { status: 400 }
      );
    }
    if (l.ligneCdeId) {
      const lc = lignesCdeParId.get(String(l.ligneCdeId));
      if (!lc) {
        return NextResponse.json(
          { message: `La ligne « ${l.articleM || "article"} » n'appartient pas à cette commande` },
          { status: 400 }
        );
      }
      const reste = lc.quantite - (commandees.get(String(l.ligneCdeId)) || 0);
      if (quantite - reste > EPS) {
        return NextResponse.json(
          {
            message: `Quantité trop élevée pour « ${lc.articleM || l.articleM} » : reste ${reste}`,
          },
          { status: 400 }
        );
      }
    }
  }

  const lignesRecalc = lignes.map((l: any) => {
    const prixTHT = Number(l.quantite) * (Number(l.prixAchat) || 0);
    const tvaEntree = (prixTHT * taux) / 100;
    return { ...l, prixTHT, tvaEntree, montantTTCE: prixTHT + tvaEntree };
  });
  const totalHT = lignesRecalc.reduce((s: number, l: any) => s + l.prixTHT, 0);
  const totalTVA = lignesRecalc.reduce((s: number, l: any) => s + l.tvaEntree, 0);
  const totalTTC = totalHT + totalTVA;

  const saisiePar = `${user.nom} ${user.prenom}`.trim();
  const numAchat = data.numAchat || (await nextNumero(Achat, "numAchat", "BC"));

  const achat = await Achat.create({
    numAchat,
    dateAchat: data.dateAchat || new Date(),
    totalHT,
    totalTVA,
    totalTTC,
    fournisseur: data.fournisseur,
    fournisseurId: data.fournisseurId || undefined,
    statutAchat: "brouillon",
    contactF: data.contactF,
    dateLivraison: data.dateLivraison || undefined,
    duree: data.duree,
    saisiePar,
    totalPaye: 0,
    resteAPaye: totalTTC,
    numAchatProfor: data.numAchatProfor,
    taux: data.taux || 0,
    commandeId: data.commandeId || undefined,
    numCommande: data.numCommande,
    numComm: data.numComm,
    agentUtilisateur: data.agentUtilisateur,
    deviseM: data.deviseM || "FCFA",
  });

  await LigneAchat.insertMany(
    lignesRecalc.map((l: any) => ({
      achatId: achat._id,
      numAchat,
      articleM: l.articleM,
      description: l.description,
      reference: l.reference,
      quantite: Number(l.quantite) || 0,
      prixAchat: Number(l.prixAchat) || 0,
      prixTHT: l.prixTHT,
      tvaEntree: l.tvaEntree,
      montantTTCE: l.montantTTCE,
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

  let commandeMAJ = null;
  if (data.commandeId) {
    commandeMAJ = await recalculerStatutCommande(data.commandeId);
  }

  const lignesCrees = await LigneAchat.find({ achatId: achat._id }).lean();
  return NextResponse.json(
    { ...achat.toObject(), lignes: lignesCrees, commande: commandeMAJ },
    { status: 201 }
  );
}
