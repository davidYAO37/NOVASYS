import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Article } from "@/models/article";
import { Stock } from "@/models/stock";
import { hasActionPermission } from "@/lib/permissions";
import { nextNumero } from "@/lib/numero";

const ROLES = ["admin", "stock", "commercial", "caisse", "achat"];

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
  const { user, error } = await requireAuth(req, ["admin", "stock", "commercial", "achat"], {
    actions: ["creation_article"],
  });
  if (error) return error;
  // Le profil stock garde l'obligation de l'action parametrage_stock ;
  // commerciaux et service achat peuvent créer un article depuis le devis.
  if (user.type === "stock" && !hasActionPermission(user, "parametrage_stock")) {
    return NextResponse.json({ message: "Accès interdit" }, { status: 403 });
  }
  await db();

  const data = await req.json();
  if (!data.designationA?.trim()) {
    return NextResponse.json(
      { message: "La désignation est requise" },
      { status: 400 }
    );
  }
  const reference = data.reference?.trim() || (await nextNumero(Article, "reference", "ART"));

  let article;
  try {
    article = await Article.create({
      ...data,
      reference,
      designationA: data.designationA.trim(),
      ajouterPar: `${user.nom} ${user.prenom}`.trim(),
      heureAjout: new Date().toLocaleTimeString("fr-FR"),
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json(
        { message: "Cette référence existe déjà" },
        { status: 409 }
      );
    }
    throw e;
  }

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
