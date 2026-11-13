import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Article } from "@/models/article";
import { Stock } from "@/models/stock";

const ROLES = ["admin", "stock", "commercial", "caisse"];

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const filtre = q
    ? {
        $or: [
          { reference: { $regex: q, $options: "i" } },
          { designationA: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const articles = await Article.find(filtre).sort({ designationA: 1 }).limit(500).lean();
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req, ["admin", "stock"], {
    actions: ["parametrage_stock"],
  });
  if (error) return error;
  await db();

  const data = await req.json();
  if (!data.reference?.trim() || !data.designationA?.trim()) {
    return NextResponse.json(
      { message: "Référence et désignation requises" },
      { status: 400 }
    );
  }

  const article = await Article.create({
    ...data,
    reference: data.reference.trim(),
    designationA: data.designationA.trim(),
    ajouterPar: `${user.nom} ${user.prenom}`.trim(),
    heureAjout: new Date().toLocaleTimeString("fr-FR"),
  });

  // Créer la ligne de stock associée
  await Stock.updateOne(
    { reference: article.reference },
    {
      $setOnInsert: {
        reference: article.reference,
        designation: article.designationA,
        qteEnStock: 0,
        qteStockVirtuel: 0,
        seuilAlerte: article.seuilAlerte || 0,
      },
    },
    { upsert: true }
  );

  return NextResponse.json(article, { status: 201 });
}
