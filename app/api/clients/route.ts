import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Client } from "@/models/client";

const ROLES = ["admin", "commercial", "caisse", "comptable"];

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const filtre = q
    ? {
        $or: [
          { nomPren: { $regex: q, $options: "i" } },
          { raisonSociale: { $regex: q, $options: "i" } },
          { telephone: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const clients = await Client.find(filtre).sort({ nomPren: 1 }).lean();
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const data = await req.json();
  if (!data.nomPren?.trim()) {
    return NextResponse.json({ message: "Le nom du client est requis" }, { status: 400 });
  }

  const client = await Client.create({
    ...data,
    nomPren: data.nomPren.trim(),
    creerPar: `${user.nom} ${user.prenom}`.trim(),
  });
  return NextResponse.json(client, { status: 201 });
}
