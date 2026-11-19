import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { DocumentDevis } from "@/models/documentDevis";
import { Commande } from "@/models/commande";
import { peutVoirSaisie } from "@/lib/portee";

const ROLES = ["admin", "commercial", "achat"];

/** Types autorisés — jamais de HTML/SVG/exécutable (XSS stockée). */
const EXTENSIONS_AUTORISEES = ["pdf", "jpg", "jpeg", "png", "gif", "webp", "txt"];
const TAILLE_MAX_OCTETS = 7 * 1024 * 1024; // ~5 Mo binaire en base64

/** Vérifie que l'utilisateur peut voir la commande liée (portée commercial). */
async function porteeCommande(user: any, commandeId: any): Promise<boolean> {
  if (!commandeId) return false;
  const commande = await Commande.findById(commandeId).select("saisiePar").lean();
  return !!commande && peutVoirSaisie(user, commande);
}

/** Documents joints d'une commande (FEN_DOCUMENT_IMPORTE / FEN_Fiche_DOCUMENT_DEVIS). */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const commandeId = searchParams.get("commandeId");
  if (!commandeId || !(await porteeCommande(user, commandeId))) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  const docs = await DocumentDevis.find({ commandeId })
    .select("-document")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(docs);
}

/** Ajouter un fichier (base64, ~5 Mo max, extensions sûres uniquement). */
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

  const ext = (data.extensionF || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!EXTENSIONS_AUTORISEES.includes(ext)) {
    return NextResponse.json(
      { message: `Type de fichier non autorisé (${EXTENSIONS_AUTORISEES.join(", ")})` },
      { status: 400 }
    );
  }
  if (typeof data.document !== "string" || data.document.length > TAILLE_MAX_OCTETS) {
    return NextResponse.json(
      { message: "Fichier trop volumineux (5 Mo max)" },
      { status: 413 }
    );
  }
  if (data.commandeId && !(await porteeCommande(user, data.commandeId))) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }

  const doc = await DocumentDevis.create({
    libeleDocument: data.libeleDocument.trim(),
    document: data.document,
    date: new Date(),
    heure: new Date().toLocaleTimeString("fr-FR"),
    ajouterPar: `${user.nom} ${user.prenom}`.trim(),
    extensionF: ext,
    commandeId: data.commandeId || undefined,
    numCommande: data.numCommande,
    numComm: data.numComm,
  });
  const { document: _contenu, ...sansContenu } = doc.toObject();
  return NextResponse.json(sansContenu, { status: 201 });
}
