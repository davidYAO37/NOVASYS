import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { User } from "@/models/users.model";
import { hashPassword } from "@/utils/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Modifier un utilisateur (rôle, blocage, mot de passe, permissions). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["gestion_utilisateurs"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();

  const update: any = {};
  for (const k of ["nom", "prenom", "type", "comptebloque", "profilId"]) {
    if (data[k] !== undefined) update[k] = data[k];
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
          services: data.permissions.services || [],
          actions: data.permissions.actions || [],
          customized: true,
        }
      : { services: undefined, actions: undefined, customized: false };
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true }).select("-password");
  if (!user) {
    return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { user: current, error } = await requireAuth(req, ["admin"]);
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
