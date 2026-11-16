"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Form, Modal, Table } from "react-bootstrap";
import axios from "axios";
import { fmtDate, fmtMontant, STATUTS_ACHAT } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";
import FicheFournisseurModal from "@/components/tiers/FicheFournisseurModal";

/**
 * FOURNISSEUR — liste des fournisseurs, fiche fournisseur et liste des
 * commandes du fournisseur (FEN_Gestion_Fournisseur + FEN_Fiche_FOURNISSEUR
 * + FEN_Fiche_FOURNISSEUR_Achat).
 */
export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [recherche, setRecherche] = useState("");
  const [ficheInit, setFicheInit] = useState<any | null>(null);
  const [showFiche, setShowFiche] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [message, setMessage] = useState("");
  const [apercuId, setApercuId] = useState<string | null>(null);

  const charger = useCallback(() => {
    axios.get("/api/fournisseurs", { params: { q: recherche || undefined } })
      .then((r) => setFournisseurs(r.data))
      .catch(() => {});
  }, [recherche]);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirFiche = (f?: any) => {
    setFicheInit(f || null);
    setShowFiche(true);
  };

  const voirDetail = async (id: string) => {
    const r = await axios.get(`/api/fournisseurs/${id}`);
    setDetail(r.data);
    setShowDetail(true);
  };

  const supprimer = async (id: string) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    try {
      await axios.delete(`/api/fournisseurs/${id}`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Suppression impossible");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Liste des fournisseurs</h3>
        <Button onClick={() => ouvrirFiche()}>
          <i className="bi bi-plus-lg me-1"></i>Nouveau fournisseur
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
              <th>Email</th>
              <th className="text-end">Reste à payer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map((f) => (
              <tr key={f._id}>
                <td className="fw-semibold" style={{ cursor: "pointer" }} onClick={() => voirDetail(f._id)}>
                  {f.nomPren}
                </td>
                <td>{f.raisonSociale}</td>
                <td>{f.telephone || f.portable}</td>
                <td>{f.mail}</td>
                <td className="text-end">
                  {(f.resteAPaye || 0) > 0
                    ? <Badge bg="warning" text="dark">{fmtMontant(f.resteAPaye)}</Badge>
                    : <Badge bg="success">0</Badge>}
                </td>
                <td>
                  <Button size="sm" variant="outline-primary" className="me-1" title="Commandes" onClick={() => voirDetail(f._id)}>
                    <i className="bi bi-eye"></i>
                  </Button>
                  <Button size="sm" variant="outline-secondary" className="me-1" title="Modifier" onClick={() => ouvrirFiche(f)}>
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button size="sm" variant="outline-danger" title="Supprimer" onClick={() => supprimer(f._id)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {!fournisseurs.length && (
              <tr><td colSpan={6} className="text-center text-muted py-4">Aucun fournisseur</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Fiche fournisseur */}
      <FicheFournisseurModal
        show={showFiche}
        initial={ficheInit}
        onHide={() => setShowFiche(false)}
        onSaved={() => { setShowFiche(false); charger(); }}
      />

      {/* Liste des commandes du fournisseur */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="xl" fullscreen="md-down">
        <Modal.Header closeButton>
          <Modal.Title>Fournisseur : {detail?.nomPren}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Liste des commandes (bons de commande)</h6>
          <Table size="sm" responsive hover>
            <thead>
              <tr>
                <th>N° Bon</th><th>Date</th><th className="text-end">Total TTC</th>
                <th className="text-end">Payé</th><th className="text-end">Reste</th>
                <th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(detail?.achats || []).map((a: any) => (
                <tr key={a._id}>
                  <td>{a.numAchat}</td>
                  <td>{fmtDate(a.dateAchat)}</td>
                  <td className="text-end">{fmtMontant(a.totalTTC)}</td>
                  <td className="text-end">{fmtMontant(a.totalPaye)}</td>
                  <td className="text-end">{fmtMontant(a.resteAPaye)}</td>
                  <td><Badge bg={STATUTS_ACHAT[a.statutAchat]?.color || "secondary"}>{STATUTS_ACHAT[a.statutAchat]?.label || a.statutAchat}</Badge></td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => setApercuId(a._id)}>
                      <i className="bi bi-file-earmark-text"></i> Bon de commande
                    </Button>
                  </td>
                </tr>
              ))}
              {!(detail?.achats || []).length && (
                <tr><td colSpan={7} className="text-center text-muted">Aucune commande</td></tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <PdfPreviewModal type="bon-commande" id={apercuId} show={!!apercuId} onHide={() => setApercuId(null)} />
    </div>
  );
}
