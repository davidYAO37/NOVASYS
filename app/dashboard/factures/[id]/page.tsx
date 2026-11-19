"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { fmtDate, fmtMontant, MODES_REGLEMENT, STATUTS_FACTURE } from "@/lib/format";
import PdfButtons from "@/components/print/PdfButtons";

/** Actualiser la facture + enregistrer un encaissement (FEN_Modifier_Facture). */
export default function DetailFacturePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facture, setFacture] = useState<any>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [pay, setPay] = useState({
    montantPaye: 0, modeReglement: "Espèces",
    banque: "", numCheque: "", numVirement: "", numTel: "",
  });
  const [me, setMe] = useState<any>(null);
  const [annulationSel, setAnnulationSel] = useState<any>(null);
  const [motifAnnulation, setMotifAnnulation] = useState("");
  const [erreurAnnulation, setErreurAnnulation] = useState("");

  const charger = () => {
    axios.get(`/api/factures/${id}`).then((r) => {
      setFacture(r.data);
      setLignes(r.data.lignes || []);
    }).catch(() => setMessage("Facture introuvable"));
    axios.get("/api/me").then((r) => setMe(r.data?.user)).catch(() => {});
  };

  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [id]);

  if (!facture) return <div className="p-4">{message || "Chargement..."}</div>;

  const enregistrer = async () => {
    try {
      await axios.put(`/api/factures/${id}`, { ...facture, lignes });
      setMessage("✅ Facture actualisée");
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur");
    }
  };

  const encaisser = async () => {
    try {
      await axios.post("/api/paiements-clients", {
        ...pay,
        clientId: facture.clientId,
        clientC: facture.clientC,
        factureId: facture._id,
        numeroFactBL: facture.numFacture,
        numCommande: facture.numCommande,
        numComm: facture.numComm,
        totalTTC: facture.totalTTC,
        resteAPaye: facture.resteAPaye,
      });
      setShowPay(false);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Encaissement impossible");
    }
  };

  const demanderAnnulation = async () => {
    setErreurAnnulation("");
    try {
      await axios.post(`/api/paiements-clients/${annulationSel._id}/annulation`, {
        motif: motifAnnulation,
      });
      setAnnulationSel(null);
      charger();
    } catch (e: any) {
      setErreurAnnulation(e.response?.data?.message || "Demande impossible");
    }
  };

  const statut = STATUTS_FACTURE[facture.statutC];
  const estAdmin = ["admin", "adminsuper"].includes(me?.type);
  const nomComplet = `${me?.nom || ""} ${me?.prenom || ""}`.trim();
  const peutDemander = estAdmin ||
    me?.permissions?.actions?.includes("*") ||
    me?.permissions?.actions?.includes("annulation_encaissement");
  const BADGES_ANNULATION: Record<string, { label: string; bg: string; text?: string }> = {
    en_attente: { label: "En attente", bg: "warning", text: "dark" },
    approuvee: { label: "Approuvée", bg: "success" },
    rejetee: { label: "Rejetée", bg: "secondary" },
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h3 className="mb-0 titre-page">Facture {facture.numFacture}</h3>
          <Badge bg={statut?.color || "secondary"}>{statut?.label || facture.statutC}</Badge>{" "}
          <small className="text-muted">BL : {facture.numBonFacture} — Commande : {facture.numCommande}</small>
        </div>
        <div>
          <span className="me-2"><PdfButtons type="facture" id={id} label="Facture" /></span>
          <span className="me-2"><PdfButtons type="bl" id={id} label="BL" /></span>
          {(facture.resteAPaye || 0) > 0 && (
            <Button variant="success" className="me-2" onClick={() => {
              setPay({ ...pay, montantPaye: facture.resteAPaye });
              setShowPay(true);
            }}>
              <i className="bi bi-cash me-1"></i>Encaisser
            </Button>
          )}
          <Button variant="outline-secondary" onClick={() => router.push("/dashboard/factures")}>
            <i className="bi bi-arrow-left"></i>
          </Button>
        </div>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}><Form.Label>Date</Form.Label>
              <Form.Control type="date" value={facture.dateFacture?.slice(0, 10) || ""}
                onChange={(e) => setFacture({ ...facture, dateFacture: e.target.value })} /></Col>
            <Col md={3}><Form.Label>Client</Form.Label>
              <Form.Control value={facture.clientC || ""} disabled /></Col>
            <Col md={6}><Form.Label>Objet</Form.Label>
              <Form.Control value={facture.objetFacture || ""}
                onChange={(e) => setFacture({ ...facture, objetFacture: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Observation</Form.Label>
              <Form.Control value={facture.observationFacture || ""}
                onChange={(e) => setFacture({ ...facture, observationFacture: e.target.value })} /></Col>
            <Col md={3}><Form.Label>Mode de règlement</Form.Label>
              <Form.Select value={facture.modeReglement || ""}
                onChange={(e) => setFacture({ ...facture, modeReglement: e.target.value })}>
                <option value="">—</option>
                {MODES_REGLEMENT.map((m) => <option key={m}>{m}</option>)}
              </Form.Select></Col>
            <Col md={3}><Form.Label>Date de livraison</Form.Label>
              <Form.Control type="date" value={facture.dateLivraison?.slice(0, 10) || ""}
                onChange={(e) => setFacture({ ...facture, dateLivraison: e.target.value })} /></Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Table className="mb-0 align-middle" size="sm" responsive>
          <thead className="table-light">
            <tr><th>Référence</th><th>Article</th><th className="text-end">Qté</th>
              <th className="text-end">P.U.</th><th className="text-end">Total HT</th></tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td>{l.reference}</td>
                <td>{l.articleM}</td>
                <td className="text-end">{l.quantite}</td>
                <td className="text-end">{fmtMontant(l.prixUnitaire)}</td>
                <td className="text-end fw-semibold">{fmtMontant(l.prixTotalHT)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {(facture.paiements || []).length > 0 && (
        <Card className="shadow-sm mb-3">
          <Card.Header className="fw-semibold">Règlements reçus</Card.Header>
          <Table className="mb-0 align-middle" size="sm" responsive>
            <thead className="table-light">
              <tr><th>Date</th><th>Mode</th><th>Banque / N°</th><th className="text-end">Montant</th>
                <th>Encaissé par</th><th className="text-end">Reçu</th></tr>
            </thead>
            <tbody>
              {facture.paiements.map((p: any) => (
                <tr key={p._id}>
                  <td>{fmtDate(p.datePaiement)}</td>
                  <td>
                    {p.modeReglement}
                    {p.annule && <Badge bg="danger" className="ms-1">Annulé</Badge>}
                    {!p.annule && p.demandeAnnulationStatut && (
                      <Badge bg={BADGES_ANNULATION[p.demandeAnnulationStatut]?.bg || "secondary"}
                        text={BADGES_ANNULATION[p.demandeAnnulationStatut]?.text as any} className="ms-1">
                        {BADGES_ANNULATION[p.demandeAnnulationStatut]?.label || p.demandeAnnulationStatut}
                      </Badge>
                    )}
                  </td>
                  <td>{[p.banque, p.numCheque || p.numVirement || p.numTel].filter(Boolean).join(" — ")}</td>
                  <td className="text-end fw-semibold">{fmtMontant(p.montantPaye)}</td>
                  <td>{p.payePar}</td>
                  <td className="text-end text-nowrap">
                    <span className="me-1"><PdfButtons type="recu" id={p._id} /></span>
                    {!p.annule && p.demandeAnnulationStatut !== "en_attente" &&
                      peutDemander && (estAdmin || p.payePar === nomComplet) && (
                      <Button size="sm" variant="outline-danger" title="Demander l'annulation"
                        onClick={() => { setAnnulationSel(p); setMotifAnnulation(""); setErreurAnnulation(""); }}>
                        <i className="bi bi-x-circle"></i>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="fs-5">
          Total TTC : <strong>{fmtMontant(facture.totalTTC)} {facture.deviseM}</strong>
          {" — "}Reste : <strong className="text-warning">{fmtMontant(facture.resteAPaye)}</strong>
        </div>
        <Button size="lg" onClick={enregistrer}>Actualiser la facture</Button>
      </div>

      {/* Encaissement */}
      <Modal show={showPay} onHide={() => setShowPay(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Encaissement — {facture.numFacture}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Client : <strong>{facture.clientC}</strong><br />
            Reste à payer : <strong>{fmtMontant(facture.resteAPaye)} FCFA</strong></p>
          <Form.Group className="mb-3">
            <Form.Label>Montant reçu *</Form.Label>
            <Form.Control type="number" value={pay.montantPaye}
              onChange={(e) => setPay({ ...pay, montantPaye: Number(e.target.value) })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Mode de règlement</Form.Label>
            <Form.Select value={pay.modeReglement}
              onChange={(e) => setPay({ ...pay, modeReglement: e.target.value })}>
              {MODES_REGLEMENT.map((m) => <option key={m}>{m}</option>)}
            </Form.Select>
          </Form.Group>
          {pay.modeReglement === "Chèque" && (
            <Row className="g-2">
              <Col><Form.Label>Banque</Form.Label>
                <Form.Control value={pay.banque} onChange={(e) => setPay({ ...pay, banque: e.target.value })} /></Col>
              <Col><Form.Label>N° Chèque</Form.Label>
                <Form.Control value={pay.numCheque} onChange={(e) => setPay({ ...pay, numCheque: e.target.value })} /></Col>
            </Row>
          )}
          {pay.modeReglement === "Virement" && (
            <Row className="g-2">
              <Col><Form.Label>Banque</Form.Label>
                <Form.Control value={pay.banque} onChange={(e) => setPay({ ...pay, banque: e.target.value })} /></Col>
              <Col><Form.Label>N° Virement</Form.Label>
                <Form.Control value={pay.numVirement} onChange={(e) => setPay({ ...pay, numVirement: e.target.value })} /></Col>
            </Row>
          )}
          {pay.modeReglement === "Mobile Money" && (
            <Form.Group>
              <Form.Label>N° de téléphone</Form.Label>
              <Form.Control value={pay.numTel} onChange={(e) => setPay({ ...pay, numTel: e.target.value })} />
            </Form.Group>
          )}
          {pay.modeReglement === "Carte bancaire" && (
            <Form.Group>
              <Form.Label>Banque</Form.Label>
              <Form.Control value={pay.banque} onChange={(e) => setPay({ ...pay, banque: e.target.value })} />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPay(false)}>Annuler</Button>
          <Button variant="success" onClick={encaisser}>Enregistrer le paiement</Button>
        </Modal.Footer>
      </Modal>

      {/* Demande d'annulation d'un encaissement */}
      <Modal show={!!annulationSel} onHide={() => setAnnulationSel(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Demander l&apos;annulation de l&apos;encaissement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {erreurAnnulation && <div className="alert alert-danger">{erreurAnnulation}</div>}
          <p>
            Montant : <strong>{fmtMontant(annulationSel?.montantPaye)} FCFA</strong><br />
            Reçu de : <strong>{annulationSel?.recuDe || annulationSel?.clientC}</strong><br />
            <span className="text-muted small">
              La demande sera transmise à l&apos;administrateur pour approbation.
            </span>
          </p>
          <Form.Group>
            <Form.Label>Motif de la demande *</Form.Label>
            <Form.Control as="textarea" rows={3} value={motifAnnulation}
              onChange={(e) => setMotifAnnulation(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setAnnulationSel(null)}>Annuler</Button>
          <Button variant="danger" onClick={demanderAnnulation} disabled={!motifAnnulation.trim()}>
            Envoyer la demande
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
