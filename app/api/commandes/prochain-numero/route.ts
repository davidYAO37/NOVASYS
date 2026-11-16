import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { prochainNumeroProforma } from "@/lib/numeroProforma";

const ROLES = ["admin", "commercial", "achat"];

/** Prochain N° PROFORMA (AAMMJJ/NOVA/<CODE>-n) pour pré-remplir la fiche. */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req, ROLES);
  if (error) return error;
  await db();

  const numComm = await prochainNumeroProforma(user);
  return NextResponse.json({ numComm });
}
