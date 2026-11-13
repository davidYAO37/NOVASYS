import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Entreprise } from "@/models/entreprise";
import { FactureClient } from "@/models/factureClient";
import { LigneFacture } from "@/models/ligneFacture";
import { Commande } from "@/models/commande";
import { LigneCde } from "@/models/ligneCde";
import { Achat } from "@/models/achat";
import { LigneAchat } from "@/models/ligneAchat";
import { Client } from "@/models/client";
import { Fournisseur } from "@/models/fournisseur";
import { PaiementClient } from "@/models/paiementClient";
import { genererDocumentPdf, DonneesDocumentPdf } from "@/lib/pdf/documents";

/**
 * Génération PDF des états NOVASYS :
 *   facture       → ETAT_FACTURE
 *   bl            → ETAT_Bon_de_livraison
 *   proforma      → ETAT_Proforma
 *   bon-commande  → ETAT_Bon_de_commande (achat fournisseur)
 *   recu          → ETAT_Recu (paiement client)
 *
 * `?avecEntete=false` : impression sans logo/entête/pied (papier pré-imprimé).
 */
const ROLES: Record<string, string[]> = {
  facture: ["admin", "achat", "caisse", "comptable"],
  bl: ["admin", "achat", "caisse", "comptable"],
  proforma: ["admin", "commercial", "achat"],
  "bon-commande": ["admin", "achat", "comptable"],
  recu: ["admin", "caisse", "comptable"],
};

async function construireDonnees(type: string, id: string): Promise<DonneesDocumentPdf | null> {
  switch (type) {
    case "facture":
    case "bl": {
      const f = await FactureClient.findById(id).lean();
      if (!f) return null;
      const lignes = await LigneFacture.find({ factureId: f._id }).lean();
      const client = f.clientId ? await Client.findById(f.clientId).lean() : null;
      const estBL = type === "bl";
      return {
        titre: estBL ? "Bon de livraison" : "Facture",
        numero: estBL ? f.numBonFacture || f.numFacture : f.numFacture,
        date: estBL ? f.dateLivraison || f.dateFacture : f.dateFacture,
        devise: f.deviseM,
        tiers: {
          label: "Client",
          nom: f.clientC || client?.raisonSociale || client?.nomPren,
          contact: f.contactC,
          telephone: client?.telephone,
          mail: f.mail || client?.mail,
          adresse: f.adresseGeo || client?.adresseGeo,
          boitePostale: (client as any)?.boitePostale,
        },
        objet: f.objetFacture || (f.numCommande ? `Proforma ${f.numCommande}` : undefined),
        lignes,
        sansPrix: estBL,
        totaux: {
          totalHT: f.totalHTFacture,
          remise: f.remise,
          mainDoeuvre: f.mainDoeuvre,
          totalTVA: f.totalTVA,
          totalTTC: f.totalTTC,
          totalPaye: f.totalPaye,
          resteAPaye: f.resteAPaye,
        },
        montantEnLettres: estBL ? undefined : f.totalTTC,
        complement: !estBL && f.modeReglement ? `Mode de règlement : ${f.modeReglement}` : undefined,
        signatureGauche: estBL ? "Réceptionné par (client)" : "Signature client",
        signatureDroite: estBL ? "Livré par" : "La Direction",
      };
    }

    case "proforma": {
      const c = await Commande.findById(id).lean();
      if (!c) return null;
      const lignes = await LigneCde.find({ commandeId: c._id }).lean();
      const client = c.clientId ? await Client.findById(c.clientId).lean() : null;
      const infos = [
        c.delaisExecution && `Délai d'exécution : ${c.delaisExecution}`,
        c.validiteCommande && `Validité de l'offre : ${c.validiteCommande}`,
        c.garantie && `Garantie : ${c.garantie}`,
      ].filter(Boolean).join("\n");
      return {
        titre: "Facture proforma",
        numero: c.numCommande,
        date: c.dateCommande,
        devise: c.deviseM,
        tiers: {
          label: "Client",
          nom: c.clientC || client?.raisonSociale || client?.nomPren,
          contact: c.contactC,
          telephone: c.telephone || client?.telephone,
          mail: c.mail || client?.mail,
          adresse: client?.adresseGeo,
          boitePostale: c.boitePostale,
        },
        objet: c.objetCommande,
        lignes,
        totaux: {
          totalHT: c.totalHT,
          remise: c.remise,
          mainDoeuvre: c.mainDoeuvre,
          totalTVA: c.totalTVA,
          totalTTC: c.totalTTC,
        },
        montantEnLettres: c.totalTTC,
        complement: infos || undefined,
        signatureGauche: "Bon pour accord (client)",
        signatureDroite: "La Direction",
      };
    }

    case "bon-commande": {
      const a = await Achat.findById(id).lean();
      if (!a) return null;
      const lignes = await LigneAchat.find({ achatId: a._id }).lean();
      const four = a.fournisseurId ? await Fournisseur.findById(a.fournisseurId).lean() : null;
      return {
        titre: "Bon de commande",
        numero: a.numAchat,
        date: a.dateAchat,
        devise: a.deviseM,
        tiers: {
          label: "Fournisseur",
          nom: a.fournisseur || four?.raisonSociale || four?.nomPren,
          contact: a.contactF,
          telephone: four?.telephone,
          mail: four?.mail,
          adresse: four?.adresseGeo,
        },
        objet: a.numCommande ? `Réf. commande client ${a.numCommande}` : undefined,
        lignes: lignes.map((l) => ({
          reference: l.reference,
          articleM: l.articleM,
          description: l.description,
          quantite: l.quantite,
          prixUnitaire: l.prixAchat,
          prixTotalHT: l.prixTHT,
        })),
        totaux: {
          totalHT: a.totalHT,
          totalTVA: a.totalTVA,
          totalTTC: a.totalTTC,
        },
        montantEnLettres: a.totalTTC,
        complement: [
          a.modeReglement && `Règlement : ${a.modeReglement}`,
          a.banque && `Banque : ${a.banque}`,
          a.numCheque && `Chèque n° ${a.numCheque}`,
          a.dateLivraison && `Livraison souhaitée : ${new Date(a.dateLivraison).toLocaleDateString("fr-FR")}`,
        ].filter(Boolean).join("\n") || undefined,
        signatureGauche: "Le Fournisseur",
        signatureDroite: "Service Achat / Direction",
      };
    }

    case "recu": {
      const p = await PaiementClient.findById(id).lean();
      if (!p) return null;
      return {
        titre: "Reçu de paiement",
        numero: `REC-${String(p._id).slice(-6).toUpperCase()}`,
        date: p.datePaiement,
        devise: p.deviseM,
        tiers: { label: "Reçu de", nom: p.recuDe || p.clientC },
        objet: p.objetCommande || (p.numCommande ? `Commande ${p.numCommande}` : undefined),
        lignes: [
          {
            reference: p.numeroFactBL || p.numCommande,
            articleM: `Règlement ${p.modeReglement || ""}`.trim(),
            quantite: 1,
            prixUnitaire: p.montantPaye,
            prixTotalHT: p.montantPaye,
          },
        ],
        totaux: {
          totalHT: p.montantPaye,
          totalTVA: 0,
          totalTTC: p.montantPaye,
          resteAPaye: p.resteAPaye,
        },
        montantEnLettres: p.montantPaye,
        complement: [
          p.banque && `Banque : ${p.banque}`,
          p.numCheque && `Chèque n° ${p.numCheque}`,
          p.numVirement && `Virement n° ${p.numVirement}`,
          p.payePar && `Encaissé par : ${p.payePar}`,
        ].filter(Boolean).join("\n") || undefined,
        signatureGauche: "Le Client",
        signatureDroite: "La Caisse",
      };
    }
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  if (!ROLES[type]) {
    return NextResponse.json({ message: "Type de document inconnu" }, { status: 404 });
  }
  const { error } = await requireAuth(req, ROLES[type]);
  if (error) return error;
  await db();

  try {
    const data = await construireDonnees(type, id);
    if (!data) return NextResponse.json({ message: "Document introuvable" }, { status: 404 });

    const entreprise = await Entreprise.findOne().lean();
    const avecEntete = req.nextUrl.searchParams.get("avecEntete") !== "false";
    const pdf = await genererDocumentPdf(entreprise as any, data, { afficherEntete: avecEntete });

    const filename = `${type}-${String(data.numero || id).replace(/[^\w-]/g, "_")}.pdf`;
    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(`Erreur PDF ${type}:`, err);
    return NextResponse.json({ message: "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}
