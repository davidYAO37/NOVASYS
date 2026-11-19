import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Profil } from "@/models/profil";
import { lireDroitsProfil } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["gestion_utilisateurs"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();
  const update: any = {};
  if (data.profil !== undefined) update.profil = data.profil.trim();
  if (data.type !== undefined || data.customized !== undefined) {
    Object.assign(update, lireDroitsProfil(data));
  }
  const profil = await Profil.findByIdAndUpdate(id, update, { new: true });
  if (!profil) {
    return NextResponse.json({ message: "Profil introuvable" }, { status: 404 });
  }
  return NextResponse.json(profil);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["gestion_utilisateurs"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  await Profil.findByIdAndDelete(id);
  return NextResponse.json({ message: "Profil supprimé" });
}
