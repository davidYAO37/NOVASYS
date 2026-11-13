"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import { fmtDate, fmtMontant, STATUTS_ACHAT } from "@/lib/format";

const VIDE = {
  nomPren: "", raisonSociale: "", rcc: "", telephone: "", portable: "",
  mail: "", adresseGeo: "", adresseP: "", observation: "", ncc: "",
};

/**
 * FOURNISSEUR — liste des fournisseurs, fiche fournisseur et liste des
 * commandes du fournisseur (FEN_Gestion_Fournisseur + FEN_Fiche_FOURNISSEUR
 * + FEN_Fiche_FOURNISSEUR_Achat).
 */
export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [recherche, setRecherche] = useState("");
  const [showFiche, setShowFiche] = useState(false);
  const [fiche, setFiche] = useState<any>(VIDE);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    axios.get("/api/fournisseurs", { params: { q: recherche || undefined } })
      .then((r) => setFournisseurs(r.data))
      .catch(() => {});
  }, [recherche]);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirFiche = (f?: any) => {
    setEditId(f?._id || null);
    setFiche(f ? { ...VIDE, ...f } : VIDE);
    setShowFiche(true);
  };

  const enregistrer = async () => {
    try {
      if (editId) await axios.put(`/api/fournisseurs/${editId}`, fiche);
      else await axios.post("/api/fournisseurs", fiche);
      setShowFiche(false);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur d'enregistrement");
    }
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Liste des fournisseurs</h3>
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
      <Modal show={showFiche} onHide={() => setShowFiche(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Fiche fournisseur</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}><Form.Label>Nom & Prénoms *</Form.Label>
              <Form.Control value={fiche.nomPren} onChange={(e) => setFiche({ ...fiche, nomPren: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Raison sociale</Form.Label>
              <Form.Control value={fiche.raisonSociale} onChange={(e) => setFiche({ ...fiche, raisonSociale: e.target.value })} /></Col>
            <Col md={6}><Form.Label>RCC</Form.Label>
              <Form.Control value={fiche.rcc} onChange={(e) => setFiche({ ...fiche, rcc: e.target.value })} /></Col>
            <Col md={6}><Form.Label>NCC</Form.Label>
              <Form.Control value={fiche.ncc} onChange={(e) => setFiche({ ...fiche, ncc: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Téléphone</Form.Label>
              <Form.Control value={fiche.telephone} onChange={(e) => setFiche({ ...fiche, telephone: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Portable</Form.Label>
              <Form.Control value={fiche.portable} onChange={(e) => setFiche({ ...fiche, portable: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Email</Form.Label>
              <Form.Control type="email" value={fiche.mail} onChange={(e) => setFiche({ ...fiche, mail: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Adresse postale</Form.Label>
              <Form.Control value={fiche.adresseP} onChange={(e) => setFiche({ ...fiche, adresseP: e.target.value })} /></Col>
            <Col md={12}><Form.Label>Adresse géographique</Form.Label>
              <Form.Control value={fiche.adresseGeo} onChange={(e) => setFiche({ ...fiche, adresseGeo: e.target.value })} /></Col>
            <Col md={12}><Form.Label>Observation</Form.Label>
              <Form.Control as="textarea" rows={2} value={fiche.observation} onChange={(e) => setFiche({ ...fiche, observation: e.target.value })} /></Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFiche(false)}>Annuler</Button>
          <Button onClick={enregistrer}>Valider</Button>
        </Modal.Footer>
      </Modal>

      {/* Liste des commandes du fournisseur */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="xl">
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
                    <Button size="sm" variant="outline-primary" onClick={() => window.open(`/dashboard/achats/${a._id}/impression`, "_blank")}>
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
    </div>
  );
}
