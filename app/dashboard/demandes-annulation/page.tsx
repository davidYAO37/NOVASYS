"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import { fmtDate, fmtMontant } from "@/lib/format";

const BADGES: Record<string, { label: string; bg: string; text?: string }> = {
  en_attente: { label: "En attente", bg: "warning", text: "dark" },
  approuvee: { label: "Approuvée", bg: "success" },
  rejetee: { label: "Rejetée", bg: "secondary" },
};

const TYPES: Record<string, { label: string; bg: string }> = {
  decaissement: { label: "Décaissement", bg: "info" },
  encaissement: { label: "Encaissement", bg: "primary" },
};

/**
 * Liste et historique des demandes d'annulation de décaissement.
 * L'admin voit toutes les demandes et les traite (approuver / rejeter) ;
 * le comptable ou la caisse n'y voient que leurs propres demandes.
 */
export default function DemandesAnnulationPage() {
  const [demandes, setDemandes] = useState<any[]>([]);
  const [stats, setStats] = useState({ en_attente: 0, approuvee: 0, rejetee: 0, mEnAttente: 0, mApprouvee: 0, nbDec: 0, nbEnc: 0 });
  const [statut, setStatut] = useState("");
  const [type, setType] = useState("");
  const [me, setMe] = useState<any>(null);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    setMessage("");
    const params: any = {};
    if (statut) params.statut = statut;
    if (type) params.type = type;
    axios.get("/api/demandes-annulation", { params })
      .then((r) => setDemandes(r.data))
      .catch((e) => setMessage(e.response?.data?.message || "Accès refusé"));
  }, [statut, type]);

  // Tableau de bord : tous les statuts/types confondus (admin = global,
  // autres = leurs propres demandes)
  const chargerStats = useCallback(() => {
    axios.get("/api/demandes-annulation").then((r) => {
      const toutes = Array.isArray(r.data) ? r.data : [];
      setStats({
        en_attente: toutes.filter((d) => d.statut === "en_attente").length,
        approuvee: toutes.filter((d) => d.statut === "approuvee").length,
        rejetee: toutes.filter((d) => d.statut === "rejetee").length,
        mEnAttente: toutes.filter((d) => d.statut === "en_attente").reduce((s, d) => s + (d.montant || 0), 0),
        mApprouvee: toutes.filter((d) => d.statut === "approuvee").reduce((s, d) => s + (d.montant || 0), 0),
        nbDec: toutes.filter((d) => d.type !== "encaissement").length,
        nbEnc: toutes.filter((d) => d.type === "encaissement").length,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    charger();
    chargerStats();
    axios.get("/api/me").then((r) => setMe(r.data?.user)).catch(() => {});
  }, [charger, chargerStats]);

  const traiter = async (d: any, decision: "approuver" | "rejeter") => {
    const libelle = d.type === "encaissement" ? "l'encaissement" : "le décaissement";
    if (decision === "approuver" && !confirm(`Annuler ${libelle} de ${fmtMontant(d.montant)} FCFA ?`)) return;
    const motifRefus = decision === "rejeter" ? (prompt("Motif du refus (optionnel) :") || "") : "";
    try {
      await axios.post(`/api/demandes-annulation/${d._id}/traiter`, { decision, motifRefus });
      charger();
      chargerStats();
    } catch (e: any) {
      alert(e.response?.data?.message || "Traitement impossible");
    }
  };

  const estAdmin = ["admin", "adminsuper"].includes(me?.type);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Demandes d&apos;annulation de décaissement</h3>
        <Button variant="outline-primary" onClick={charger}>
          <i className="bi bi-arrow-clockwise me-1"></i>Actualiser
        </Button>
      </div>

      {message && <div className="alert alert-danger">{message}</div>}

      {/* Tableau de bord */}
      <Row className="g-3 mb-3">
        <Col xs={12} sm={6} xl={3}>
          <Card className="shadow-sm border-start border-4 border-warning h-100">
            <Card.Body className="py-3">
              <div className="text-muted small">En attente</div>
              <div className="fs-4 fw-semibold">{stats.en_attente}</div>
              <div className="small text-muted">{fmtMontant(stats.mEnAttente)} FCFA concernés</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <Card className="shadow-sm border-start border-4 border-success h-100">
            <Card.Body className="py-3">
              <div className="text-muted small">Approuvées</div>
              <div className="fs-4 fw-semibold">{stats.approuvee}</div>
              <div className="small text-muted">{fmtMontant(stats.mApprouvee)} FCFA annulés</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <Card className="shadow-sm border-start border-4 border-secondary h-100">
            <Card.Body className="py-3">
              <div className="text-muted small">Rejetées</div>
              <div className="fs-4 fw-semibold">{stats.rejetee}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <Card className="shadow-sm border-start border-4 border-info h-100">
            <Card.Body className="py-3">
              <div className="text-muted small">Total des demandes</div>
              <div className="fs-4 fw-semibold">{stats.nbDec + stats.nbEnc}</div>
              <div className="small text-muted">
                {stats.nbDec} décaissement{stats.nbDec > 1 ? "s" : ""} — {stats.nbEnc} encaissement{stats.nbEnc > 1 ? "s" : ""}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col xs={12} sm={6} md={3}>
              <Form.Label>Type</Form.Label>
              <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Tous</option>
                <option value="decaissement">Décaissement (fournisseur)</option>
                <option value="encaissement">Encaissement (facture)</option>
              </Form.Select>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Label>Statut</Form.Label>
              <Form.Select value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="">Toutes</option>
                <option value="en_attente">En attente</option>
                <option value="approuvee">Approuvée</option>
                <option value="rejetee">Rejetée</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>Type</th><th>Document</th><th>Tiers</th><th className="text-end">Montant</th>
              <th>Demandé par</th><th>Le</th><th>Motif</th><th>Statut</th><th>Traité par</th>
              {estAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => (
              <tr key={d._id}>
                <td><Badge bg={TYPES[d.type]?.bg || "secondary"}>{TYPES[d.type]?.label || d.type || "Décaissement"}</Badge></td>
                <td className="fw-semibold">{d.numEmission || d.numFacture}</td>
                <td>{d.fournisseur || d.clientC}</td>
                <td className="text-end">{fmtMontant(d.montant)}</td>
                <td>{d.demandePar}</td>
                <td>{fmtDate(d.demandeLe)}</td>
                <td className="small">{d.motif}</td>
                <td>
                  <Badge bg={BADGES[d.statut]?.bg || "secondary"} text={BADGES[d.statut]?.text as any}>
                    {BADGES[d.statut]?.label || d.statut}
                  </Badge>
                  {d.motifRefus && <div className="small text-muted mt-1">Refus : {d.motifRefus}</div>}
                </td>
                <td>{d.traitePar ? `${d.traitePar} (${fmtDate(d.traiteLe)})` : ""}</td>
                {estAdmin && (
                  <td className="text-nowrap">
                    {d.statut === "en_attente" && (
                      <>
                        <Button size="sm" variant="outline-success" className="me-1"
                          onClick={() => traiter(d, "approuver")}>
                          Approuver
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => traiter(d, "rejeter")}>
                          Rejeter
                        </Button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!demandes.length && (
              <tr><td colSpan={10} className="text-center text-muted py-4">Aucune demande</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
