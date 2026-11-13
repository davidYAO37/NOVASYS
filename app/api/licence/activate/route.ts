import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Entreprise } from "@/models/entreprise";
import { Licence } from "@/models/licence";
import { verifyLicenceKey } from "@/lib/licence";

/**
 * Activation par clé de licence signée (LICENCE_SECRET) — équiv.
 * FEN_Activation WinDev. Accessible même si la licence est bloquée.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ["admin"], { licenceExempt: true });
  if (error) return error;
  await db();

  const { key } = await req.json();
  if (!key || typeof key !== "string") {
    return NextResponse.json({ message: "Clé de licence requise" }, { status: 400 });
  }

  const { valid, payload } = verifyLicenceKey(key);
  if (!valid || !payload) {
    return NextResponse.json({ message: "Clé de licence invalide" }, { status: 400 });
  }

  if (payload.status === "suspended" || payload.status === "resiliated") {
    return NextResponse.json({ message: "Cette licence est suspendue ou résiliée" }, { status: 400 });
  }

  const update: any = {
    licenceType: payload.type || "paid",
    licenceStatus: "active",
    licenceActivatedAt: new Date(),
    licenceKey: key.trim(),
    modules: payload.modules || [],
  };
  if (payload.end) update.licenceEndDate = new Date(payload.end);
  if (payload.maintenance) {
    update.maintenanceAccepted = true;
    update.maintenanceDueDate = new Date(payload.maintenance);
  }
  if (!update.licenceStartDate) update.licenceStartDate = new Date();

  const entreprise = await Entreprise.findOneAndUpdate({}, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  // Journalisation équivalente à la table Licence WinDev
  await Licence.findOneAndUpdate(
    {},
    {
      licence: key.trim().slice(0, 64),
      essai: payload.type === "trial",
      activationL: new Date(),
      definitif: payload.type !== "trial",
      enregistreL: true,
    },
    { upsert: true }
  );

  return NextResponse.json({ message: "Licence activée", entreprise });
}
