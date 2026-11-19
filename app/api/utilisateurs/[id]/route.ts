import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { User } from "@/models/users.model";
import { hashPassword } from "@/utils/auth";
import { ALL_ACTION_CODES, ALL_SERVICE_CODES, ROLE_LABELS } from "@/lib/permissions";
import { droitsDuProfil } from "@/lib/droitsProfil";

type Ctx = { params: Promise<{ id: string }> };

/** Modifier un utilisateur (rôle, blocage, mot de passe, permissions). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { user: acteur, error } = await requireAuth(req, ["admin"], {
    actions: ["gestion_utilisateurs"],
  });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();

  // Seul un vrai admin peut toucher un compte admin ou conférer le rôle admin
  const estVraiAdmin = acteur!.type === "admin" || acteur!.type === "adminsuper";
  if (!estVraiAdmin) {
    const cible = await User.findById(id).select("type").lean();
    if (cible && ["admin", "adminsuper"].includes(cible.type || "")) {
      return NextResponse.json(
        { message: "Seul un administrateur peut modifier un compte administrateur" },
        { status: 403 }
      );
    }
    if (data.type === "admin" || data.type === "adminsuper") {
      return NextResponse.json(
        { message: "Seul un administrateur peut conférer le rôle administrateur" },
        { status: 403 }
      );
    }
  }

  const update: any = {};
  for (const k of ["nom", "prenom", "type", "comptebloque", "profilId"]) {
    if (data[k] !== undefined) update[k] = data[k];
  }
  // Le rôle ne peut prendre qu'une valeur connue (adminsuper non attribuable ici)
  if (update.type !== undefined && (update.type === "adminsuper" || !ROLE_LABELS[update.type])) {
    delete update.type;
  }
  if (update.profilId === "") update.profilId = null;
  if (data.codeProforma !== undefined) {
    const code = (data.codeProforma || "").trim().toUpperCase();
    update.codeProforma = /^[A-Z0-9]{1,10}$/.test(code) ? code : "";
  }
  if (data.nom !== undefined || data.prenom !== undefined) {
    update.name = `${data.nom || ""} ${data.prenom || ""}`.trim();
  }
  if (data.password) {
    update.password = await hashPassword(data.password);
  }
  if (data.debloquer) {
    update.isLocked = false;
    update.failedAttempts = 0;
    update.remainingAttempts = 4;
    update.lockedUntil = undefined;
  }
  if (data.permissions?.customized !== undefined) {
    update.permissions = data.permissions.customized
      ? {
          services: (data.permissions.services || []).filter((s: string) =>
            ALL_SERVICE_CODES.includes(s as any)
          ),
          actions: (data.permissions.actions || []).filter((a: string) =>
            ALL_ACTION_CODES.includes(a)
          ),
          customized: true,
        }
      : { services: undefined, actions: undefined, customized: false };
  }
  // Un profil choisi impose son rôle et ses permissions (écrase ceux du payload)
  if (data.profilId !== undefined && data.profilId) {
    const droits = await droitsDuProfil(data.profilId);
    if (droits.type) update.type = droits.type;
    if (droits.permissions !== undefined) update.permissions = droits.permissions;
  }

  // Un nouveau mot de passe révoque les sessions existantes (tokenVersion++)
  const maj: any = { $set: update };
  if (data.password) maj.$inc = { tokenVersion: 1 };

  const user = await User.findByIdAndUpdate(id, maj, { new: true }).select("-password");
  if (!user) {
    return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { user: current, error } = await requireAuth(req, ["admin"], {
    actions: ["gestion_utilisateurs"],
  });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  if (id === current!._id) {
    return NextResponse.json(
      { message: "Vous ne pouvez pas supprimer votre propre compte" },
      { status: 409 }
    );
  }
  await User.findByIdAndDelete(id);
  return NextResponse.json({ message: "Utilisateur supprimé" });
}
