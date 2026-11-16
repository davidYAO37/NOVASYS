"use client";

import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { useRouter } from "next/navigation";
import axios from "axios";
import FicheDevis from "@/components/devis/FicheDevis";

/**
 * FICHE DE SAISIE DU DEVIS (écran WinDev « NOUVEAU DEVIS ») : formulaire
 * partagé FicheDevis, N° proforma pré-rempli, retour à la liste après
 * enregistrement.
 */
export default function NouveauDevisPage() {
  const router = useRouter();
  const [numComm, setNumComm] = useState("");

  useEffect(() => {
    axios.get("/api/commandes/prochain-numero")
      .then((r) => setNumComm(r.data?.numComm || ""))
      .catch(() => {});
  }, []);

  const enregistrer = async (payload: any) => {
    await axios.post("/api/commandes", payload);
    router.push("/dashboard/devis");
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">FICHE DE SAISIE DEVIS</h3>
        <Button variant="outline-secondary" onClick={() => router.push("/dashboard/devis")}>
          <i className="bi bi-arrow-left me-1"></i>Retour
        </Button>
      </div>

      <FicheDevis
        key={numComm || "init"}
        initial={{ numComm, modeReglement: "Selon le Client" }}
        onSubmit={enregistrer}
        submitLabel="Valider la Commande"
      />
    </div>
  );
}
