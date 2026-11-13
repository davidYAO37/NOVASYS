"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import axios from "axios";
import { fmtDate } from "@/lib/format";

const MODULE_LABELS: Record<string, string> = {
  accueil: "Accueil / Tableau de bord",
  clients: "Clients",
  fournisseurs: "Fournisseurs",
  devis: "Gestion des commandes / devis",
  service_achat: "Service achat / bons de commande",
  emission_cheque: "Émission de chèques",
  factures: "Factures / bons de livraison",
  caisse: "Caisse / règlements",
  stock: "Stock / articles",
  parametrage: "Paramétrage",
};

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  active: { label: "Active", variant: "success" },
  trial: { label: "Période d'essai", variant: "info" },
  expired: { label: "Expirée", variant: "danger" },
  maintenance_overdue: { label: "Maintenance en retard", variant: "danger" },
  suspended: { label: "Suspendue", variant: "dark" },
  resiliated: { label: "Résiliée", variant: "dark" },
  none: { label: "Aucune licence", variant: "danger" },
};

/** Page « Ma licence » — équivalent de FEN_Activation + /dashboard/licence easy_medical. */
export default function LicencePage() {
  const [status, setStatus] = useState<any>(null);
  const [cle, setCle] = useState("");
  const [joursEssai, setJoursEssai] = useState(30);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const charger = () =>
    axios.get("/api/licence/status").then((r) => setStatus(r.data)).catch(() => {});

  useEffect(() => {
    charger();
  }, []);

  const activerCle = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.post("/api/licence/activate", { key: cle.trim() });
      setMessage({ type: "success", text: "Licence activée avec succès." });
      setCle("");
      await charger();
    } catch (err: any) {
      setMessage({ type: "danger", text: err.response?.data?.message || "Activation impossible" });
    }
    setSaving(false);
  };

  const activerEssai = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const r = await axios.post("/api/licence/activate-trial", { days: joursEssai });
      setMessage({ type: "success", text: r.data.message });
      await charger();
    } catch (err: any) {
      setMessage({ type: "danger", text: err.response?.data?.message || "Activation impossible" });
    }
    setSaving(false);
  };

  if (!status) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const st = STATUS_LABELS[status.effectiveStatus] || STATUS_LABELS.none;
  const modules: string[] = status.modules?.length ? status.modules : Object.keys(MODULE_LABELS);

  return (
    <div style={{ maxWidth: 960 }}>
      <h3 className="mb-3">Licence du logiciel</h3>
      {message && <Alert variant={message.type}>{message.text}</Alert>}
      {status.alerts?.map((a: any, i: number) => (
        <Alert key={i} variant={a.level === "danger" ? "danger" : a.level === "warning" ? "warning" : "info"}>
          {a.message}
        </Alert>
      ))}

      <Row className="g-3">
        <Col md={7}>
          <Card className="shadow-sm">
            <Card.Header className="fw-semibold">État de la licence</Card.Header>
            <Card.Body>
              <Table borderless size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted">Statut</td>
                    <td><Badge bg={st.variant}>{st.label}</Badge></td>
                  </tr>
                  <tr>
                    <td className="text-muted">Type</td>
                    <td>{status.licenceType === "trial" ? "Essai" : status.licenceType === "paid" ? "Licence activée" : "—"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Début</td>
                    <td>{fmtDate(status.licenceStartDate)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Expiration</td>
                    <td>
                      {status.licenceEndDate ? fmtDate(status.licenceEndDate) : "Perpétuelle"}
                      {status.daysUntilExpiration !== null && status.daysUntilExpiration >= 0 && (
                        <Badge bg="warning" text="dark" className="ms-2">
                          {status.daysUntilExpiration} j restant(s)
                        </Badge>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Activée le</td>
                    <td>{fmtDate(status.licenceActivatedAt)}</td>
                  </tr>
                  {status.maintenanceDueDate && (
                    <tr>
                      <td className="text-muted">Maintenance jusqu'au</td>
                      <td>{fmtDate(status.maintenanceDueDate)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-muted">Utilisateurs</td>
                    <td>{status.userCount}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Card className="shadow-sm mt-3">
            <Card.Header className="fw-semibold">Modules inclus</Card.Header>
            <Card.Body>
              <div className="d-flex flex-wrap gap-2">
                {modules.map((m) => (
                  <Badge key={m} bg="primary" className="p-2">{MODULE_LABELS[m] || m}</Badge>
                ))}
                {!modules.length && <span className="text-muted">Aucun module</span>}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={5}>
          <Card className="shadow-sm">
            <Card.Header className="fw-semibold">Activer une licence</Card.Header>
            <Card.Body>
              <Form.Label>Clé de licence</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={cle}
                onChange={(e) => setCle(e.target.value)}
                placeholder="Collez la clé fournie par l'éditeur"
              />
              <Button className="mt-3 w-100" onClick={activerCle} disabled={saving || !cle.trim()}>
                {saving ? "Activation..." : "Activer la licence"}
              </Button>
            </Card.Body>
          </Card>

          <Card className="shadow-sm mt-3">
            <Card.Header className="fw-semibold">Période d'essai</Card.Header>
            <Card.Body>
              <Form.Label>Durée (jours, 30 max)</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={30}
                value={joursEssai}
                onChange={(e) => setJoursEssai(Number(e.target.value))}
              />
              <Button variant="outline-primary" className="mt-3 w-100" onClick={activerEssai} disabled={saving}>
                Activer / prolonger l'essai
              </Button>
              <small className="text-muted d-block mt-2">
                Tous les modules sont accessibles pendant l'essai.
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
