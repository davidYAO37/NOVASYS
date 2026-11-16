"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Form, Modal, Table } from "react-bootstrap";
import axios from "axios";
import { fmtDate, fmtMontant, STATUTS_FACTURE } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";
import FicheClientModal from "@/components/tiers/FicheClientModal";

/**
 * CLIENT — liste des clients, fiche client, factures et paiements du
 * client (FEN_Gestion_Client + FEN_Fiche_CLIENT + FEN_Fiche_Relation_CLIENT_VENTE).
 */
export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [recherche, setRecherche] = useState("");
  const [ficheInit, setFicheInit] = useState<any | null>(null);
  const [showFiche, setShowFiche] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [message, setMessage] = useState("");
  const [apercu, setApercu] = useState<{ type: "facture" | "bl"; id: string } | null>(null);

  const charger = useCallback(() => {
    axios.get("/api/clients", { params: { q: recherche || undefined } })
      .then((r) => setClients(r.data))
      .catch(() => {});
  }, [recherche]);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirFiche = (c?: any) => {
    setFicheInit(c || null);
    setShowFiche(true);
  };

  const voirDetail = async (id: string) => {
    const r = await axios.get(`/api/clients/${id}`);
    setDetail(r.data);
    setShowDetail(true);
  };

  const supprimer = async (id: string) => {
    if (!confirm("Supprimer ce client ?")) return;
    try {
      await axios.delete(`/api/clients/${id}`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Suppression impossible");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Liste des clients</h3>
        <Button onClick={() => ouvrirFiche()}>
          <i className="bi bi-plus-lg me-1"></i>Nouveau client
        </Button>
      </div>

      {message && <div className="alert alert-danger">{message}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Form.Control
            placeholder="Rechercher (nom, raison sociale, téléphone)..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>Nom & Prénoms</th>
              <th>Raison sociale</th>
              <th>Téléphone</th>
              <th>Ville</th>
              <th className="text-end">Solde</th>
              <th className="text-end">Reste à payer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c._id}>
                <td className="fw-semibold" style={{ cursor: "pointer" }} onClick={() => voirDetail(c._id)}>
                  {c.nomPren}
                </td>
                <td>{c.raisonSociale}</td>
                <td>{c.telephone}</td>
                <td>{c.villeClient}</td>
                <td className="text-end">{fmtMontant(c.soldeClient)}</td>
                <td className="text-end">
                  {(c.resteAPaye || 0) > 0
                    ? <Badge bg="warning" text="dark">{fmtMontant(c.resteAPaye)}</Badge>
                    : <Badge bg="success">0</Badge>}
                </td>
                <td>
                  <Button size="sm" variant="outline-primary" className="me-1" title="Voir factures" onClick={() => voirDetail(c._id)}>
                    <i className="bi bi-eye"></i>
                  </Button>
                  <Button size="sm" variant="outline-secondary" className="me-1" title="Modifier" onClick={() => ouvrirFiche(c)}>
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button size="sm" variant="outline-danger" title="Supprimer" onClick={() => supprimer(c._id)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {!clients.length && (
              <tr><td colSpan={7} className="text-center text-muted py-4">Aucun client</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Fiche client */}
      <FicheClientModal
        show={showFiche}
        initial={ficheInit}
        onHide={() => setShowFiche(false)}
        onSaved={() => { setShowFiche(false); charger(); }}
      />

      {/* Factures du client (LISTE DES FACTURES DU CLIENT) */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="xl" fullscreen="md-down">
        <Modal.Header closeButton>
          <Modal.Title>Client : {detail?.nomPren}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Liste des factures du client</h6>
          <Table size="sm" responsive hover>
            <thead>
              <tr>
                <th>N° Facture</th><th>Date</th><th className="text-end">Total TTC</th>
                <th className="text-end">Payé</th><th className="text-end">Reste</th>
                <th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(detail?.factures || []).map((f: any) => (
                <tr key={f._id}>
                  <td>{f.numFacture}</td>
                  <td>{fmtDate(f.dateFacture)}</td>
                  <td className="text-end">{fmtMontant(f.totalTTC)}</td>
                  <td className="text-end">{fmtMontant(f.totalPaye)}</td>
                  <td className="text-end">{fmtMontant(f.resteAPaye)}</td>
                  <td><Badge bg={STATUTS_FACTURE[f.statutC]?.color || "secondary"}>{STATUTS_FACTURE[f.statutC]?.label || f.statutC}</Badge></td>
                  <td>
                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => setApercu({ type: "facture", id: f._id })}>
                      <i className="bi bi-receipt"></i> Facture
                    </Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => setApercu({ type: "bl", id: f._id })}>
                      <i className="bi bi-truck"></i> BL
                    </Button>
                  </td>
                </tr>
              ))}
              {!(detail?.factures || []).length && (
                <tr><td colSpan={7} className="text-center text-muted">Aucune facture</td></tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <PdfPreviewModal
        type={apercu?.type || "facture"}
        id={apercu?.id || null}
        show={!!apercu}
        onHide={() => setApercu(null)}
      />
    </div>
  );
}
