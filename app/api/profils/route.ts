import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Profil } from "@/models/profil";
import { User } from "@/models/users.model";

/** Liste des profils (FEN_Table_Profil). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;
  await db();
  const profils = await Profil.find().sort({ profil: 1 }).lean();
  return NextResponse.json(profils);
}

/** Créer un profil (FEN_Fiche_Profil). */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["gestion_utilisateurs"] });
  if (error) return error;
  await db();

  const data = await req.json();
  if (!data.profil?.trim()) {
    return NextResponse.json({ message: "Le nom du profil est requis" }, { status: 400 });
  }
  const existe = await Profil.findOne({ profil: data.profil.trim() });
  if (existe) {
    return NextResponse.json({ message: "Ce profil existe déjà" }, { status: 409 });
  }
  const profil = await Profil.create({ profil: data.profil.trim() });
  return NextResponse.json(profil, { status: 201 });
}
