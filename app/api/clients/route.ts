import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Client } from "@/models/client";
import { estCommercial, estMien, filtreCreateur, idsClientsTravailles } from "@/lib/portee";

const ROLES = ["admin", "commercial", "achat", "caisse", "comptable"];

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
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

  // ?tous=1 : sélecteurs (fiche devis) — un commercial travaille avec tous les clients
  // Tout le monde voit toutes les fiches ; le commercial reçoit en plus
  // estMien pour le filtre « Mes clients » (créées ou déjà travaillées).
  const clients = await Client.find(filtre).sort({ nomPren: 1 }).lean();
  const ids = estCommercial(user) ? await idsClientsTravailles(user) : null;
  return NextResponse.json(
    clients.map((c) => ({ ...c, estMien: ids ? estMien(user, c, ids) : true }))
  );
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const data = await req.json();
  if (!data.nomPren?.trim()) {
    return NextResponse.json({ message: "Le nom du client est requis" }, { status: 400 });
  }
  // Les soldes ne se modifient que via les écritures de règlement
  for (const k of ["soldeClient", "montantPaye", "resteAPaye", "modifiePar"]) {
    delete data[k];
  }

  const client = await Client.create({
    ...data,
    nomPren: data.nomPren.trim(),
    creerPar: `${user.nom} ${user.prenom}`.trim(),
  });
  return NextResponse.json(client, { status: 201 });
}
