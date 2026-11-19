import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Fournisseur } from "@/models/fournisseur";
import { estCommercial, estMien, idsFournisseursTravailles } from "@/lib/portee";

const ROLES = ["admin", "commercial", "achat", "comptable"];

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

  // ?tous=1 : sélecteurs (fiche devis) — un commercial travaille avec tous les fournisseurs
  // Tout le monde voit toutes les fiches ; le commercial reçoit en plus
  // estMien pour le filtre « Mes fournisseurs » (créés ou déjà travaillées).
  const fournisseurs = await Fournisseur.find(filtre).sort({ nomPren: 1 }).lean();
  const ids = estCommercial(user) ? await idsFournisseursTravailles(user) : null;
  return NextResponse.json(
    fournisseurs.map((f) => ({ ...f, estMien: ids ? estMien(user, f, ids) : true }))
  );
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const data = await req.json();
  if (!data.nomPren?.trim()) {
    return NextResponse.json({ message: "Le nom du fournisseur est requis" }, { status: 400 });
  }
  for (const k of ["compteFournisseur", "montantPaye", "resteAPaye", "modifiePar"]) {
    delete data[k];
  }

  const fournisseur = await Fournisseur.create({
    ...data,
    nomPren: data.nomPren.trim(),
    creerPar: `${user.nom} ${user.prenom}`.trim(),
  });
  return NextResponse.json(fournisseur, { status: 201 });
}
