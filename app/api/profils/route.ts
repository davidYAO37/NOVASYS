import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Profil } from "@/models/profil";
import { User } from "@/models/users.model";
import { lireDroitsProfil, hasActionPermission } from "@/lib/permissions";

/** Liste des profils (FEN_Table_Profil). */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  await db();
  // Les permissions détaillées ne sont visibles que des gestionnaires :
  // les autres reçoivent juste nom + rôle (listes déroulantes)
  const estGestionnaire =
    user!.type === "admin" ||
    user!.type === "adminsuper" ||
    hasActionPermission(user!, "gestion_utilisateurs");
  const requete = Profil.find().sort({ profil: 1 });
  if (!estGestionnaire) requete.select("profil type");
  const profils = await requete.lean();
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
  const profil = await Profil.create({ profil: data.profil.trim(), ...lireDroitsProfil(data) });
  return NextResponse.json(profil, { status: 201 });
}
