"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import DocumentPrint from "@/components/print/DocumentPrint";
import ImpressionBar from "@/components/print/ImpressionBar";
import { useImpression } from "@/hooks/useImpression";

/**
 * Impression de la facture (ETAT_FACTURE) ou du bon de livraison
 * (ETAT_Bon_de_livraison) selon le paramètre ?bl=1.
 */
function ImpressionFacture() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const estBL = params.get("bl") === "1";
  const [facture, setFacture] = useState<any>(null);
  const [entreprise, setEntreprise] = useState<any>(null);
  const { ref, avecEntete, imprimer } = useImpression();

  useEffect(() => {
    axios.get(`/api/factures/${id}`).then((r) => setFacture(r.data)).catch(() => {});
    axios.get("/api/entreprise").then((r) => setEntreprise(r.data)).catch(() => {});
  }, [id]);

  if (!facture) return <div className="p-4">Chargement...</div>;

  return (
    <div>
      <ImpressionBar
        pdfType={estBL ? "bl" : "facture"}
        id={id}
        onPrint={imprimer}
        libelle={estBL ? "Bon de livraison" : "Facture"}
      />
      <div ref={ref}>
        <DocumentPrint
          entreprise={entreprise}
          avecEntete={avecEntete}
          titre={estBL ? "BON DE LIVRAISON" : "FACTURE"}
          numero={estBL ? facture.numBonFacture || facture.numFacture : facture.numFacture}
          date={estBL ? facture.dateLivraison || facture.dateFacture : facture.dateFacture}
          devise={facture.deviseM}
          tiersLabel="Client"
          tiers={{
            nom: facture.clientC,
            contact: facture.contactC,
            mail: facture.mail,
            adresse: facture.adresseGeo,
          }}
          objet={facture.objetFacture || `Commande ${facture.numCommande || ""}`}
          lignes={facture.lignes || []}
          sansPrix={estBL}
          totalHT={facture.totalHTFacture}
          remise={facture.remise}
          mainDoeuvre={facture.mainDoeuvre}
          totalTVA={facture.totalTVA}
          totalTTC={facture.totalTTC}
          totalPaye={facture.totalPaye}
          resteAPaye={facture.resteAPaye}
          modeReglement={facture.modeReglement}
        />
      </div>
    </div>
  );
}

export default function ImpressionFacturePage() {
  return (
    <Suspense fallback={<div className="text-center p-5">Chargement...</div>}>
      <ImpressionFacture />
    </Suspense>
  );
}
