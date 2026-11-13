"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import DocumentPrint from "@/components/print/DocumentPrint";
import ImpressionBar from "@/components/print/ImpressionBar";
import { useImpression } from "@/hooks/useImpression";

/** Impression du bon de commande fournisseur (ETAT_Bon_de_commande / ETAT_Bon_Achat). */
export default function ImpressionAchatPage() {
  const { id } = useParams<{ id: string }>();
  const [achat, setAchat] = useState<any>(null);
  const [entreprise, setEntreprise] = useState<any>(null);
  const { ref, avecEntete, imprimer } = useImpression();

  useEffect(() => {
    axios.get(`/api/achats/${id}`).then((r) => setAchat(r.data)).catch(() => {});
    axios.get("/api/entreprise").then((r) => setEntreprise(r.data)).catch(() => {});
  }, [id]);

  if (!achat) return <div className="p-4">Chargement...</div>;

  return (
    <div>
      <ImpressionBar pdfType="bon-commande" id={id} onPrint={imprimer} libelle="Bon de commande" />
      <div ref={ref}>
        <DocumentPrint
          entreprise={entreprise}
          avecEntete={avecEntete}
          titre="BON DE COMMANDE"
          numero={achat.numAchat}
          date={achat.dateAchat}
          devise={achat.deviseM}
          tiersLabel="Fournisseur"
          tiers={{ nom: achat.fournisseur, contact: achat.contactF }}
          objet={`Devis ${achat.numCommande || ""} ${achat.dateLivraison ? "— Livraison : " + new Date(achat.dateLivraison).toLocaleDateString("fr-FR") : ""}`}
          lignes={achat.lignes || []}
          totalHT={achat.totalHT}
          totalTVA={achat.totalTVA}
          totalTTC={achat.totalTTC}
        />
      </div>
    </div>
  );
}
