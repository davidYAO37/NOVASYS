import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { DocumentDevis } from "@/models/documentDevis";
import { Commande } from "@/models/commande";
import { peutVoirSaisie } from "@/lib/portee";

const ROLES = ["admin", "commercial", "achat"];

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain; charset=utf-8",
};

/** Contenu binaire d'un document joint (`?download=1` pour forcer le téléchargement). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await params;
  const doc = await DocumentDevis.findById(id).lean().catch(() => null);
  if (!doc?.document) {
    return NextResponse.json({ message: "Document introuvable" }, { status: 404 });
  }
  // Portée : le commercial ne lit que les documents de ses propres devis
  if (doc.commandeId) {
    const commande = await Commande.findById(doc.commandeId).select("saisiePar").lean();
    if (!peutVoirSaisie(user, commande)) {
      return NextResponse.json({ message: "Document introuvable" }, { status: 404 });
    }
  }

  const ext = (doc.extensionF || "").toLowerCase();
  // Le Content-Type vient uniquement de la table serveur (jamais du data URI
  // fourni par le client : empêche de servir du HTML/SVG en inline → XSS)
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(doc.document);
  const mime = MIME[ext] || "application/octet-stream";
  const contenu = match
    ? Buffer.from(match[3], match[2] ? "base64" : "utf8")
    : Buffer.from(doc.document, "base64");

  const nom = `${doc.libeleDocument}${ext ? `.${ext}` : ""}`.replace(/["\r\n]/g, "");
  const mode = new URL(req.url).searchParams.get("download") ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(contenu), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(contenu.length),
      "Content-Disposition": `${mode}; filename*=UTF-8''${encodeURIComponent(nom)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
