import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { User } from "@/models/users.model";
import { hashPassword, generateLocalUID } from "@/utils/auth";

const ROLES = ["admin"];

/** Liste des utilisateurs (FEN_Table_Login / FEN_UTILISATEUR). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES, { actions: ["gestion_utilisateurs"] });
  if (error) return error;
  await db();

  const users = await User.find().select("-password").sort({ nom: 1 }).lean();
  return NextResponse.json(users);
}

/** Créer un utilisateur (FEN_Fiche_Login). */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES, { actions: ["gestion_utilisateurs"] });
  if (error) return error;
  await db();

  const data = await req.json();
  if (!data.email?.trim() || !data.password) {
    return NextResponse.json(
      { message: "Identifiant (email) et mot de passe requis" },
      { status: 400 }
    );
  }

  const existe = await User.findOne({ email: data.email.toLowerCase().trim() });
  if (existe) {
    return NextResponse.json({ message: "Cet identifiant existe déjà" }, { status: 409 });
  }

  const user = await User.create({
    nom: data.nom,
    prenom: data.prenom,
    name: `${data.nom || ""} ${data.prenom || ""}`.trim(),
    email: data.email.toLowerCase().trim(),
    password: await hashPassword(data.password),
    type: data.type || "commercial",
    profilId: data.profilId || undefined,
    uid: generateLocalUID(),
    permissions: data.permissions?.customized
      ? {
          services: data.permissions.services || [],
          actions: data.permissions.actions || [],
          customized: true,
        }
      : undefined,
  });

  const { password, ...sansMdp } = user.toObject();
  return NextResponse.json(sansMdp, { status: 201 });
}
