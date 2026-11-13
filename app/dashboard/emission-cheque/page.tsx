"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import dayjs from "dayjs";
import { fmtDate, fmtMontant, MODES_REGLEMENT } from "@/lib/format";

/**
 * GESTION D'ÉMISSION DE CHÈQUE (FEN_EMISSION_DE_CHEQUE) :
 * - Nouvelle émission : par fournisseur, afficher ses bons de commande,
 *   cocher ceux validés, renseigner banque/chèque/ordre, envoyer à la
 *   comptabilité pour décaissement.
 * - Liste des émissions de la période + décaissement (comptabilité).
 */
export default function EmissionChequePage() {
  const [emissions, setEmissions] = useState<any[]>([]);
  const [du, setDu] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [au, setAu] = useState(dayjs().format("YYYY-MM-DD"));
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  // Nouvelle émission
  const [showNew, setShowNew] = useState(false);
  const [fournisseurId, setFournisseurId] = useState("");
  const [achatsDispo, setAchatsDispo] = useState<any[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ banque: "", numCheque: "", alOrdreDe: "", delaisDeReglement: "", modeReglement: "Chèque" });

  // Décaissement
  const [showDec, setShowDec] = useState(false);
  const [emissionSel, setEmissionSel] = useState<any>(null);
  const [dec, setDec] = useState({ montantPaye: 0, modeReglement: "Chèque", banque: "", numCheque: "" });

  const charger = useCallback(() => {
    axios.get("/api/emissions", { params: { du, au } })
      .then((r) => setEmissions(r.data)).catch(() => {});
  }, [du, au]);

  useEffect(() => {
    charger();
    axios.get("/api/fournisseurs").then((r) => setFournisseurs(r.data)).catch(() => {});
    axios.get("/api/me").then((r) => setMe(r.data?.user)).catch(() => {});
  }, [charger]);

  const chargerAchats = async (fid: string) => {
    setFournisseurId(fid);
    setSelection(new Set());
    if (!fid) { setAchatsDispo([]); return; }
    // Bons transférés à la compta sans chèque édité
    const r = await axios.get("/api/achats", { params: { fournisseurId: fid } });
    setAchatsDispo(r.data.filter((a: any) => a.serviceComptable && !a.chequeEdite));
  };

  const montantSel = useMemo(
    () => achatsDispo.filter((a) => selection.has(a._id)).reduce((s, a) => s + (a.totalTTC || 0), 0),
    [achatsDispo, selection]
  );

  const creerEmission = async () => {
    try {
      const fournisseur = fournisseurs.find((f) => f._id === fournisseurId);
      await axios.post("/api/emissions", {
        fournisseurId,
        fournisseur: fournisseur?.nomPren,
        achatIds: [...selection],
        ...form,
      });
      setShowNew(false);
      setSelection(new Set());
      setAchatsDispo([]);
      setForm({ banque: "", numCheque: "", alOrdreDe: "", delaisDeReglement: "", modeReglement: "Chèque" });
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Erreur lors de l'émission");
    }
  };

  const ouvrirDecaissement = (e: any) => {
    setEmissionSel(e);
    setDec({ montantPaye: e.resteAPaye || e.montantTotal, modeReglement: e.modeReglement || "Chèque", banque: e.banque || "", numCheque: e.numCheque || "" });
    setShowDec(true);
  };

  const decaisser = async () => {
    try {
      await axios.post(`/api/emissions/${emissionSel._id}/decaissement`, dec);
      setShowDec(false);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Décaissement impossible");
    }
  };

  const peutDecaisser = ["admin", "adminsuper", "comptable", "caisse"].includes(me?.type);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Gestion d&apos;émission de chèque</h3>
        <Button onClick={() => setShowNew(true)}>
          <i className="bi bi-plus-lg me-1"></i>Nouvelle émission
        </Button>
      </div>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={3}><Form.Label>Du</Form.Label>
              <Form.Control type="date" value={du} onChange={(e) => setDu(e.target.value)} /></Col>
            <Col md={3}><Form.Label>Au</Form.Label>
              <Form.Control type="date" value={au} onChange={(e) => setAu(e.target.value)} /></Col>
            <Col md={3}>
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
              <th>N° Émission</th><th>Date</th><th>Fournisseur</th><th>Banque</th>
              <th>N° Chèque</th><th className="text-end">Montant</th>
              <th className="text-end">Payé</th><th className="text-end">Reste</th>
              <th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {emissions.map((e) => (
              <tr key={e._id}>
                <td className="fw-semibold">{e.numEmission}</td>
                <td>{fmtDate(e.datePaiement)}</td>
                <td>{e.fournisseur}</td>
                <td>{e.banque}</td>
                <td>{e.numCheque}</td>
                <td className="text-end">{fmtMontant(e.montantTotal)}</td>
                <td className="text-end">{fmtMontant(e.totalPaye)}</td>
                <td className="text-end">{fmtMontant(e.resteAPaye)}</td>
                <td>
                  {e.statut === "decaisse"
                    ? <Badge bg="success">Décaissé</Badge>
                    : <Badge bg="info">Transféré compta</Badge>}
                </td>
                <td>
                  {e.statut !== "decaisse" && peutDecaisser && (
                    <Button size="sm" variant="outline-success" onClick={() => ouvrirDecaissement(e)}>
                      <i className="bi bi-cash me-1"></i>Décaisser
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!emissions.length && (
              <tr><td colSpan={10} className="text-center text-muted py-4">Aucune émission sur la période</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Nouvelle émission */}
      <Modal show={showNew} onHide={() => setShowNew(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Nouvelle émission de chèque</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col md={4}>
              <Form.Label>Fournisseur *</Form.Label>
              <Form.Select value={fournisseurId} onChange={(e) => chargerAchats(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {fournisseurs.map((f) => <option key={f._id} value={f._id}>{f.nomPren}</option>)}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label>Mode de règlement</Form.Label>
              <Form.Select value={form.modeReglement} onChange={(e) => setForm({ ...form, modeReglement: e.target.value })}>
                {MODES_REGLEMENT.map((m) => <option key={m}>{m}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>Banque</Form.Label>
              <Form.Control value={form.banque} onChange={(e) => setForm({ ...form, banque: e.target.value })} />
            </Col>
            <Col md={3}>
              <Form.Label>N° Chèque</Form.Label>
              <Form.Control value={form.numCheque} onChange={(e) => setForm({ ...form, numCheque: e.target.value })} />
            </Col>
            <Col md={4}>
              <Form.Label>À l&apos;ordre de</Form.Label>
              <Form.Control value={form.alOrdreDe} onChange={(e) => setForm({ ...form, alOrdreDe: e.target.value })} />
            </Col>
            <Col md={4}>
              <Form.Label>Délai de règlement</Form.Label>
              <Form.Control value={form.delaisDeReglement} onChange={(e) => setForm({ ...form, delaisDeReglement: e.target.value })} />
            </Col>
          </Row>

          <div className="mb-2 fw-semibold">Bons de commande transférés (cochez ceux à payer) :</div>
          <Table size="sm" hover>
            <thead>
              <tr><th style={{ width: 40 }}></th><th>N° Bon</th><th>Date</th>
                <th>N° Devis</th><th className="text-end">Total TTC</th></tr>
            </thead>
            <tbody>
              {achatsDispo.map((a) => (
                <tr key={a._id}>
                  <td>
                    <Form.Check checked={selection.has(a._id)} onChange={(e) => {
                      const s = new Set(selection);
                      e.target.checked ? s.add(a._id) : s.delete(a._id);
                      setSelection(s);
                    }} />
                  </td>
                  <td>{a.numAchat}</td>
                  <td>{fmtDate(a.dateAchat)}</td>
                  <td>{a.numCommande}</td>
                  <td className="text-end">{fmtMontant(a.totalTTC)}</td>
                </tr>
              ))}
              {!achatsDispo.length && (
                <tr><td colSpan={5} className="text-center text-muted">
                  {fournisseurId ? "Aucun bon transféré à la comptabilité pour ce fournisseur" : "Sélectionnez un fournisseur"}
                </td></tr>
              )}
            </tbody>
          </Table>
          <div className="text-end fs-5">Total : <strong>{fmtMontant(montantSel)} FCFA</strong></div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNew(false)}>Annuler</Button>
          <Button onClick={creerEmission} disabled={!selection.size}>
            Valider et envoyer à la comptabilité
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Décaissement */}
      <Modal show={showDec} onHide={() => setShowDec(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Décaissement — {emissionSel?.numEmission}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Fournisseur : <strong>{emissionSel?.fournisseur}</strong><br />
            Reste à payer : <strong>{fmtMontant(emissionSel?.resteAPaye)} FCFA</strong></p>
          <Form.Group className="mb-3">
            <Form.Label>Montant payé *</Form.Label>
            <Form.Control type="number" value={dec.montantPaye}
              onChange={(e) => setDec({ ...dec, montantPaye: Number(e.target.value) })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Mode de règlement</Form.Label>
            <Form.Select value={dec.modeReglement} onChange={(e) => setDec({ ...dec, modeReglement: e.target.value })}>
              {MODES_REGLEMENT.map((m) => <option key={m}>{m}</option>)}
            </Form.Select>
          </Form.Group>
          <Row className="g-2">
            <Col><Form.Label>Banque</Form.Label>
              <Form.Control value={dec.banque} onChange={(e) => setDec({ ...dec, banque: e.target.value })} /></Col>
            <Col><Form.Label>N° Chèque</Form.Label>
              <Form.Control value={dec.numCheque} onChange={(e) => setDec({ ...dec, numCheque: e.target.value })} /></Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDec(false)}>Annuler</Button>
          <Button variant="success" onClick={decaisser}>Valider le décaissement</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
