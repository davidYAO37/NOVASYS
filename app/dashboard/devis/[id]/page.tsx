"use client";

import { useEffect, useState } from "react";
import { Badge, Button } from "react-bootstrap";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { STATUTS_COMMANDE } from "@/lib/format";
import PdfButtons from "@/components/print/PdfButtons";
import FicheDevis from "@/components/devis/FicheDevis";

/**
 * Détail / actualisation d'une commande : en-tête + lignes modifiables,
 * transfert au service achat, lien proforma.
 */
export default function DetailDevisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [commande, setCommande] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = () => {
    axios.get(`/api/commandes/${id}`).then((r) => {
      setCommande(r.data);
    }).catch(() => setMessage("Commande introuvable"));
  };

  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [id]);

  if (!commande) {
    return <div className="p-4">{message || "Chargement..."}</div>;
  }

  const modifiable = !["traitee", "partielle"].includes(commande.statutC);

  const enregistrer = async (payload: any) => {
    setErreur("");
    try {
      await axios.put(`/api/commandes/${id}`, {
        dateCommande: commande.dateCommande,
        ...payload,
      });
      setMessage("✅ Commande actualisée");
      charger();
    } catch (e: any) {
      setErreur(e.response?.data?.message || "Erreur");
      throw e;
    }
  };

  const transferer = async () => {
    try {
      await axios.post(`/api/commandes/${id}/transfert`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Transfert impossible");
    }
  };

  const reprendre = async () => {
    if (!confirm("Reprendre ce devis du service achat pour le modifier ?")) return;
    try {
      await axios.delete(`/api/commandes/${id}/transfert`);
      setMessage("Devis repris : il n'est plus au service achat");
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Reprise impossible");
    }
  };

  const statut = STATUTS_COMMANDE[commande.statutC];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h3 className="mb-0 titre-page">Commande {commande.numCommande}</h3>
          <Badge bg={statut?.color || "secondary"}>{statut?.label || commande.statutC}</Badge>{" "}
          {commande.serviceAchat && <Badge bg="info">Transférée au service achat</Badge>}
        </div>
        <div>
          <span className="me-2"><PdfButtons type="proforma" id={id} label="Proforma" /></span>
          {!commande.serviceAchat && (
            <Button variant="success" className="me-2" onClick={transferer}>
              <i className="bi bi-send me-1"></i>Transférer au service achat
            </Button>
          )}
          {commande.serviceAchat && commande.statutC === "en_cours" && (
            <Button variant="outline-warning" className="me-2" onClick={reprendre}>
              <i className="bi bi-arrow-counterclockwise me-1"></i>Reprendre le devis
            </Button>
          )}
          <Button variant="outline-secondary" onClick={() => router.push("/dashboard/devis")}>
            <i className="bi bi-arrow-left"></i>
          </Button>
        </div>
      </div>

      {message && <div className="alert alert-info">{message}</div>}
      {erreur && <div className="alert alert-danger">{erreur}</div>}

      <FicheDevis
        key={commande._id + String(commande.updatedAt || "")}
        initial={commande}
        readOnly={!modifiable}
        onSubmit={enregistrer}
        submitLabel="Valider la Commande"
      />
    </div>
  );
}
