import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { DocumentDevis } from "@/models/documentDevis";

const ROLES = ["admin", "commercial", "achat"];

/** Documents joints d'une commande (FEN_DOCUMENT_IMPORTE / FEN_Fiche_DOCUMENT_DEVIS). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const commandeId = searchParams.get("commandeId");
  const filtre = commandeId ? { commandeId } : {};
  const docs = await DocumentDevis.find(filtre).select("-document").sort({ createdAt: -1 }).lean();
  return NextResponse.json(docs);
}

/** Ajouter un fichier (base64, max ~5 Mo). */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const data = await req.json();
  if (!data.libeleDocument?.trim() || !data.document) {
    return NextResponse.json(
      { message: "Libellé et fichier requis" },
      { status: 400 }
    );
  }

  const doc = await DocumentDevis.create({
    libeleDocument: data.libeleDocument.trim(),
    document: data.document,
    date: new Date(),
    heure: new Date().toLocaleTimeString("fr-FR"),
    ajouterPar: `${user.nom} ${user.prenom}`.trim(),
    extensionF: data.extensionF,
    commandeId: data.commandeId || undefined,
    numCommande: data.numCommande,
    numComm: data.numComm,
  });
  const { document: _contenu, ...sansContenu } = doc.toObject();
  return NextResponse.json(sansContenu, { status: 201 });
}
