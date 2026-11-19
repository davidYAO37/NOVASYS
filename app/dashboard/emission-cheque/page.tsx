"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import dayjs from "dayjs";
import { fmtDate, fmtMontant, MODES_REGLEMENT } from "@/lib/format";
import FicheFournisseurModal from "@/components/tiers/FicheFournisseurModal";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";

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
  const [showFournisseur, setShowFournisseur] = useState(false);
  const [achatsDispo, setAchatsDispo] = useState<any[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    banque: "", numCheque: "", numVirement: "", numTel: "",
    alOrdreDe: "", delaisDeReglement: "", modeReglement: "Chèque",
  });

  // Décaissement
  const [showDec, setShowDec] = useState(false);
  const [emissionSel, setEmissionSel] = useState<any>(null);
  const [dec, setDec] = useState({
    montantPaye: 0, modeReglement: "Chèque",
    banque: "", numCheque: "", numVirement: "", numTel: "",
  });

  // Renvoi au service achat
  const [renvoiSel, setRenvoiSel] = useState<any>(null);
  const [motifRenvoi, setMotifRenvoi] = useState("");
  const [erreurRenvoi, setErreurRenvoi] = useState("");

  // Reçus de décaissement
  const [recusSel, setRecusSel] = useState<any>(null);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [apercuRecu, setApercuRecu] = useState<string | null>(null);

  // Demande d'annulation de décaissement
  const [annulationSel, setAnnulationSel] = useState<any>(null);
  const [motifAnnulation, setMotifAnnulation] = useState("");
  const [erreurAnnulation, setErreurAnnulation] = useState("");

  // Historique des demandes : page dédiée /dashboard/demandes-annulation

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
      setForm({
        banque: "", numCheque: "", numVirement: "", numTel: "",
        alOrdreDe: "", delaisDeReglement: "", modeReglement: "Chèque",
      });
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Erreur lors de l'émission");
    }
  };

  const ouvrirDecaissement = (e: any) => {
    setEmissionSel(e);
    setDec({
      montantPaye: e.resteAPaye || e.montantTotal,
      modeReglement: e.modeReglement || "Chèque",
      banque: e.banque || "", numCheque: e.numCheque || "",
      numVirement: e.numVirement || "", numTel: e.numTel || "",
    });
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

  const ouvrirRecus = async (e: any) => {
    setRecusSel(e);
    setPaiements([]);
    try {
      const r = await axios.get(`/api/emissions/${e._id}/paiements`);
      setPaiements(r.data);
    } catch {
      alert("Impossible de charger les décaissements");
    }
  };

  const demanderAnnulation = async () => {
    setErreurAnnulation("");
    try {
      await axios.post(`/api/paiements-fournisseurs/${annulationSel._id}/annulation`, {
        motif: motifAnnulation,
      });
      setAnnulationSel(null);
      ouvrirRecus(recusSel);
    } catch (e: any) {
      setErreurAnnulation(e.response?.data?.message || "Demande impossible");
    }
  };

  const renvoyer = async () => {
    setErreurRenvoi("");
    try {
      await axios.post(`/api/emissions/${renvoiSel._id}/renvoi`, { motif: motifRenvoi });
      setRenvoiSel(null);
      charger();
    } catch (e: any) {
      setErreurRenvoi(e.response?.data?.message || "Erreur lors du renvoi");
    }
  };

  const aAction = (code: string) =>
    me?.permissions?.actions?.includes("*") || me?.permissions?.actions?.includes(code);
  const peutDecaisser = aAction("decaissement");
  const peutRenvoyer = aAction("renvoi_emission");
  const estAdmin = ["admin", "adminsuper"].includes(me?.type);
  const nomComplet = `${me?.nom || ""} ${me?.prenom || ""}`.trim();

  const BADGES_ANNULATION: Record<string, { label: string; bg: string }> = {
    en_attente: { label: "En attente", bg: "warning" },
    approuvee: { label: "Approuvée", bg: "success" },
    rejetee: { label: "Rejetée", bg: "secondary" },
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Gestion d&apos;émission de chèque</h3>
        <div className="d-flex gap-2">
          {(estAdmin || me?.type === "achat") && (
            <Button onClick={() => setShowNew(true)}>
              <i className="bi bi-plus-lg me-1"></i>Nouvelle émission
            </Button>
          )}
        </div>
      </div>

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
              <th>N° Émission</th><th>Date</th><th>Fournisseur</th><th>Banque</th>
              <th>Référence</th><th className="text-end">Montant</th>
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
                <td>{e.numCheque || e.numVirement || e.numTel}</td>
                <td className="text-end">{fmtMontant(e.montantTotal)}</td>
                <td className="text-end">{fmtMontant(e.totalPaye)}</td>
                <td className="text-end">{fmtMontant(e.resteAPaye)}</td>
                <td>
                  {e.statut === "decaisse"
                    ? <Badge bg="success">Décaissé</Badge>
                    : e.statut === "renvoyee"
                      ? (
                        <>
                          <Badge bg="warning" text="dark" title={e.motifRenvoi}>Renvoyée</Badge>
                          {e.motifRenvoi && <div className="small text-muted mt-1">{e.motifRenvoi}</div>}
                        </>
                      )
                      : <Badge bg="info">Transféré compta</Badge>}
                </td>
                <td className="text-nowrap">
                  {(e.totalPaye || 0) > 0 && (
                    <Button size="sm" variant="outline-primary" className="me-1"
                      title="Reçus de décaissement" onClick={() => ouvrirRecus(e)}>
                      <i className="bi bi-receipt me-1"></i>Reçu
                    </Button>
                  )}
                  {e.statut !== "decaisse" && e.statut !== "renvoyee" && peutDecaisser && (
                    <Button size="sm" variant="outline-success" onClick={() => ouvrirDecaissement(e)}>
                      <i className="bi bi-cash me-1"></i>Décaisser
                    </Button>
                  )}
                  {e.statut !== "decaisse" && e.statut !== "renvoyee" && !(e.totalPaye > 0) && peutRenvoyer && (
                    <Button size="sm" variant="outline-warning" title="Renvoyer au service achat"
                      onClick={() => { setRenvoiSel(e); setMotifRenvoi(""); setErreurRenvoi(""); }}>
                      <i className="bi bi-arrow-return-left me-1"></i>Renvoyer
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
      <Modal show={showNew} onHide={() => setShowNew(false)} size="xl" fullscreen="md-down">
        <Modal.Header closeButton>
          <Modal.Title>Nouvelle émission de chèque</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col xs={12} sm={6} md={4}>
              <Form.Label>Fournisseur *</Form.Label>
              <InputGroup>
                <Form.Select value={fournisseurId} onChange={(e) => chargerAchats(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {fournisseurs.map((f) => <option key={f._id} value={f._id}>{f.nomPren}</option>)}
                </Form.Select>
                <Button variant="outline-primary" title="Ajouter un fournisseur" onClick={() => setShowFournisseur(true)}>
                  <i className="bi bi-plus-lg"></i>
                </Button>
              </InputGroup>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Label>Mode de règlement</Form.Label>
              <Form.Select value={form.modeReglement} onChange={(e) => setForm({ ...form, modeReglement: e.target.value })}>
                {MODES_REGLEMENT.map((m) => <option key={m}>{m}</option>)}
              </Form.Select>
            </Col>
            {["Chèque", "Virement", "Carte bancaire"].includes(form.modeReglement) && (
              <Col xs={12} sm={6} md={3}>
                <Form.Label>Banque</Form.Label>
                <Form.Control value={form.banque} onChange={(e) => setForm({ ...form, banque: e.target.value })} />
              </Col>
            )}
            {form.modeReglement === "Chèque" && (
              <Col xs={12} sm={6} md={3}>
                <Form.Label>N° Chèque</Form.Label>
                <Form.Control value={form.numCheque} onChange={(e) => setForm({ ...form, numCheque: e.target.value })} />
              </Col>
            )}
            {form.modeReglement === "Virement" && (
              <Col xs={12} sm={6} md={3}>
                <Form.Label>N° Virement</Form.Label>
                <Form.Control value={form.numVirement} onChange={(e) => setForm({ ...form, numVirement: e.target.value })} />
              </Col>
            )}
            {form.modeReglement === "Mobile Money" && (
              <Col xs={12} sm={6} md={3}>
                <Form.Label>N° de téléphone</Form.Label>
                <Form.Control value={form.numTel} onChange={(e) => setForm({ ...form, numTel: e.target.value })} />
              </Col>
            )}
            <Col xs={12} sm={6} md={4}>
              <Form.Label>À l&apos;ordre de</Form.Label>
              <Form.Control value={form.alOrdreDe} onChange={(e) => setForm({ ...form, alOrdreDe: e.target.value })} />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Label>Délai de règlement</Form.Label>
              <Form.Control value={form.delaisDeReglement} onChange={(e) => setForm({ ...form, delaisDeReglement: e.target.value })} />
            </Col>
          </Row>

          <div className="mb-2 fw-semibold">Bons de commande transférés (cochez ceux à payer) :</div>
          <Table responsive size="sm" hover>
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
          {dec.modeReglement === "Chèque" && (
            <Row className="g-2">
              <Col><Form.Label>Banque</Form.Label>
                <Form.Control value={dec.banque} onChange={(e) => setDec({ ...dec, banque: e.target.value })} /></Col>
              <Col><Form.Label>N° Chèque</Form.Label>
                <Form.Control value={dec.numCheque} onChange={(e) => setDec({ ...dec, numCheque: e.target.value })} /></Col>
            </Row>
          )}
          {dec.modeReglement === "Virement" && (
            <Row className="g-2">
              <Col><Form.Label>Banque</Form.Label>
                <Form.Control value={dec.banque} onChange={(e) => setDec({ ...dec, banque: e.target.value })} /></Col>
              <Col><Form.Label>N° Virement</Form.Label>
                <Form.Control value={dec.numVirement} onChange={(e) => setDec({ ...dec, numVirement: e.target.value })} /></Col>
            </Row>
          )}
          {dec.modeReglement === "Mobile Money" && (
            <Form.Group>
              <Form.Label>N° de téléphone</Form.Label>
              <Form.Control value={dec.numTel} onChange={(e) => setDec({ ...dec, numTel: e.target.value })} />
            </Form.Group>
          )}
          {dec.modeReglement === "Carte bancaire" && (
            <Form.Group>
              <Form.Label>Banque</Form.Label>
              <Form.Control value={dec.banque} onChange={(e) => setDec({ ...dec, banque: e.target.value })} />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDec(false)}>Annuler</Button>
          <Button variant="success" onClick={decaisser}>Valider le décaissement</Button>
        </Modal.Footer>
      </Modal>

      {/* Renvoi au service achat */}
      <Modal show={!!renvoiSel} onHide={() => setRenvoiSel(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Renvoyer l&apos;émission {renvoiSel?.numEmission} au service achat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {erreurRenvoi && <div className="alert alert-danger">{erreurRenvoi}</div>}
          <p>Fournisseur : <strong>{renvoiSel?.fournisseur}</strong><br />
            Montant : <strong>{fmtMontant(renvoiSel?.montantTotal)} FCFA</strong></p>
          <Form.Group>
            <Form.Label>Motif du renvoi *</Form.Label>
            <Form.Control as="textarea" rows={3} value={motifRenvoi}
              onChange={(e) => setMotifRenvoi(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRenvoiSel(null)}>Annuler</Button>
          <Button variant="warning" onClick={renvoyer} disabled={!motifRenvoi.trim()}>
            Renvoyer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reçus de décaissement */}
      <Modal show={!!recusSel} onHide={() => setRecusSel(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Décaissements — {recusSel?.numEmission}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Fournisseur : <strong>{recusSel?.fournisseur}</strong></p>
          <Table responsive hover className="table-novasys mb-0">
            <thead>
              <tr><th>Date</th><th>Mode</th><th>Référence</th>
                <th className="text-end">Montant</th><th>Reçu de</th><th>Décaissé par</th><th></th></tr>
            </thead>
            <tbody>
              {paiements.map((p) => (
                <tr key={p._id}>
                  <td>{fmtDate(p.datePaiement)}</td>
                  <td>{p.modeReglement}</td>
                  <td>{[p.banque, p.numCheque || p.numVirement || p.numTel].filter(Boolean).join(" — ")}</td>
                  <td className="text-end fw-semibold">{fmtMontant(p.montantPaye)}</td>
                  <td>{p.recuDe}</td>
                  <td>{p.payePar}</td>
                  <td className="text-nowrap">
                    {p.annule && <Badge bg="danger" className="me-1">Annulé</Badge>}
                    {!p.annule && p.demandeAnnulationStatut && (
                      <Badge bg={BADGES_ANNULATION[p.demandeAnnulationStatut]?.bg || "secondary"}
                        text={p.demandeAnnulationStatut === "en_attente" ? "dark" : undefined}
                        className="me-1">
                        {BADGES_ANNULATION[p.demandeAnnulationStatut]?.label || p.demandeAnnulationStatut}
                      </Badge>
                    )}
                    <Button size="sm" variant="outline-success" className="me-1"
                      onClick={() => setApercuRecu(p._id)}>
                      <i className="bi bi-file-earmark-pdf me-1"></i>Aperçu
                    </Button>
                    {!p.annule && p.demandeAnnulationStatut !== "en_attente" &&
                      (estAdmin || (peutDecaisser && p.payePar === nomComplet)) && (
                      <Button size="sm" variant="outline-danger" title="Demander l'annulation"
                        onClick={() => { setAnnulationSel(p); setMotifAnnulation(""); setErreurAnnulation(""); }}>
                        <i className="bi bi-x-circle"></i>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!paiements.length && (
                <tr><td colSpan={7} className="text-center text-muted py-3">Aucun décaissement</td></tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRecusSel(null)}>Fermer</Button>
        </Modal.Footer>
      </Modal>

      <PdfPreviewModal
        type="recu"
        id={apercuRecu}
        show={!!apercuRecu}
        onHide={() => setApercuRecu(null)}
      />

      {/* Demande d'annulation d'un décaissement */}
      <Modal show={!!annulationSel} onHide={() => setAnnulationSel(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Demander l&apos;annulation du décaissement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {erreurAnnulation && <div className="alert alert-danger">{erreurAnnulation}</div>}
          <p>
            Montant : <strong>{fmtMontant(annulationSel?.montantPaye)} FCFA</strong><br />
            Reçu de : <strong>{annulationSel?.recuDe}</strong><br />
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

      <FicheFournisseurModal
        show={showFournisseur}
        onHide={() => setShowFournisseur(false)}
        onSaved={(nouveau) => {
          setFournisseurs((fs) => [nouveau, ...fs]);
          chargerAchats(nouveau._id);
          setShowFournisseur(false);
        }}
      />
    </div>
  );
}
