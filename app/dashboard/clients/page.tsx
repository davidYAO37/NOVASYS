"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import { fmtDate, fmtMontant, STATUTS_FACTURE } from "@/lib/format";

const VIDE = {
  nomPren: "", raisonSociale: "", rcc: "", villeClient: "", adresseGeo: "",
  telephone: "", mail: "", observation: "", fonctionClient: "", structureCli: "",
  ncc: "", boitePostale: "",
};

/**
 * CLIENT — liste des clients, fiche client, factures et paiements du
 * client (FEN_Gestion_Client + FEN_Fiche_CLIENT + FEN_Fiche_Relation_CLIENT_VENTE).
 */
export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [recherche, setRecherche] = useState("");
  const [showFiche, setShowFiche] = useState(false);
  const [fiche, setFiche] = useState<any>(VIDE);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    axios.get("/api/clients", { params: { q: recherche || undefined } })
      .then((r) => setClients(r.data))
      .catch(() => {});
  }, [recherche]);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirFiche = (c?: any) => {
    setEditId(c?._id || null);
    setFiche(c ? { ...VIDE, ...c } : VIDE);
    setShowFiche(true);
  };

  const enregistrer = async () => {
    try {
      if (editId) await axios.put(`/api/clients/${editId}`, fiche);
      else await axios.post("/api/clients", fiche);
      setShowFiche(false);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur d'enregistrement");
    }
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Liste des clients</h3>
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
      <Modal show={showFiche} onHide={() => setShowFiche(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Fiche client</Modal.Title>
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
            <Col md={6}><Form.Label>Email</Form.Label>
              <Form.Control type="email" value={fiche.mail} onChange={(e) => setFiche({ ...fiche, mail: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Ville</Form.Label>
              <Form.Control value={fiche.villeClient} onChange={(e) => setFiche({ ...fiche, villeClient: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Boîte postale</Form.Label>
              <Form.Control value={fiche.boitePostale} onChange={(e) => setFiche({ ...fiche, boitePostale: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Fonction</Form.Label>
              <Form.Control value={fiche.fonctionClient} onChange={(e) => setFiche({ ...fiche, fonctionClient: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Structure</Form.Label>
              <Form.Control value={fiche.structureCli} onChange={(e) => setFiche({ ...fiche, structureCli: e.target.value })} /></Col>
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

      {/* Factures du client (LISTE DES FACTURES DU CLIENT) */}
      <Modal show={showDetail} onHide={() => setShowDetail(false)} size="xl">
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
                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => window.open(`/dashboard/factures/${f._id}/impression`, "_blank")}>
                      <i className="bi bi-receipt"></i> Facture
                    </Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => window.open(`/dashboard/factures/${f._id}/impression?bl=1`, "_blank")}>
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
    </div>
  );
}
