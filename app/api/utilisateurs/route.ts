import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { User } from "@/models/users.model";
import { hashPassword, generateLocalUID } from "@/utils/auth";
import { droitsDuProfil } from "@/lib/droitsProfil";
import {
  ALL_ACTION_CODES,
  ALL_SERVICE_CODES,
  ROLE_LABELS,
} from "@/lib/permissions";

/** Rôle valide et attribuable (adminsuper : réservé au seed/éditeur). */
const TYPES_ATTRIBUABLES = Object.keys(ROLE_LABELS).filter((t) => t !== "adminsuper");

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
  const { user: acteur, error } = await requireAuth(req, ROLES, {
    actions: ["gestion_utilisateurs"],
  });
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

  const droitsProfil = await droitsDuProfil(data.profilId);
  let type = droitsProfil.type || data.type || "commercial";
  if (!TYPES_ATTRIBUABLES.includes(type)) type = "commercial";
  // Seul un vrai admin peut conférer le rôle admin
  if (type === "admin" && acteur!.type !== "admin" && acteur!.type !== "adminsuper") {
    return NextResponse.json(
      { message: "Seul un administrateur peut créer un compte administrateur" },
      { status: 403 }
    );
  }

  const user = await User.create({
    nom: data.nom,
    prenom: data.prenom,
    name: `${data.nom || ""} ${data.prenom || ""}`.trim(),
    email: data.email.toLowerCase().trim(),
    password: await hashPassword(data.password),
    type,
    codeProforma: /^[A-Z0-9]{1,10}$/.test((data.codeProforma || "").trim().toUpperCase())
      ? data.codeProforma.trim().toUpperCase()
      : undefined,
    profilId: data.profilId || null,
    uid: generateLocalUID(),
    permissions:
      droitsProfil.permissions !== undefined
        ? droitsProfil.permissions
        : data.permissions?.customized
          ? {
              services: (data.permissions.services || []).filter((s: string) =>
                ALL_SERVICE_CODES.includes(s as any)
              ),
              actions: (data.permissions.actions || []).filter((a: string) =>
                ALL_ACTION_CODES.includes(a)
              ),
              customized: true,
            }
          : undefined,
  });

  const { password, ...sansMdp } = user.toObject();
  return NextResponse.json(sansMdp, { status: 201 });
}
