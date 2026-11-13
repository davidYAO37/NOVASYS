import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Client } from "@/models/client";
import { FactureClient } from "@/models/factureClient";
import { PaiementClient } from "@/models/paiementClient";

const ROLES = ["admin", "commercial", "caisse", "comptable"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const client = await Client.findById(id).lean();
  if (!client) {
    return NextResponse.json({ message: "Client introuvable" }, { status: 404 });
  }

  // Relation CLIENT_VENTE : factures et paiements du client
  const factures = await FactureClient.find({ clientId: id }).sort({ dateFacture: -1 }).lean();
  const paiements = await PaiementClient.find({ clientId: id }).sort({ datePaiement: -1 }).lean();

  return NextResponse.json({ ...client, factures, paiements });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const data = await req.json();
  const client = await Client.findByIdAndUpdate(
    id,
    { ...data, modifiePar: `${user.nom} ${user.prenom}`.trim() },
    { new: true }
  );
  if (!client) {
    return NextResponse.json({ message: "Client introuvable" }, { status: 404 });
  }
  return NextResponse.json(client);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAuth(req, ["admin"]);
  if (error) return error;
  await db();

  const { id } = await ctx.params;
  const nbFactures = await FactureClient.countDocuments({ clientId: id });
  if (nbFactures > 0) {
    return NextResponse.json(
      { message: "Impossible : ce client possède des factures" },
      { status: 409 }
    );
  }
  await Client.findByIdAndDelete(id);
  return NextResponse.json({ message: "Client supprimé" });
}
