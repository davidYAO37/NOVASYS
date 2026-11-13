"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import DocumentPrint from "@/components/print/DocumentPrint";
import ImpressionBar from "@/components/print/ImpressionBar";
import { useImpression } from "@/hooks/useImpression";

/** Impression de la proforma (ETAT_Proforma1 / ETAT_Detail_Proforma). */
export default function ProformaPage() {
  const { id } = useParams<{ id: string }>();
  const [commande, setCommande] = useState<any>(null);
  const [entreprise, setEntreprise] = useState<any>(null);
  const { ref, avecEntete, imprimer } = useImpression();

  useEffect(() => {
    axios.get(`/api/commandes/${id}`).then((r) => setCommande(r.data)).catch(() => {});
    axios.get("/api/entreprise").then((r) => setEntreprise(r.data)).catch(() => {});
  }, [id]);

  if (!commande) return <div className="p-4">Chargement...</div>;

  return (
    <div>
      <ImpressionBar pdfType="proforma" id={id} onPrint={imprimer} libelle="Proforma" />
      <div ref={ref}>
        <DocumentPrint
          entreprise={entreprise}
          avecEntete={avecEntete}
          titre="FACTURE PROFORMA"
          numero={commande.numCommande}
          date={commande.dateCommande}
          devise={commande.deviseM}
          tiersLabel="Client"
          tiers={{
            nom: commande.clientC,
            contact: commande.contactC,
            mail: commande.mail,
            telephone: commande.telephone,
            boitePostale: commande.boitePostale,
          }}
          objet={commande.objetCommande}
          lignes={commande.lignes || []}
          totalHT={commande.totalHT}
          remise={commande.remise}
          mainDoeuvre={commande.mainDoeuvre}
          totalTVA={commande.totalTVA}
          totalTTC={commande.totalTTC}
        />
      </div>
    </div>
  );
}
