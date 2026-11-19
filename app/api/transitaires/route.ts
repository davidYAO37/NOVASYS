import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Transitaire } from "@/models/transitaire";

/** Liste des transitaires (sélecteur du bon de commande). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ["admin", "achat", "comptable"]);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const filtre = q
    ? {
        $or: [
          { nom: { $regex: q, $options: "i" } },
          { telephone: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const transitaires = await Transitaire.find(filtre).sort({ nom: 1 }).lean();
  return NextResponse.json(transitaires);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "achat"]);
  if (error) return error;
  await db();

  const data = await req.json();
  if (!data.nom?.trim()) {
    return NextResponse.json({ message: "Le nom du transitaire est requis" }, { status: 400 });
  }

  const transitaire = await Transitaire.create({
    ...data,
    nom: data.nom.trim(),
    creerPar: `${user.nom} ${user.prenom}`.trim(),
  });
  return NextResponse.json(transitaire, { status: 201 });
}
