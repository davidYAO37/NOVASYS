import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { DemandeAnnulation } from "@/models/demandeAnnulation";

const STATUTS = ["en_attente", "approuvee", "rejetee"];

/**
 * Historique des demandes d'annulation de décaissement.
 * Admin : toutes les demandes (filtre ?statut=). Autres : leurs propres
 * demandes seulement.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "achat", "comptable", "caisse"]);
  if (error) return error;
  await db();

  const filtre: any = {};
  const statut = req.nextUrl.searchParams.get("statut");
  if (statut && STATUTS.includes(statut)) filtre.statut = statut;
  const type = req.nextUrl.searchParams.get("type");
  if (["decaissement", "encaissement"].includes(type || "")) filtre.type = type;

  const estAdmin = user.type === "admin" || user.type === "adminsuper";
  // Filtre sur l'ID du demandeur (fiable), repli sur le nom pour les
  // demandes créées avant l'ajout de demandeurId
  if (!estAdmin) {
    const nom = `${user.nom} ${user.prenom}`.trim();
    filtre.$or = [{ demandeurId: user._id }, { demandeurId: { $exists: false }, demandePar: nom }];
  }

  const demandes = await DemandeAnnulation.find(filtre).sort({ demandeLe: -1 }).lean();
  return NextResponse.json(demandes);
}
