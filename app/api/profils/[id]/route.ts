import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Profil } from "@/models/profil";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"], { actions: ["gestion_utilisateurs"] });
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();
  const profil = await Profil.findByIdAndUpdate(
    id,
    { profil: data.profil?.trim() },
    { new: true }
  );
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
