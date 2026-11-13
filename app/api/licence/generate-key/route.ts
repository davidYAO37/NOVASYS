import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Entreprise } from "@/models/entreprise";
import { generateLicenceKey } from "@/lib/licence";
import { ALL_MODULE_CODES } from "@/lib/licenceModules";

/**
 * Génération d'une clé de licence signée — réservé au super-admin
 * (côté éditeur). En exploitation courante, la clé est générée hors
 * ligne via `scripts/generer-licence.cjs`.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ["adminsuper"], { licenceExempt: true });
  if (error) return error;
  await db();

  const body = await req.json();
  const days = body.days !== undefined ? Math.max(Number(body.days) || 0, 1) : null;
  const modules =
    Array.isArray(body.modules) && body.modules.length
      ? body.modules.filter((m: string) => ALL_MODULE_CODES.includes(m as any))
      : [...ALL_MODULE_CODES];

  const entreprise = await Entreprise.findOne().lean();
  const licenceEndDate = days ? new Date(Date.now() + days * 86400000) : undefined;

  const key = generateLicenceKey({
    _id: entreprise?._id,
    licenceType: body.type === "trial" ? "trial" : "paid",
    licenceStatus: "active",
    licenceEndDate,
    modules,
  } as any);

  return NextResponse.json({ key, licenceEndDate, modules });
}
