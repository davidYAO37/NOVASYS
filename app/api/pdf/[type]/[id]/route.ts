import { NextRequest, NextResponse } from "next/server";
import { requireAuth, CurrentUser } from "@/lib/auth";
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
import { Transitaire } from "@/models/transitaire";
import { PaiementClient } from "@/models/paiementClient";
import { PaiementFournisseur } from "@/models/paiementFournisseur";
import { ReglementFournisseur } from "@/models/reglementFournisseur";
import { genererDocumentPdf, DonneesDocumentPdf } from "@/lib/pdf/documents";
import { peutConsulterClient, peutVoirSaisie } from "@/lib/portee";

/**
 * Génération PDF des états NOVASYS :
 *   facture       → ETAT_FACTURE
 *   bl            → ETAT_Bon_de_livraison
 *   proforma      → ETAT_Proforma
 *   bon-commande  → ETAT_Bon_de_commande (achat fournisseur)
 *   recu          → ETAT_Recu (paiement client) + reçu de décaissement fournisseur
 *
 * `?avecEntete=false` : impression sans logo/entête/pied (papier pré-imprimé).
 */
const ROLES: Record<string, string[]> = {
  // Guide commercial : voir factures / BL du client et bons de commande du fournisseur
  facture: ["admin", "commercial", "achat", "caisse", "comptable"],
  bl: ["admin", "commercial", "achat", "caisse", "comptable"],
  proforma: ["admin", "commercial", "achat"],
  "bon-commande": ["admin", "commercial", "achat", "comptable"],
  // recu : achat autorisé pour les reçus de décaissement fournisseur seulement
  recu: ["admin", "achat", "caisse", "comptable"],
};

async function construireDonnees(type: string, id: string, user: CurrentUser): Promise<DonneesDocumentPdf | null> {
  switch (type) {
    case "facture":
    case "bl": {
      const f = await FactureClient.findById(id).lean();
      if (!f) return null;
      const lignes = await LigneFacture.find({ factureId: f._id }).lean();
      const client = f.clientId ? await Client.findById(f.clientId).lean() : null;
      if (!(await peutConsulterClient(user, client))) return null;
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
      if (!c || !peutVoirSaisie(user, c)) return null;
      const lignes = await LigneCde.find({ commandeId: c._id }).lean();
      const client = c.clientId ? await Client.findById(c.clientId).lean() : null;
      const infos = [
        c.delaisExecution && `Délai d'exécution : ${c.delaisExecution}`,
        c.validiteCommande && `Validité de l'offre : ${c.validiteCommande}`,
        c.garantie && `Garantie : ${c.garantie}`,
      ].filter(Boolean).join("\n");
      return {
        titre: "Facture proforma",
        numero: c.numComm || c.numCommande,
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
        // Le client voit le PU HT (prix majoré), jamais le prix d'achat saisi
        lignes: lignes.map((l) => ({ ...l, prixUnitaire: l.prixUnitaireHT ?? l.prixUnitaire })),
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
      const trans = a.transitaireId ? await Transitaire.findById(a.transitaireId).lean() : null;
      // Détail des totaux (transport, autre montant, douane) : uniquement les
      // valeurs renseignées ; les anciens bons sans ces champs restent inchangés.
      const detail: { label: string; montant: number }[] = [];
      const aDesExtras =
        (a.fraisTransport || 0) > 0 || (a.autreMontant || 0) > 0 || (a.montantDouane || 0) > 0;
      if (aDesExtras && (a.sousTotalHT || 0) > 0) {
        detail.push({ label: "Sous-total articles HT", montant: a.sousTotalHT || 0 });
      }
      if ((a.fraisTransport || 0) > 0) detail.push({ label: "Transport", montant: a.fraisTransport || 0 });
      if ((a.autreMontant || 0) > 0) detail.push({ label: "Autre montant", montant: a.autreMontant || 0 });
      if ((a.montantDouane || 0) > 0) {
        detail.push({ label: `Douane (${a.tauxDouane || 0} %)`, montant: a.montantDouane || 0 });
      }
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
          detail,
          totalHT: a.totalHT,
          totalTVA: a.totalTVA,
          totalTTC: a.totalTTC,
          labelTVA: `TVA (${a.taux || 0} %)`,
        },
        montantEnLettres: a.totalTTC,
        complement: [
          a.transitaire &&
            `Transitaire : ${a.transitaire}${trans?.telephone ? ` — ${trans.telephone}` : ""}`,
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
      if (!p) {
        // Reçu de décaissement fournisseur (émission de chèque)
        const pf = await PaiementFournisseur.findById(id).lean();
        if (!pf) return null;
        const emission = pf.reglementFournisseurId
          ? await ReglementFournisseur.findById(pf.reglementFournisseurId).lean()
          : null;
        const historique = (
          await PaiementFournisseur.find(
            pf.reglementFournisseurId ? { reglementFournisseurId: pf.reglementFournisseurId } : { _id: pf._id }
          ).sort({ datePaiement: 1, createdAt: 1 }).lean()
        ).map((h) => ({
          numero: `DEC-${String(h._id).slice(-6).toUpperCase()}`,
          date: h.datePaiement,
          libelle: `Décaissement ${h.modeReglement || ""}`.trim(),
          reference: h.numCheque || h.numVirement || h.numTel,
          montant: h.montantPaye,
          annule: h.annule,
          courant: String(h._id) === String(pf._id),
        }));
        return {
          titre: "Reçu de décaissement",
          numero: `DEC-${String(pf._id).slice(-6).toUpperCase()}`,
          annule: pf.annule,
          date: pf.datePaiement,
          devise: pf.deviseM,
          tiers: { label: "Payé à", nom: pf.recuDe || pf.fournisseur },
          objet: pf.objetAchat || (emission?.numEmission ? `Émission ${emission.numEmission}` : undefined),
          lignes: [
            {
              reference: emission?.numEmission,
              articleM: `Décaissement ${pf.modeReglement || ""}`.trim(),
              quantite: 1,
              prixUnitaire: pf.montantPaye,
              prixTotalHT: pf.montantPaye,
            },
          ],
          totaux: {
            totalHT: pf.montantPaye,
            totalTVA: 0,
            totalTTC: pf.montantPaye,
            totalPaye: pf.montantPaye,
            resteAPaye: pf.resteAPaye,
          },
          montantEnLettres: pf.montantPaye,
          complement: [
            pf.alOrdreDe && `À l'ordre de : ${pf.alOrdreDe}`,
            pf.banque && `Banque : ${pf.banque}`,
            pf.numCheque && `Chèque n° ${pf.numCheque}`,
            pf.numVirement && `Virement n° ${pf.numVirement}`,
            pf.numTel && `Téléphone : ${pf.numTel}`,
            pf.delaisDeReglement && `Délai de règlement : ${pf.delaisDeReglement}`,
            pf.payePar && `Décaissé par : ${pf.payePar}`,
          ].filter(Boolean).join("\n") || undefined,
          historique,
          signatureGauche: "Le Fournisseur",
          signatureDroite: "La Comptabilité",
        };
      }
      // Reçus de paiement client : réservés caisse / compta / admin
      if (user.type === "achat") return null;
      const filtreHisto = p.factureId
        ? { factureId: p.factureId }
        : p.commandeId
          ? { commandeId: p.commandeId }
          : { _id: p._id };
      const historique = (
        await PaiementClient.find(filtreHisto).sort({ datePaiement: 1, createdAt: 1 }).lean()
      ).map((h) => ({
        numero: `REC-${String(h._id).slice(-6).toUpperCase()}`,
        date: h.datePaiement,
        libelle: `Règlement ${h.modeReglement || ""}`.trim(),
        reference: h.numCheque || h.numVirement || h.numTel,
        montant: h.montantPaye,
        annule: h.annule,
        courant: String(h._id) === String(p._id),
      }));
      return {
        titre: "Reçu de paiement",
        numero: `REC-${String(p._id).slice(-6).toUpperCase()}`,
        annule: p.annule,
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
          totalPaye: p.montantPaye,
          resteAPaye: p.resteAPaye,
        },
        montantEnLettres: p.montantPaye,
        complement: [
          p.banque && `Banque : ${p.banque}`,
          p.numCheque && `Chèque n° ${p.numCheque}`,
          p.numVirement && `Virement n° ${p.numVirement}`,
          p.numTel && `Téléphone : ${p.numTel}`,
          p.payePar && `Encaissé par : ${p.payePar}`,
        ].filter(Boolean).join("\n") || undefined,
        historique,
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
  const { user, error } = await requireAuth(req, ROLES[type]);
  if (error) return error;
  await db();

  try {
    const data = await construireDonnees(type, id, user);
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
