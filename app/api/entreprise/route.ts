import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Entreprise } from "@/models/entreprise";

const CHAMPS_MODIFIABLES = [
  "nomSociete", "adresseSociete", "telSociete", "villeSociete", "emailSociete",
  "logo", "faxSociete", "pays", "activite", "ncc", "situationGeo",
  "enteteSociete", "piedDePage", "cachetDG", "logoPosition", "enteteAlignement",
] as const;

/** Fiche entreprise (FEN_entreprise / FEN_Fiche_Entreprise). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;
  await db();
  const entreprise = await Entreprise.findOne().select("-licenceKey").lean();
  return NextResponse.json(entreprise || {});
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["parametrage_general"] });
  if (error) return error;
  await db();

  const body = await req.json();
  // Seuls les champs de la fiche sont modifiables ici : la licence passe
  // exclusivement par /api/licence/*.
  const data: Record<string, unknown> = {};
  for (const k of CHAMPS_MODIFIABLES) if (k in body) data[k] = body[k];

  const entreprise = await Entreprise.findOneAndUpdate({}, data, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  return NextResponse.json(entreprise);
}
