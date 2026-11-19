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
  const [transitaires, setTransitaires] = useState<any[]>([]);
  const { ref, avecEntete, imprimer } = useImpression();

  useEffect(() => {
    axios.get(`/api/achats/${id}`).then((r) => setAchat(r.data)).catch(() => {});
    axios.get("/api/entreprise").then((r) => setEntreprise(r.data)).catch(() => {});
    axios.get("/api/transitaires").then((r) => setTransitaires(r.data)).catch(() => {});
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
          detailTotaux={[
            ...(((achat.fraisTransport || 0) > 0 || (achat.autreMontant || 0) > 0 || (achat.montantDouane || 0) > 0) &&
            (achat.sousTotalHT || 0) > 0
              ? [{ label: "Sous-total articles HT", montant: achat.sousTotalHT }]
              : []),
            ...((achat.fraisTransport || 0) > 0 ? [{ label: "Transport", montant: achat.fraisTransport }] : []),
            ...((achat.autreMontant || 0) > 0 ? [{ label: "Autre montant", montant: achat.autreMontant }] : []),
            ...((achat.montantDouane || 0) > 0
              ? [{ label: `Douane (${achat.tauxDouane || 0} %)`, montant: achat.montantDouane }]
              : []),
          ]}
          totalHT={achat.totalHT}
          totalTVA={achat.totalTVA}
          totalTTC={achat.totalTTC}
          labelTVA={`TVA (${achat.taux || 0} %)`}
          complement={
            achat.transitaire
              ? `Transitaire : ${achat.transitaire}${
                  transitaires.find((t) => t._id === achat.transitaireId)?.telephone
                    ? ` — ${transitaires.find((t) => t._id === achat.transitaireId).telephone}`
                    : ""
                }`
              : undefined
          }
        />
      </div>
    </div>
  );
}
