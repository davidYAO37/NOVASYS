import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Caisse } from "@/models/caisse";
import { Operation } from "@/models/operation";

const ROLES = ["admin", "caisse", "comptable"];

/** Journal de caisse de la période + solde courant (FEN_Gestion_caisse). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const du = searchParams.get("du");
  const au = searchParams.get("au");
  const typeC = searchParams.get("type");

  const filtre: any = {};
  if (du || au) {
    filtre.dateC = {};
    if (du) filtre.dateC.$gte = new Date(du);
    if (au) {
      const fin = new Date(au);
      fin.setHours(23, 59, 59, 999);
      filtre.dateC.$lte = fin;
    }
  }
  if (typeC) filtre.typeC = typeC;

  const mouvements = await Caisse.find(filtre).sort({ dateC: -1, createdAt: -1 }).limit(1000).lean();
  const dernier = await Caisse.findOne().sort({ dateC: -1, createdAt: -1 }).lean();
  const operations = await Operation.find().sort({ libeleo: 1 }).lean();

  const totaux = mouvements.reduce(
    (acc, m) => {
      if (m.typeC === "entree") acc.entrees += m.montantC || 0;
      else acc.sorties += m.montantC || 0;
      return acc;
    },
    { entrees: 0, sorties: 0 }
  );

  return NextResponse.json({
    mouvements,
    solde: dernier?.solde || 0,
    totaux,
    operations,
  });
}

/** Opération manuelle de caisse (apport, décaissement divers). */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "caisse"]);
  if (error) return error;
  await db();

  const data = await req.json();
  const montant = Number(data.montantC) || 0;
  if (montant <= 0 || !["entree", "sortie"].includes(data.typeC)) {
    return NextResponse.json({ message: "Type ou montant invalide" }, { status: 400 });
  }

  const saisiPar = `${user.nom} ${user.prenom}`.trim();
  const dernier = await Caisse.findOne().sort({ dateC: -1, createdAt: -1 }).lean();
  const solde = (dernier?.solde || 0) + (data.typeC === "entree" ? montant : -montant);

  const mouvement = await Caisse.create({
    typeC: data.typeC,
    operation: data.operation,
    motif: data.motif,
    montantC: montant,
    dateC: data.dateC || new Date(),
    heureC: new Date().toLocaleTimeString("fr-FR"),
    nomPrenoms: data.nomPrenoms,
    contact: data.contact,
    solde,
    ajouterParC: saisiPar,
    operationId: data.operationId || undefined,
  });

  return NextResponse.json(mouvement, { status: 201 });
}
