"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import dayjs from "dayjs";
import { fmtDate, fmtMontant } from "@/lib/format";

/**
 * CAISSE (FEN_Gestion_caisse) : journal des entrées/sorties de la période,
 * solde courant, opérations manuelles et encaissements clients.
 */
export default function CaissePage() {
  const [data, setData] = useState<any>(null);
  const [du, setDu] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [au, setAu] = useState(dayjs().format("YYYY-MM-DD"));
  const [showOp, setShowOp] = useState(false);
  const [op, setOp] = useState({ typeC: "entree", operation: "", motif: "", montantC: 0, nomPrenoms: "" });
  const [operations, setOperations] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    axios.get("/api/caisse", { params: { du, au } })
      .then((r) => {
        setData(r.data);
        setOperations(r.data.operations || []);
      }).catch(() => {});
  }, [du, au]);

  useEffect(() => { charger(); }, [charger]);

  const enregistrer = async () => {
    try {
      await axios.post("/api/caisse", op);
      setShowOp(false);
      setOp({ typeC: "entree", operation: "", motif: "", montantC: 0, nomPrenoms: "" });
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Gestion de la caisse</h3>
        <div>
          <Button variant="success" className="me-2" onClick={() => { setOp({ ...op, typeC: "entree" }); setShowOp(true); }}>
            <i className="bi bi-plus-circle me-1"></i>Entrée
          </Button>
          <Button variant="danger" onClick={() => { setOp({ ...op, typeC: "sortie" }); setShowOp(true); }}>
            <i className="bi bi-dash-circle me-1"></i>Sortie
          </Button>
        </div>
      </div>

      {message && <div className="alert alert-danger">{message}</div>}

      <Row className="g-3 mb-3">
        <Col xs={12} sm={6} md={4}>
          <Card className="shadow-sm text-center">
            <Card.Body>
              <div className="text-muted small">Solde de caisse</div>
              <div className="fs-3 fw-bold" style={{ color: "var(--novasys-primary)" }}>
                {fmtMontant(data?.solde)} FCFA
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card className="shadow-sm text-center">
            <Card.Body>
              <div className="text-muted small">Entrées (période)</div>
              <div className="fs-3 fw-bold text-success">{fmtMontant(data?.totaux?.entrees)}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card className="shadow-sm text-center">
            <Card.Body>
              <div className="text-muted small">Sorties (période)</div>
              <div className="fs-3 fw-bold text-danger">{fmtMontant(data?.totaux?.sorties)}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col xs={12} sm={6} md={3}><Form.Label>Du</Form.Label>
              <Form.Control type="date" value={du} onChange={(e) => setDu(e.target.value)} /></Col>
            <Col xs={12} sm={6} md={3}><Form.Label>Au</Form.Label>
              <Form.Control type="date" value={au} onChange={(e) => setAu(e.target.value)} /></Col>
            <Col xs={12} sm={6} md={3}>
              <Button variant="outline-primary" onClick={charger}>
                <i className="bi bi-arrow-clockwise me-1"></i>Actualiser
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>Date</th><th>Type</th><th>Opération</th><th>Motif</th>
              <th>Nom & Prénoms</th><th className="text-end">Montant</th>
              <th className="text-end">Solde</th><th>Saisi par</th>
            </tr>
          </thead>
          <tbody>
            {(data?.mouvements || []).map((m: any) => (
              <tr key={m._id}>
                <td>{fmtDate(m.dateC)} {m.heureC}</td>
                <td>
                  {m.typeC === "entree"
                    ? <Badge bg="success">Entrée</Badge>
                    : <Badge bg="danger">Sortie</Badge>}
                </td>
                <td>{m.operation}</td>
                <td>{m.motif}</td>
                <td>{m.nomPrenoms}</td>
                <td className={`text-end fw-semibold ${m.typeC === "entree" ? "text-success" : "text-danger"}`}>
                  {m.typeC === "entree" ? "+" : "−"}{fmtMontant(m.montantC)}
                </td>
                <td className="text-end">{fmtMontant(m.solde)}</td>
                <td>{m.ajouterParC}</td>
              </tr>
            ))}
            {!(data?.mouvements || []).length && (
              <tr><td colSpan={8} className="text-center text-muted py-4">Aucun mouvement sur la période</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Opération manuelle */}
      <Modal show={showOp} onHide={() => setShowOp(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{op.typeC === "entree" ? "Nouvelle entrée" : "Nouvelle sortie"} de caisse</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Opération</Form.Label>
            <Form.Select value={op.operation} onChange={(e) => setOp({ ...op, operation: e.target.value })}>
              <option value="">—</option>
              {operations.filter((o) => !o.typeOp || o.typeOp === op.typeC).map((o) => (
                <option key={o._id} value={o.libeleo}>{o.libeleo}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Motif *</Form.Label>
            <Form.Control value={op.motif} onChange={(e) => setOp({ ...op, motif: e.target.value })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Montant *</Form.Label>
            <Form.Control type="number" value={op.montantC}
              onChange={(e) => setOp({ ...op, montantC: Number(e.target.value) })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Nom & Prénoms (tiers)</Form.Label>
            <Form.Control value={op.nomPrenoms} onChange={(e) => setOp({ ...op, nomPrenoms: e.target.value })} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOp(false)}>Annuler</Button>
          <Button onClick={enregistrer}>Valider</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
